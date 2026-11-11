// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Met à jour outils.json depuis le répertoire en ligne.
// Usage: nub update.ts [--dry-run] [--sans-couleur] [--enrichir [--nouveaux-tags] [--sans-page] [--sans-sommaire] [--limite=N]] [outils.json] [url]
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
// Option --enrichir (clé OPENAI_API_KEY dans .env; modèle: OPENAI_MODEL):
//   génère UNE SEULE FOIS, pour chaque outil qui n'a pas encore de description_longue, une description
//   longue en français (Markdown), de 1 à 5 tags de tags.json, source/licence/repo pour les logiciels libres
//   et une évaluation indépendante des critères et du score (evaluation_enrichie, avec un sous-champ
//   `ecart` qui explique la différence quand elle ne concorde pas avec le répertoire).
//   Une barre de progression et le journal vont sur stderr.
//   Un outil déjà enrichi n'est jamais régénéré. Avec --dry-run, liste seulement les outils concernés.
//   Si la page de l'outil est inaccessible ou presque vide, un avertissement est affiché et l'outil n'est PAS
//   enrichi (échec consigné, retenté à la prochaine exécution) pour ne pas figer un résultat peu fiable.
//   --sans-page     : enrichit quand même, à partir de la description seule; l'outil porte alors page_lue: false.
//   --nouveaux-tags : le modèle peut proposer de nouveaux tags (justification obligatoire, ajoutés à tags.json).
//   --limite=N      : n'enrichit pas plus de N outils par exécution.
//
// Sommaire: avec --enrichir (hors --dry-run), le sommaire (sommaire.md et graphiques/, voir sommaire.ts) est
// mis à jour automatiquement à la fin, mais SEULEMENT si quelque chose a changé (un outil nouveau, modifié ou
// retiré, ou au moins un outil enrichi). Il faut pour cela la clé OPENAI_API_KEY et vl-convert; s'ils manquent,
// un avertissement le dit et le sommaire existant reste tel quel. Si le résumé ne peut pas être rédigé, le sommaire
// existant est aussi conservé (code de sortie 1). --sans-sommaire désactive cette mise à jour.
//
// Couleurs (terminal seulement): résumé sur stdout, journal et barre sur stderr; chaque flux est coloré
// s'il est un terminal. NO_COLOR ou --sans-couleur les désactive, FORCE_COLOR les impose. Hors terminal,
// le texte est identique, sans aucun code de couleur.
import { dirname, join } from "node:path";
import { couleursActives, creerCouleurs, type Couleurs } from "./couleurs.ts";
import { classer, type OutilClasse } from "./classify.ts";
import {
  aEnrichir, chargerCriteres, chargerTags, enrichirOutils, expliqueurOpenAI, generateurOpenAI, MODELE_PAR_DEFAUT, sauverTags,
  type NiveauJournal,
} from "./enrichir.ts";
import { lancer } from "./cli.ts";
import { ecrireFichier, lireFichier, type Lu } from "./fichiers.ts";
import { CHAMPS_ENRICHIS, telechargerRepertoire, type Changement, type Outil } from "./extract.ts";
import { verifierVlConvert } from "./graphiques.ts";
import { createProgress } from "./progress.ts";
import { genererSommaire } from "./sommaire.ts";

const CHAMPS_COMPARES = ["categorie", "icone", "score", "lien", "description"] as const;

/** Les champs d'enrichissement d'un outil existant, à reporter sur sa version à jour de la page. */
const enrichissementDe = (o: OutilClasse): Partial<Outil> =>
  Object.fromEntries(CHAMPS_ENRICHIS.filter((c) => o[c] !== undefined).map((c) => [c, o[c]]));

export interface Resume {
  nouveau: string[];
  modification: string[];
  retrait: string[];
  comeback: string[];
}

