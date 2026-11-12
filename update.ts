// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Met à jour outils.json (et criteres.json, dans le même dossier) depuis le répertoire en ligne. C'est la seule
// porte d'entrée pour suivre le répertoire: si outils.json n'existe pas, c'est l'import initial, et tous les outils
// sont écrits avec changement "nouveau" (voir synchroniser). Reconstruction forcée: extract.ts --force; reclassement
// de tous les outils après un changement des règles: classify.ts.
// Usage: nub update.ts [--dry-run] [--sans-couleur] [--nouveaux-tags] [--max-echecs=N] [--accepter-couts] [outils.json] [url]
//
// Après l'enrichissement, les critères des outils enrichis sans verdict sont vérifiés (criteres_confirmes, voir confirmer.ts)
// avec le même modèle et la règle A; mêmes règles que l'enrichissement (une fois par outil, échecs comptés, clé absente: sauté).
//
// Pour chaque outil, selon la comparaison avec la page en ligne:
//   - absent du fichier → changement "nouveau"
//   - précédemment retiré (removed: true) et de retour → "comeback" (le champ removed disparaît)
//   - champs différents (catégorie, icône, score, lien, description) → "modification"
//   - absent de la page → "retrait" et removed: true (l'entrée est conservée)
//   - identique → inchangé: sa date et son changement antérieurs sont conservés.
// Les outils nouveaux ou modifiés reçoivent la date de modification de la page et sont reclassés.
// Les champs d'enrichissement (description longue, tags, source, licence, repo, évaluation) survivent à une modification.
//
// Enrichissement (clé OPENAI_API_KEY dans .env; modèle: OPENAI_MODEL), toujours, dès qu'un outil n'est pas enrichi:
//   génère UNE SEULE FOIS, pour chaque outil qui n'a pas encore de description_longue, une description
//   longue en français (Markdown), de 1 à 5 tags de tags.json, source/licence/repo pour les logiciels libres
//   et une évaluation indépendante des critères et du score (evaluation_enrichie, avec un sous-champ
//   `ecart` qui explique la différence quand elle ne concorde pas avec le répertoire).
//   Une barre de progression et le journal vont sur stderr.
//   Un outil déjà enrichi n'est jamais régénéré. Avec --dry-run, liste les outils concernés et estime les jetons et le coût.
//   Si la page de l'outil est inaccessible ou presque vide, un avertissement est affiché et l'outil n'est PAS
//   enrichi (échec consigné, retenté jusqu'à --max-echecs) pour ne pas figer un résultat peu fiable.
//   Sans clé, l'enrichissement est sauté avec un avertissement.
//   Premier import (outils.json absent): l'aperçu et l'estimation du coût sont affichés, puis une confirmation est demandée
//   (1. poursuivre en acceptant les coûts, 2. arrêter); hors terminal, --accepter-couts tient lieu de réponse 1.
//   --nouveaux-tags : le modèle peut proposer de nouveaux tags (justification obligatoire, ajoutés à tags.json).
//   --max-echecs=N  : un outil qui a échoué N fois de suite (echecs_enrichissement) n'est plus tenté; 3 par défaut.
//
// Sommaire: hors --dry-run, le sommaire (sommaire.md et graphiques/, voir sommaire.ts) est mis à jour automatiquement
// à la fin, mais SEULEMENT si quelque chose a changé (un outil nouveau, modifié ou retiré, ou au moins un outil enrichi).
// Il faut pour cela la clé OPENAI_API_KEY et vl-convert; s'ils manquent, un avertissement le dit et le sommaire existant
// reste tel quel. Si le résumé ne peut pas être rédigé, le sommaire existant est aussi conservé (code de sortie 1).
//
// Couleurs (terminal seulement): résumé sur stdout, journal et barre sur stderr; chaque flux est coloré
// s'il est un terminal. NO_COLOR ou --sans-couleur les désactive, FORCE_COLOR les impose. Hors terminal,
// le texte est identique, sans aucun code de couleur.
import { dirname, join } from "node:path";
import { couleursActives, creerCouleurs, type Couleurs } from "./couleurs.ts";
import { classer, type OutilClasse } from "./classify.ts";
import { estimerCoutEnrichissement, type Estimation, abandonne, MAX_ECHECS_PAR_DEFAUT, modelesDepuisEnv,
  aEnrichir, chargerCriteres, chargerTags, enrichirOutils, expliqueurOpenAI, generateurOpenAI, sauverTags,
  type NiveauJournal,
} from "./enrichir.ts";
import { lancer } from "./cli.ts";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { chargerEnv } from "./env.ts";
import { formaterDuree } from "./duree.ts";
import { ecrireFichier, lireFichier, lireSiExiste, type Lu } from "./fichiers.ts";
import { ID_PRAXIS, SOURCE_PRAXIS, sourcesAvec, type Source } from "./sources.ts";
import { abandonneOpenHub, aCompleterOpenHub, clientOpenHub, completerOpenHub, requetesOpenHub } from "./openhub.ts";
import { CHAMPS_ENRICHIS, telechargerRepertoire, type Changement, type Critere, type Outil } from "./extract.ts";
import { verifierVlConvert } from "./graphiques.ts";
import { createProgress, type Progress } from "./progress.ts";
import { barreSommaire, genererSommaire } from "./sommaire.ts";
import { abandonneConfirmation, aConfirmer, confirmateurOpenAI, confirmerOutils, estimerCoutConfirmation } from "./confirmer.ts";
import { aDecrire, categoriesDepuis, decrireCategories, estimerCoutDescriptions, generateurDescriptionOpenAI, sauverCategories, type Categorie } from "./categories.ts";
import { additionner, ajouterUsage, coutTotal, dollars, formaterCout, formaterCouts, soustraireUsages, type Usage, type UsagesParModele } from "./prix.ts";

