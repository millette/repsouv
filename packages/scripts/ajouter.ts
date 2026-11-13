// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Ajoute à la main un outil qui ne vient pas d'un répertoire extrait (voir sources.json), avec sa source.
//
// Usage: node packages/scripts/ajouter.ts <lien> --nom=… --categorie=<id> --description=… --source=<id> [options] [outils.json]
//   Sans chemin, le fichier est donnees/outils.json à la racine du dépôt (FICHIER_OUTILS).
//   --score=N                    étoiles (0 à 3) si la source en donne; sinon score_estime: le score et les critères sont
//                                déduits de la description par seuil, puis remplacés par l'évaluation enrichie de update
//   --alternative-a=url,url      services auxquels l'outil se substitue (URL http(s))
//   Pour créer la source si elle n'existe pas encore dans sources.json (extracteur « manuel »):
//   --source-nom=… --source-url=… [--source-pdc=…] [--source-donnees=…]
//   [--soumis-par-nom=… [--soumis-par-url=…] [--soumis-par-email=…]]   (qui a soumis la collection; le nom suffit)
// categories.json, sources.json et tags.json sont lus dans le dossier de outils.json. L'outil est écrit avec
// changement « nouveau » et la date du moment; `node packages/scripts/update.ts` l'enrichit ensuite comme les autres.
import { dirname, join } from "node:path";
import { chargerCategories } from "./categories.ts";
import { classer, type OutilClasse } from "./classify.ts";
import { lancer } from "./cli.ts";
import { ecrireFichier, FICHIER_OUTILS, lireFichier, lireSiExiste } from "./fichiers.ts";
import { problemesSource, sourcesAvec, type Source } from "./sources.ts";
import { horodatage } from "./temps.ts";
import { lierVoirAussi } from "./logiciel.ts";

export interface ParametresAjout {
  lien: string;
  nom: string;
  categorie: string;
  description: string;
  source: string;
  score?: number;
  alternative_a?: string[];
  /** Pour créer la source si elle manque. */
  sourceNom?: string;
  sourceUrl?: string;
  sourcePdc?: string;
  sourceDonnees?: string;
  soumisParNom?: string;
  soumisParUrl?: string;
  soumisParEmail?: string;
}

const URL_HTTP = /^https?:\/\/\S+$/;

/** La source demandée: celle de sources.json, ou une nouvelle source « manuel » bâtie des paramètres. */
export function sourceDemandee(sources: readonly Source[], p: ParametresAjout): { source: Source; nouvelle: boolean } {
  const existante = sources.find((s) => s.id === p.source);
  if (existante) return { source: existante, nouvelle: false };
  if (!p.sourceNom || !p.sourceUrl) {
    throw new Error(`source « ${p.source} » absente de sources.json: donner --source-nom et --source-url pour la créer (sources connues: ${sources.map((s) => s.id).join(", ") || "aucune"})`);
  }
  const source: Source = {
    id: p.source, nom: p.sourceNom, url: p.sourceUrl, extracteur: "manuel",
    ...(p.sourcePdc && { pdc: p.sourcePdc }), ...(p.sourceDonnees && { donnees: p.sourceDonnees }),
    ...(p.soumisParNom && { soumis_par: { nom: p.soumisParNom, ...(p.soumisParUrl && { url: p.soumisParUrl }), ...(p.soumisParEmail && { email: p.soumisParEmail }) } }),
  };
  const problemes = problemesSource(source);
  if (problemes.length) throw new Error(`source invalide: ${problemes.join("; ")}`);
  return { source, nouvelle: true };
}

/** L'outil à écrire: validé (lien, nom, catégorie connue, nom libre, score, alternatives), classé, daté. */
export function outilDemande(p: ParametresAjout, existants: readonly OutilClasse[], categories: readonly { id: string }[], maintenant: string = horodatage()): OutilClasse {
  if (!URL_HTTP.test(p.lien)) throw new Error(`lien « ${p.lien} »: URL http(s) attendue`);
  if (!p.nom.trim()) throw new Error("--nom requis");
  if (!p.description.trim()) throw new Error("--description requise");
  if (!categories.some((c) => c.id === p.categorie)) throw new Error(`catégorie « ${p.categorie} » absente de categories.json (connues: ${categories.map((c) => c.id).join(", ")})`);
  if (existants.some((o) => o.nom === p.nom)) throw new Error(`un outil nommé « ${p.nom} » existe déjà dans outils.json`);
  if (p.score !== undefined && (!Number.isInteger(p.score) || p.score < 0 || p.score > 3)) throw new Error(`--score=${p.score}: entier de 0 à 3 attendu`);
  for (const a of p.alternative_a ?? []) if (!URL_HTTP.test(a)) throw new Error(`alternative « ${a} »: URL http(s) attendue`);
  const classement = classer(p.description, p.score);
  return {
    categorie: p.categorie, nom: p.nom.trim(), score: p.score ?? classement.criteres.length, lien: p.lien, description: p.description.trim(),
    derniere_modification: maintenant, changement: "nouveau", source_repertoire_id: p.source,
    ...(p.score === undefined && { score_estime: true as const }),
    ...(p.alternative_a?.length && { alternative_a: [...new Set(p.alternative_a)] }),
    ...classement,
  };
}