export function mettreAJour(
  existants: OutilClasse[],
  page: Outil[],
  modification: string,
): { outils: OutilClasse[]; resume: Resume } {
  const resume: Resume = { nouveau: [], modification: [], retrait: [], comeback: [] };
  const parNom = new Map(existants.map((o) => [o.nom, o]));
  const enLigne = new Set(page.map((o) => o.nom));
  const outils: OutilClasse[] = [];

  const marquer = (o: Outil, changement: Changement, ancien?: OutilClasse): OutilClasse => {
    resume[changement].push(o.nom);
    return {
      ...o,
      ...(ancien && enrichissementDe(ancien)),
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
  for (const e of existants) {
    if (enLigne.has(e.nom)) continue;
    if (e.removed) {
      outils.push(e);
    } else {
      outils.push({ ...e, derniere_modification: modification, changement: "retrait", removed: true });
      resume.retrait.push(e.nom);
    }
  }
  return { outils, resume };
}

// ---------- sommaire automatique ----------

/** Le sommaire est mis à jour avec --enrichir, hors simulation et sans --sans-sommaire, et seulement si quelque chose a changé. */
export function sommaireNecessaire(o: { enrichir: boolean; dryRun: boolean; changements: number; enrichis: number; sansSommaire?: boolean }): boolean {
  return o.enrichir && !o.dryRun && !o.sansSommaire && (o.changements > 0 || o.enrichis > 0);
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
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const enrichir = args.includes("--enrichir");
    const nouveauxTags = args.includes("--nouveaux-tags");
    const sansPage = args.includes("--sans-page");
    const sansSommaire = args.includes("--sans-sommaire");
    const limiteArg = args.find((a) => a.startsWith("--limite="));
    const limite = limiteArg ? Number(limiteArg.slice("--limite=".length)) : undefined;
    const sansCouleur = args.includes("--sans-couleur");
    const connues = ["--dry-run", "--sans-couleur", "--enrichir", "--nouveaux-tags", "--sans-page", "--sans-sommaire", "--limite"];
    const inconnue = args.find((a) => a.startsWith("--") && !connues.some((o) => a === o || a.startsWith(`${o}=`)));
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    if ((nouveauxTags || sansPage || sansSommaire) && !enrichir) throw new Error("--nouveaux-tags, --sans-page et --sans-sommaire nécessitent --enrichir");
    if (limite !== undefined && !(Number.isInteger(limite) && limite > 0)) throw new Error("--limite=N: entier positif attendu");
    const [fichier = "outils.json", url] = args.filter((a) => !a.startsWith("--"));

    // Le résumé va sur stdout et le journal sur stderr: chaque flux a ses propres couleurs.
    const sortie = creerCouleurs(couleursActives(process.stdout, process.env, sansCouleur));
    const suivi = creerCouleurs(couleursActives(process.stderr, process.env, sansCouleur));

    const { outils: page, modification } = await telechargerRepertoire(url);
    // Fichier de départ, puis dernier état écrit: les métadonnées (updated_at) sont maintenues par ecrireFichier.
    let courant: Lu<OutilClasse> = lireFichier<OutilClasse>(fichier, "outils");
    const existants = courant.donnees;

    let nbEnrichis = 0;
    const { outils, resume } = mettreAJour(existants, page, modification);
    const total = Object.values(resume).reduce((n, noms) => n + noms.length, 0);
    for (const ligne of lignesResume(resume, modification, sortie)) console.log(ligne);
    if (dryRun) console.log(sortie.attenue("Simulation (--dry-run): rien n'est écrit"));
    if (total && !dryRun) {
      courant = ecrireFichier(fichier, "outils", outils, courant);
      console.log(`${sortie.vert(fichier)} mis à jour`);
    }

    if (enrichir) {
      const fichierTags = join(dirname(fichier), "tags.json");
      const aFaire = outils.filter(aEnrichir);
      const prevus = limite ? aFaire.slice(0, limite) : aFaire;
      console.log(`${sortie.gras("Enrichissement")}: ${aFaire.length ? sortie.jaune(String(aFaire.length)) : sortie.vert("0")} outil(s) sans description longue`);
      if (dryRun) {
        if (prevus.length) console.log(`  à enrichir (${prevus.length}): ${sortie.cyan(prevus.map((o) => o.nom).join(", "))}`);
      } else if (aFaire.length) {
        const cle = process.env.OPENAI_API_KEY;
        if (!cle) throw new Error("OPENAI_API_KEY absente (voir .env.example)");
        const tags = chargerTags(fichierTags);
        const criteres = chargerCriteres(join(dirname(fichier), "criteres.json"));
        const nbTags = tags.length;
        const modele = process.env.OPENAI_MODEL || MODELE_PAR_DEFAUT;
        const progression = createProgress(prevus.length, {
          logWhenNotTTY: true,
          paint: { filled: suivi.vert, empty: suivi.attenue, label: suivi.cyan },
        });
        let traites = 0;
        const resultat = await enrichirOutils(outils, {
          tags,
          criteres,
          generer: generateurOpenAI(cle, modele),
          expliquer: expliqueurOpenAI(cle, modele),
          autoriserNouveauxTags: nouveauxTags,
          accepterSansPage: sansPage,
          ...(limite !== undefined && { limite }),
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
        console.log(`Enrichis: ${enrichis}; échecs: ${echecs}`);
        if (resultat.ecarts.length) console.log(`${sortie.jaune("Évaluation différente du répertoire")}: ${resultat.ecarts.join(", ")}`);
        if (resultat.sansPage.length) console.log(`${sortie.jaune("Enrichis sans page lisible (page_lue: false)")}: ${resultat.sansPage.join(", ")}`);
        if (tags.length > nbTags) console.log(`${sortie.cyan("Nouveaux tags")}: ${tags.slice(nbTags).map((t) => t.id).join(", ")}`);
        if (resultat.erreurs.length) process.exitCode = 1;
      }
    }

    if (enrichir && !dryRun && sansSommaire && (total > 0 || nbEnrichis > 0)) {
      console.error(suivi.attenue("Sommaire non mis à jour (--sans-sommaire); lancer `nub run sommaire` pour le mettre à jour."));
    }
    if (sommaireNecessaire({ enrichir, dryRun, changements: total, enrichis: nbEnrichis, sansSommaire })) {
      const raison = raisonDeSauterSommaire(process.env.OPENAI_API_KEY, verifierVlConvert);
      if (raison) {
        console.error(suivi.jaune(`Sommaire non mis à jour: ${raison}. Le sommaire existant est conservé; relancer \`nub run sommaire\` ensuite.`));
      } else {
        console.error(suivi.attenue("Mise à jour du sommaire..."));
        try {
          const r = await genererSommaire({
            source: fichier,
            cle: process.env.OPENAI_API_KEY,
            modele: process.env.OPENAI_MODEL || undefined,
            conserverSiEchec: true,
            journal: (message) => console.error(suivi.jaune(message)),
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