const CHAMPS_COMPARES = ["categorie", "score", "lien", "description"] as const;
/** Les champs à reporter sur la version à jour d'un outil: l'enrichissement et le compteur d'échecs. */
const CHAMPS_REPORTES = [...CHAMPS_ENRICHIS, "echecs_enrichissement", "echecs_confirmation", "openhub_id", "openhub", "echecs_openhub"] as const;

/** Les champs d'enrichissement d'un outil existant, à reporter sur sa version à jour de la page. */
const enrichissementDe = (o: OutilClasse): Partial<Outil> =>
  Object.fromEntries(CHAMPS_REPORTES.filter((c) => o[c] !== undefined).map((c) => [c, o[c]]));

export interface Resume {
  nouveau: string[];
  modification: string[];
  retrait: string[];
  comeback: string[];
}

/**
 * Met à jour les outils de la source `sourceId` d'après sa page: les outils des autres sources sont conservés tels
 * quels, à la fin, dans leur ordre (jamais « retrait » pour eux). Un outil existant sans source (données d'avant
 * sources.json) est rattaché à la source Praxis.
 */
export function mettreAJour(
  existants: OutilClasse[],
  page: Outil[],
  modification: string,
  sourceId: string = ID_PRAXIS,
): { outils: OutilClasse[]; resume: Resume; migres: number } {
  const resume: Resume = { nouveau: [], modification: [], retrait: [], comeback: [] };
  let migres = 0;
  const rattaches = existants.map((o) => {
    if (o.source_repertoire_id !== undefined) return o;
    migres++;
    return { ...o, source_repertoire_id: ID_PRAXIS };
  });
  const siens = rattaches.filter((o) => o.source_repertoire_id === sourceId);
  const autres = rattaches.filter((o) => o.source_repertoire_id !== sourceId);
  const parNom = new Map(siens.map((o) => [o.nom, o]));
  const enLigne = new Set(page.map((o) => o.nom));
  const outils: OutilClasse[] = [];

  const marquer = (o: Outil, changement: Changement, ancien?: OutilClasse): OutilClasse => {
    resume[changement].push(o.nom);
    return {
      ...o,
      ...(ancien && enrichissementDe(ancien)),
      source_repertoire_id: sourceId,
      derniere_modification: modification,
      changement,
      ...classer(o.description, o.score),
    };
  };

  for (const p of page) {
    const ancien = parNom.get(p.nom);
    if (!ancien) {
      outils.push(marquer(p, "nouveau"));
    } else if (ancien.removed) {
      outils.push(marquer(p, "comeback", ancien));
    } else if (CHAMPS_COMPARES.some((c) => ancien[c] !== p[c])) {
      outils.push(marquer(p, "modification", ancien));
    } else {
      outils.push(ancien);
    }
  }
  for (const e of siens) {
    if (enLigne.has(e.nom)) continue;
    if (e.removed) {
      outils.push(e);
    } else {
      outils.push({ ...e, derniere_modification: modification, changement: "retrait", removed: true });
      resume.retrait.push(e.nom);
    }
  }
  return { outils: [...outils, ...autres], resume, migres };
}

// ---------- synchronisation des fichiers ----------