/** Ajoute l'outil (et sa source si elle est nouvelle) aux fichiers du dossier de `fichier` (outils.json). */
export function ajouterOutil(fichier: string, p: ParametresAjout, maintenant: string = horodatage()): { outil: OutilClasse; source: Source; nouvelleSource: boolean } {
  const dossier = dirname(fichier);
  const lu = lireSiExiste<OutilClasse>(fichier, "outils");
  if (!lu) throw new Error(`${fichier} absent: lancer « node packages/scripts/update.ts » d'abord (import initial), puis ajouter`);
  const categories = chargerCategories(join(dossier, "categories.json"));
  const cheminSources = join(dossier, "sources.json");
  const sourcesLues = lireSiExiste<Source>(cheminSources, "sources");
  const { source, nouvelle } = sourceDemandee(sourcesLues?.donnees ?? [], p);
  const outil = outilDemande(p, lu.donnees, categories, maintenant);
  if (nouvelle) ecrireFichier(cheminSources, "sources", sourcesAvec(sourcesLues?.donnees ?? [], source), sourcesLues, maintenant);
  const { outils } = lierVoirAussi([...lu.donnees, outil]);
  ecrireFichier(fichier, "outils", outils, lu, maintenant);
  return { outil: outils.at(-1)!, source, nouvelleSource: nouvelle };
}

const OPTIONS = ["nom", "categorie", "description", "source", "score", "alternative-a", "source-nom", "source-url", "source-pdc", "source-donnees", "soumis-par-nom", "soumis-par-url", "soumis-par-email"] as const;

/** Lit `--cle=valeur` (clés connues seulement) et les positionnels: le lien, puis le fichier outils.json. */
export function parametresDepuisArgs(args: string[]): { parametres: ParametresAjout; fichier: string } {
  const valeurs: Record<string, string> = {};
  const positionnels: string[] = [];
  for (const a of args) {
    if (!a.startsWith("--")) { positionnels.push(a); continue; }
    const [cle, ...reste] = a.slice(2).split("=");
    if (!(OPTIONS as readonly string[]).includes(cle!) || reste.length === 0) throw new Error(`Option inconnue: ${a.split("=")[0]}`);
    valeurs[cle!] = reste.join("=");
  }
  const [lien, fichier = FICHIER_OUTILS] = positionnels;
  if (!lien) throw new Error("Usage: node packages/scripts/ajouter.ts <lien> --nom=… --categorie=<id> --description=… --source=<id> [options] [outils.json]");
  for (const requis of ["nom", "categorie", "description", "source"]) if (!valeurs[requis]) throw new Error(`--${requis} requis`);
  const score = valeurs.score === undefined ? undefined : Number(valeurs.score);
  return {
    fichier,
    parametres: {
      lien, nom: valeurs.nom!, categorie: valeurs.categorie!, description: valeurs.description!, source: valeurs.source!,
      ...(score !== undefined && { score }),
      ...(valeurs["alternative-a"] && { alternative_a: valeurs["alternative-a"].split(",").map((s) => s.trim()).filter(Boolean) }),
      ...(valeurs["source-nom"] && { sourceNom: valeurs["source-nom"] }), ...(valeurs["source-url"] && { sourceUrl: valeurs["source-url"] }),
      ...(valeurs["source-pdc"] && { sourcePdc: valeurs["source-pdc"] }), ...(valeurs["source-donnees"] && { sourceDonnees: valeurs["source-donnees"] }),
      ...(valeurs["soumis-par-nom"] && { soumisParNom: valeurs["soumis-par-nom"] }), ...(valeurs["soumis-par-url"] && { soumisParUrl: valeurs["soumis-par-url"] }),
      ...(valeurs["soumis-par-email"] && { soumisParEmail: valeurs["soumis-par-email"] }),
    },
  };
}

if (import.meta.main) {
  await lancer(async () => {
    const { parametres, fichier } = parametresDepuisArgs(process.argv.slice(2));
    const r = ajouterOutil(fichier, parametres);
    console.log(`${r.outil.nom} ajouté à ${fichier} (source ${r.source.id}${r.nouvelleSource ? ", créée dans sources.json" : ""}; ${r.outil.score_estime ? `score estimé ${r.outil.score}` : `score ${r.outil.score}`}: ${r.outil.criteres.join(", ") || "aucun critère"}). Lancer « node packages/scripts/update.ts » pour l'enrichir.`);
  });
}