export interface Synchronisation {
  outils: OutilClasse[];
  resume: Resume;
  /** true si outils.json n'existait pas: tous les outils de la page sont « nouveau ». */
  importInitial: boolean;
  /** true si outils.json a été écrit (au moins un changement, ou import initial; jamais en simulation). */
  ecrit: boolean;
  /** true si criteres.json a été créé ou si son contenu a changé (jamais en simulation). */
  criteresEcrits: boolean;
  /** Les catégories (categories.json): celles de la page, avec les descriptions déjà connues. */
  categories: Categorie[];
  /** true si categories.json a été créé ou si son contenu a changé (jamais en simulation). */
  categoriesEcrites: boolean;
  /** Dernier état écrit de outils.json (null en simulation d'un import initial), à passer aux écritures suivantes. */
  courant: Lu<OutilClasse> | null;
  /** Les sources (sources.json): celles déjà connues, avec Praxis ajoutée si elle manquait. */
  sources: Source[];
  /** true si sources.json a été créé ou si Praxis y a été ajoutée (jamais en simulation). */
  sourcesEcrites: boolean;
}

/**
 * Compare la page téléchargée à `fichier` (outils.json) et écrit outils.json et criteres.json (même dossier).
 * Un outils.json absent est un import initial; un outils.json au mauvais format est refusé (lireFichier).
 * En simulation (`dryRun`), rien n'est écrit.
 */
export function synchroniser(fichier: string, page: Outil[], criteres: Critere[], modification: string, dryRun: boolean, categoriesPage: Categorie[] = []): Synchronisation {
  const importInitial = !existsSync(fichier);
  let courant: Lu<OutilClasse> | null = importInitial ? null : lireFichier<OutilClasse>(fichier, "outils");
  const { outils, resume, migres } = mettreAJour(courant?.donnees ?? [], page, modification);
  const total = Object.values(resume).reduce((n, noms) => n + noms.length, 0);
  const ecrit = !dryRun && (total > 0 || importInitial || migres > 0);
  if (ecrit) courant = ecrireFichier(fichier, "outils", outils, courant);
  let criteresEcrits = false;
  if (!dryRun) {
    const chemin = join(dirname(fichier), "criteres.json");
    const avant = lireSiExiste<Critere>(chemin, "criteres");
    const apres = ecrireFichier(chemin, "criteres", criteres, avant);
    criteresEcrits = avant === null || JSON.stringify(avant.donnees) !== JSON.stringify(apres.donnees);
  }
  const cheminCategories = join(dirname(fichier), "categories.json");
  const connues = lireSiExiste<Categorie>(cheminCategories, "categories");
  const categories = categoriesDepuis(categoriesPage, connues?.donnees ?? []);
  let categoriesEcrites = false;
  if (!dryRun && categoriesPage.length) {
    const apres = ecrireFichier(cheminCategories, "categories", categories, connues);
    categoriesEcrites = connues === null || JSON.stringify(connues.donnees) !== JSON.stringify(apres.donnees);
  }
  const cheminSources = join(dirname(fichier), "sources.json");
  const sourcesConnues = lireSiExiste<Source>(cheminSources, "sources");
  const sources = sourcesConnues?.donnees.some((s) => s.id === ID_PRAXIS) ? sourcesConnues.donnees : sourcesAvec(sourcesConnues?.donnees ?? [], { ...SOURCE_PRAXIS });
  const sourcesEcrites = !dryRun && sources !== sourcesConnues?.donnees;
  if (sourcesEcrites) ecrireFichier(cheminSources, "sources", sources, sourcesConnues);
  return { outils, resume, importInitial, ecrit, criteresEcrits, categories, categoriesEcrites, courant, sources, sourcesEcrites };
}

// ---------- sommaire automatique ----------

/**
 * Le sommaire est mis à jour hors simulation, et seulement si quelque chose a changé ou a été enrichi.
 */
export function sommaireNecessaire(o: { dryRun: boolean; changements: number; enrichis: number }): boolean {
  return !o.dryRun && (o.changements > 0 || o.enrichis > 0);
}

/** Réponse à la confirmation du premier import: 1 ou oui accepte les coûts, tout le reste arrête (l'aperçu et l'estimation sont déjà affichés). */
export function interpreterChoix(reponse: string): "accepter" | "arreter" {
  const r = reponse.trim().toLowerCase();
  return r === "1" || r === "oui" || r === "o" ? "accepter" : "arreter";
}

/** Le texte de la confirmation demandée au premier import, avant toute écriture. */
export function texteConfirmation(nbOutils: number, coutEstime: string): string {
  return [
    `Premier import: ${nbOutils} outil(s) seront enrichis par l'API OpenAI (coût estimé ${coutEstime}, borne haute).`,
    "  1. poursuivre en acceptant les coûts OpenAI (import, enrichissement, vérification, descriptions et sommaire);",
    "  2. arrêter: rien n'est dépensé ni écrit (l'aperçu et l'estimation sont ci-dessus).",
    "Votre choix [1/2] (2 par défaut): ",
  ].join("\n");
}

/** Les lignes d'estimation du coût pour `--dry-run` et la confirmation du premier import. */
export function lignesEstimation(estimation: Estimation, verification: { outils: number; usage: Usage }, descriptions: { categories: number; usage: Usage }, modele: string, nbOutilsRepertoire: number, c: Couleurs, repli: string | null = null): string[] {
  const sommaire: Usage = { entree: 2000 + 120 * nbOutilsRepertoire, sortie: 1500, cache_lecture: 0, cache_ecriture: 0, raisonnement: 0 };
  const lignes = [`${c.gras("Coût estimé")} (${estimation.hypotheses}):`];
  lignes.push(`  enrichissement de ${estimation.outils} outil(s): ${formaterCout(estimation.usage, modele)}`);
  lignes.push(`  vérification des critères de ${verification.outils} outil(s): ${formaterCout(verification.usage, modele)}`);
  lignes.push(`  descriptions de ${descriptions.categories} catégorie(s): ${formaterCout(descriptions.usage, modele)}`);
  lignes.push(`  sommaire (un appel pour le résumé): ${formaterCout(sommaire, modele)}`);
  const total = additionner(additionner(additionner(estimation.usage, verification.usage), descriptions.usage), sommaire);
  lignes.push(`  total: ${c.jaune(formaterCout(total, modele))}`);
  // Scénario extrême du repli: chaque appel rejeté par le principal est refait, aux mêmes jetons, par le repli.
  if (repli) lignes.push(`  si chaque appel devait être repris par ${repli}: jusqu'à ${formaterCout(total, repli).replace(/^.*≈ /, "≈ ").replace(/ \(.*\)$/, "")} de plus`);
  return lignes;
}

/**
 * Pourquoi on ne peut pas mettre le sommaire à jour (clé API absente, vl-convert introuvable), ou null s'il
 * le peut. Dans ce cas, on le saute plutôt que d'écraser un bon sommaire par un sommaire amputé.
 */
export function raisonDeSauterSommaire(cle: string | undefined, verifierVl: () => unknown): string | null {
  if (!cle) return "OPENAI_API_KEY absente, nécessaire pour rédiger le résumé";
  try {
    verifierVl();
  } catch (e) {
    return (e as Error).message;
  }
  return null;
}

// ---------- présentation (couleurs) ----------

/** Les lignes du résumé de la synchronisation: la date de la page, le nombre de changements, puis chaque type. */
export function lignesResume(resume: Resume, modification: string, c: Couleurs): string[] {
  const total = Object.values(resume).reduce((n, noms) => n + noms.length, 0);
  const compte = total ? c.gras(c.jaune(`${total} changement(s)`)) : c.vert(`${total} changement(s)`);
  const couleurs: Record<keyof Resume, (t: string) => string> = { nouveau: c.vert, modification: c.jaune, retrait: c.rouge, comeback: c.magenta };
  const lignes = [`Page modifiée le ${c.cyan(modification)}: ${compte}`];
  for (const [type, noms] of Object.entries(resume) as [keyof Resume, string[]][]) {
    if (noms.length) lignes.push(`  ${couleurs[type](type)}: ${noms.join(", ")}`);
  }
  return lignes;
}

/** Une ligne du journal de l'enrichissement, colorée selon sa nature: « Nom: suite ». */
export function ligneJournal(message: string, niveau: NiveauJournal, c: Couleurs): string {
  const m = /^(\s*)([^:]+): (.*)$/s.exec(message);
  const [indent, nom, suite] = m ? [m[1]!, m[2]!, m[3]!] : ["", "", message];
  switch (niveau) {
    case "succes":
      return m ? `${indent}${c.gras(c.vert(nom))}: ${suite}` : c.vert(message);
    case "avertissement":
      return m ? `${indent}${c.jaune(`${nom}: ${suite}`)}` : c.jaune(message);
    case "erreur":
      return m ? `${indent}${c.gras(c.rouge(nom))}: ${c.rouge(suite)}` : c.rouge(message);
    default:
      return c.attenue(message);
  }
}

if (import.meta.main) {
  await lancer(async () => {
    chargerEnv();
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const nouveauxTags = args.includes("--nouveaux-tags");
    const accepterCouts = args.includes("--accepter-couts");
    const maxEchecsArg = args.find((a) => a.startsWith("--max-echecs="));
    const maxEchecs = maxEchecsArg ? Number(maxEchecsArg.slice("--max-echecs=".length)) : MAX_ECHECS_PAR_DEFAUT;
    const sansCouleur = args.includes("--sans-couleur");
    const connues = ["--dry-run", "--sans-couleur", "--nouveaux-tags", "--max-echecs", "--accepter-couts"];
    const inconnue = args.find((a) => a.startsWith("--") && !connues.some((o) => a === o || a.startsWith(`${o}=`)));
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    if (!(Number.isInteger(maxEchecs) && maxEchecs > 0)) throw new Error("--max-echecs=N: entier positif attendu");
    const [fichier = "outils.json", url] = args.filter((a) => !a.startsWith("--"));

    // Le résumé va sur stdout et le journal sur stderr: chaque flux a ses propres couleurs.
    const sortie = creerCouleurs(couleursActives(process.stdout, process.env, sansCouleur));
    const suivi = creerCouleurs(couleursActives(process.stderr, process.env, sansCouleur));

    const { outils: page, categories: categoriesPage, criteres: criteresPage, modification } = await telechargerRepertoire(url);
    const { principal: modele, repli } = modelesDepuisEnv();
    const fichierTags = join(dirname(fichier), "tags.json");

    // Aperçu sans rien écrire: ce que la synchronisation ferait, et ce qu'il resterait à enrichir.
    const apercu = synchroniser(fichier, page, criteresPage, modification, true, categoriesPage);
    const resume = apercu.resume;
    const total = Object.values(resume).reduce((n, noms) => n + noms.length, 0);
    const aFaire = apercu.outils.filter(aEnrichir);
    const abandonnes = aFaire.filter((o) => abandonne(o, maxEchecs));
    const tagsPresents = existsSync(fichierTags);
    const prevus = tagsPresents ? aFaire.filter((o) => !abandonne(o, maxEchecs)) : [];
    const estimation = estimerCoutEnrichissement(prevus, tagsPresents ? chargerTags(fichierTags) : [], criteresPage, modele, apercu.categories);
    // À vérifier: les outils déjà enrichis sans verdict (hors abandonnés), plus ceux qui seront enrichis maintenant.
    const aVerifier = [...apercu.outils.filter((o) => aConfirmer(o) && !abandonneConfirmation(o, maxEchecs)), ...prevus];
    const abandonnesVerif = apercu.outils.filter((o) => aConfirmer(o) && abandonneConfirmation(o, maxEchecs));
    const verification = estimerCoutConfirmation(aVerifier, criteresPage, modele, apercu.categories);
    const aDecrireListe = apercu.categories.filter(aDecrire);
    // Open Hub: les outils libres déjà enrichis sans données (ceux enrichis maintenant le seront au passage suivant).
    const aOpenHub = apercu.outils.filter((o) => aCompleterOpenHub(o, maxEchecs));
    const abandonnesOpenHub = apercu.outils.filter((o) => abandonneOpenHub(o, maxEchecs));
    const descriptions = estimerCoutDescriptions(apercu.categories, apercu.outils.filter((o) => !o.removed), modele);

    if (apercu.importInitial) console.log(sortie.attenue(`Import initial: ${fichier} n'existe pas, tous les outils de la page sont nouveaux`));
    console.log(sortie.attenue(`Modèle OpenAI: ${modele}${repli ? `; repli: ${repli}` : "; sans repli"}`));
    for (const ligne of lignesResume(resume, modification, sortie)) console.log(ligne);
    console.log(`${sortie.gras("Enrichissement")}: ${prevus.length ? sortie.jaune(String(prevus.length)) : sortie.vert("0")} outil(s) à enrichir${tagsPresents ? "" : sortie.rouge(` (${fichierTags} absent: enrichissement impossible)`)}`);
    if (prevus.length) console.log(`  à enrichir (${prevus.length}): ${sortie.cyan(prevus.map((o) => o.nom).join(", "))}`);
    if (abandonnes.length) console.log(`  ${sortie.jaune(`abandonnés après ${maxEchecs} échecs consécutifs`)} (${abandonnes.length}): ${sortie.cyan(abandonnes.map((o) => `${o.nom} (${o.echecs_enrichissement})`).join(", "))}; relancer avec --max-echecs plus élevé pour les retenter`);
    console.log(`${sortie.gras("Vérification des critères")}: ${aVerifier.length ? sortie.jaune(String(aVerifier.length)) : sortie.vert("0")} outil(s) à vérifier${aVerifier.length ? ` (${sortie.cyan(aVerifier.map((o) => o.nom).join(", "))})` : ""}`);
    if (abandonnesVerif.length) console.log(`  ${sortie.jaune(`abandonnés après ${maxEchecs} échecs consécutifs`)} (${abandonnesVerif.length}): ${sortie.cyan(abandonnesVerif.map((o) => `${o.nom} (${o.echecs_confirmation})`).join(", "))}; relancer avec --max-echecs plus élevé pour les retenter`);
    console.log(`${sortie.gras("Descriptions de catégories")}: ${aDecrireListe.length ? sortie.jaune(String(aDecrireListe.length)) : sortie.vert("0")} catégorie(s) à décrire${aDecrireListe.length ? ` (${sortie.cyan(aDecrireListe.map((c) => c.nom).join(", "))})` : ""}`);
    console.log(`${sortie.gras("Open Hub")}: ${aOpenHub.length ? sortie.jaune(String(aOpenHub.length)) : sortie.vert("0")} outil(s) libre(s) à chercher (${requetesOpenHub(apercu.outils, maxEchecs)} requête(s), gratuites, 1 000 par jour)${aOpenHub.length ? ` (${sortie.cyan(aOpenHub.map((o) => o.nom).join(", "))})` : ""}`);
    if (abandonnesOpenHub.length) console.log(`  ${sortie.jaune(`abandonnés après ${maxEchecs} échecs consécutifs`)} (${abandonnesOpenHub.length}): ${sortie.cyan(abandonnesOpenHub.map((o) => `${o.nom} (${o.echecs_openhub})`).join(", "))}; relancer avec --max-echecs plus élevé pour les retenter`);
    if (prevus.length || aVerifier.length || aDecrireListe.length || total) for (const ligne of lignesEstimation(estimation, verification, descriptions, modele, apercu.outils.filter((o) => !o.removed).length, sortie, repli)) console.log(ligne);
    if (dryRun) {
      console.log(sortie.attenue("Simulation (--dry-run): rien n'est écrit"));
      return;
    }

    // Premier import: on demande avant de dépenser et d'écrire.
    if (apercu.importInitial && prevus.length && !accepterCouts) {
      const usageTotal = additionner(additionner(estimation.usage, verification.usage), descriptions.usage);
      const coutRepli = repli ? coutTotal(new Map([[repli, usageTotal]])) : 0;
      const cout = estimation.cout === null || verification.cout === null || descriptions.cout === null || coutRepli === null
        ? `inconnu pour ${modele}`
        : `≈ ${dollars(estimation.cout + verification.cout + descriptions.cout)}${repli ? `, jusqu'à ${dollars(coutRepli)} de plus si ${repli} doit reprendre chaque appel` : ""}`;
      if (!process.stdin.isTTY) {
        console.error(suivi.jaune(`Premier import hors terminal: ${prevus.length} outil(s) à enrichir (coût estimé ${cout}). Relancer avec --accepter-couts pour poursuivre, ou --dry-run pour l'estimation détaillée. Rien n'est écrit.`));
        process.exitCode = 1;
        return;
      }
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      const choix = interpreterChoix(await rl.question(texteConfirmation(prevus.length, cout)));
      rl.close();
      if (choix === "arreter") {
        console.log(sortie.attenue("Arrêt: rien n'est écrit"));
        return;
      }
    }

    // Dernier état écrit de outils.json: les métadonnées (updated_at) sont maintenues par ecrireFichier.
    const sync = synchroniser(fichier, page, criteresPage, modification, false, categoriesPage);
    let courant = sync.courant;
    const { outils } = sync;
    let nbEnrichis = 0;
    let nbConfirmes = 0;
    let usages: UsagesParModele = new Map();
    const compteur = (u: Usage, m: string) => { usages = ajouterUsage(usages, m, u); };
    if (sync.ecrit) console.log(`${sortie.vert(fichier)} mis à jour`);
    if (sync.criteresEcrits) console.log(`${sortie.vert(join(dirname(fichier), "criteres.json"))} mis à jour`);
    if (sync.categoriesEcrites) console.log(`${sortie.vert(join(dirname(fichier), "categories.json"))} mis à jour`);
    if (sync.sourcesEcrites) console.log(`${sortie.vert(join(dirname(fichier), "sources.json"))} mis à jour`);
    const categories = sync.categories;
    let nbDecrites = 0;
    let nbOpenHub = 0;

    if (prevus.length) {
      const cle = process.env.OPENAI_API_KEY;
      if (!cle) {
        console.error(suivi.jaune(`Enrichissement sauté: OPENAI_API_KEY absente (voir .env.example); ${prevus.length} outil(s) restent à enrichir`));
      } else {
        const tags = chargerTags(fichierTags);
        const criteres = chargerCriteres(join(dirname(fichier), "criteres.json"));
        const nbTags = tags.length;
        const progression = createProgress(prevus.length, {
          logWhenNotTTY: true,
          paint: { filled: suivi.vert, empty: suivi.attenue, label: suivi.cyan },
          restant: formaterDuree,
        });
        let traites = 0;
        const resultat = await enrichirOutils(outils, {
          tags,
          criteres,
          generer: generateurOpenAI(cle, modele, compteur),
          expliquer: expliqueurOpenAI(cle, modele, compteur),
          ...(repli && { genererRepli: generateurOpenAI(cle, repli, compteur), expliquerRepli: expliqueurOpenAI(cle, repli, compteur) }),
          autoriserNouveauxTags: nouveauxTags,
          categories,
          maxEchecs,
          apresChaque: (os, ts) => {
            courant = ecrireFichier(fichier, "outils", os as OutilClasse[], courant);
            if (ts.length !== nbTags) sauverTags(fichierTags, ts);
          },
          // En terminal, le nom de l'outil en cours s'affiche sur la barre; sinon, sur une ligne de journal.
          debut: (nom) =>
            process.stderr.isTTY ? progression.update(traites, nom) : progression.message(suivi.attenue(`Enrichissement de ${nom}...`)),
          progression: (n) => progression.update((traites = n)),
          journal: (message, niveau = "info") => progression.message(ligneJournal(message, niveau, suivi)),
        });
        progression.end();
        nbEnrichis = resultat.enrichis.length;
        const enrichis = resultat.enrichis.length ? sortie.gras(sortie.vert(String(resultat.enrichis.length))) : "0";
        const echecs = resultat.erreurs.length ? sortie.gras(sortie.rouge(String(resultat.erreurs.length))) : sortie.vert("0");
        console.log(`Enrichis: ${enrichis}; échecs: ${echecs}; ${formaterCouts(usages)}`);
        if (resultat.ecarts.length) console.log(`${sortie.jaune("Évaluation différente du répertoire")}: ${resultat.ecarts.join(", ")}`);
        if (tags.length > nbTags) console.log(`${sortie.cyan("Nouveaux tags")}: ${tags.slice(nbTags).map((t) => t.id).join(", ")}`);
        if (resultat.erreurs.length) process.exitCode = 1;
      }
    }

    // Vérification des critères (criteres_confirmes) des outils enrichis sans verdict, avec le même modèle et la règle A.
    const aConfirmerMaintenant = outils.filter((o) => aConfirmer(o) && !abandonneConfirmation(o, maxEchecs));
    if (aConfirmerMaintenant.length) {
      const cle = process.env.OPENAI_API_KEY;
      if (!cle) {
        console.error(suivi.jaune(`Vérification des critères sautée: OPENAI_API_KEY absente; ${aConfirmerMaintenant.length} outil(s) restent à vérifier`));
      } else {
        const criteres = chargerCriteres(join(dirname(fichier), "criteres.json"));
        const avant = usages;
        const progression = createProgress(aConfirmerMaintenant.length, { logWhenNotTTY: true, paint: { filled: suivi.vert, empty: suivi.attenue, label: suivi.cyan }, restant: formaterDuree });
        let traites = 0;
        const resultat = await confirmerOutils(outils, {
          confirmer: confirmateurOpenAI(cle, modele, compteur),
          ...(repli && { confirmerRepli: confirmateurOpenAI(cle, repli, compteur), modeleRepli: repli }),
          criteres,
          modele,
          categories,
          maxEchecs,
          apresChaque: (os) => { courant = ecrireFichier(fichier, "outils", os, courant); },
          debut: (nom) => (process.stderr.isTTY ? progression.update(traites, nom) : progression.message(suivi.attenue(`Vérification de ${nom}...`))),
          progression: (n) => progression.update((traites = n)),
          journal: (message, niveau = "info") => progression.message(ligneJournal(message, niveau, suivi)),
        });
        progression.end();
        nbConfirmes = resultat.confirmes.length;
        const confirmes = nbConfirmes ? sortie.gras(sortie.vert(String(nbConfirmes))) : "0";
        const echecs = resultat.erreurs.length ? sortie.gras(sortie.rouge(String(resultat.erreurs.length))) : sortie.vert("0");
        console.log(`Critères vérifiés: ${confirmes}; échecs: ${echecs}; ${formaterCouts(soustraireUsages(usages, avant))}`);
        if (resultat.erreurs.length) process.exitCode = 1;
      }
    }

    // Open Hub: données publiques des projets libres enrichis qui n'en ont pas encore (openhub.ts).
    const aOpenHubMaintenant = outils.filter((o) => aCompleterOpenHub(o, maxEchecs));
    if (aOpenHubMaintenant.length) {
      const cleOpenHub = process.env.OPENHUB_API_KEY;
      if (!cleOpenHub) {
        console.error(suivi.jaune(`Open Hub sauté: OPENHUB_API_KEY absente (voir .env.example); ${aOpenHubMaintenant.length} outil(s) libre(s) restent à chercher`));
      } else {
        const progression = createProgress(aOpenHubMaintenant.length, { logWhenNotTTY: true, paint: { filled: suivi.vert, empty: suivi.attenue, label: suivi.cyan }, restant: formaterDuree });
        let traites = 0;
        const resultat = await completerOpenHub(outils, {
          client: clientOpenHub(cleOpenHub),
          maxEchecs,
          apresChaque: (os) => { courant = ecrireFichier(fichier, "outils", os, courant); },
          debut: (nom) => (process.stderr.isTTY ? progression.update(traites, nom) : progression.message(suivi.attenue(`Open Hub: ${nom}...`))),
          progression: (n) => progression.update((traites = n)),
          journal: (message, niveau = "info") => progression.message(ligneJournal(message, niveau, suivi)),
        });
        progression.end();
        nbOpenHub = resultat.completes.length;
        const completes = nbOpenHub ? sortie.gras(sortie.vert(String(nbOpenHub))) : "0";
        const echecs = resultat.erreurs.length ? sortie.gras(sortie.jaune(String(resultat.erreurs.length))) : sortie.vert("0");
        console.log(`Open Hub: ${completes} outil(s) complété(s); sans concordance ou en erreur: ${echecs}${resultat.sansConcordance.length ? ` (candidats dans le journal ci-dessus)` : ""}`);
      }
    }

    // Descriptions des catégories qui n'en ont pas encore (categories.json), avec le même modèle.
    const aDecrireMaintenant = categories.filter(aDecrire);
    if (aDecrireMaintenant.length) {
      const cle = process.env.OPENAI_API_KEY;
      if (!cle) {
        console.error(suivi.jaune(`Descriptions de catégories sautées: OPENAI_API_KEY absente; ${aDecrireMaintenant.length} catégorie(s) restent à décrire`));
      } else {
        const avant = usages;
        const cheminCategories = join(dirname(fichier), "categories.json");
        const progression = createProgress(aDecrireMaintenant.length, { logWhenNotTTY: true, paint: { filled: suivi.vert, empty: suivi.attenue, label: suivi.cyan }, restant: formaterDuree });
        let traites = 0;
        const resultat = await decrireCategories(categories, outils.filter((o) => !o.removed), {
          generer: generateurDescriptionOpenAI(cle, modele, compteur),
          ...(repli && { genererRepli: generateurDescriptionOpenAI(cle, repli, compteur) }),
          apresChaque: (cs) => { sauverCategories(cheminCategories, cs); },
          debut: (nom) => (process.stderr.isTTY ? progression.update(traites, nom) : progression.message(suivi.attenue(`Description de ${nom}...`))),
          progression: (n) => progression.update((traites = n)),
          journal: (message, niveau = "info") => progression.message(ligneJournal(message, niveau, suivi)),
        });
        progression.end();
        nbDecrites = resultat.decrites.length;
        const decrites = nbDecrites ? sortie.gras(sortie.vert(String(nbDecrites))) : "0";
        const echecs = resultat.erreurs.length ? sortie.gras(sortie.rouge(String(resultat.erreurs.length))) : sortie.vert("0");
        console.log(`Catégories décrites: ${decrites}; échecs: ${echecs}; ${formaterCouts(soustraireUsages(usages, avant))}`);
        if (resultat.erreurs.length) process.exitCode = 1;
      }
    }

    if (sommaireNecessaire({ dryRun, changements: total + nbDecrites, enrichis: nbEnrichis + nbConfirmes + nbOpenHub })) {
      const raison = raisonDeSauterSommaire(process.env.OPENAI_API_KEY, verifierVlConvert);
      if (raison) {
        console.error(suivi.jaune(`Sommaire non mis à jour: ${raison}. Le sommaire existant est conservé; relancer \`node sommaire.ts\` ensuite.`));
      } else {
        console.error(suivi.attenue("Mise à jour du sommaire..."));
        try {
          let barre: Progress | undefined;
          const r = await genererSommaire({
            source: fichier,
            cle: process.env.OPENAI_API_KEY,
            modele,
            modeleRepli: repli,
            conserverSiEchec: true,
            progression: (total) => (barre = barreSommaire({ filled: suivi.vert, empty: suivi.attenue, label: suivi.cyan })(total)),
            journal: (message) => (barre ? barre.message(suivi.jaune(message)) : console.error(suivi.jaune(message))),
          });
          if (r.ecrit) console.log(`${sortie.vert(r.destination)} mis à jour (${r.graphiques} graphique(s))`);
          else {
            console.error(suivi.rouge(`Sommaire non mis à jour, le résumé n'a pas pu être rédigé: ${r.erreur}`));
            process.exitCode = 1;
          }
        } catch (e) {
          console.error(suivi.rouge(`Sommaire non mis à jour: ${(e as Error).message}`));
          process.exitCode = 1;
        }
      }
    }
  });
}
