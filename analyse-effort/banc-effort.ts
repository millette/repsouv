// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Banc d'essai: une variante (modèle, effort de raisonnement) enrichit puis vérifie un échantillon fixe d'outils, comparé
// à la référence de outils.json (voir analyse.md). Usage, depuis la racine du dépôt, avec la clé dans .env:
//   node analyse-effort/banc-effort.ts <modele> <effort|-> [n]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chargerCategories } from "../categories.ts";
import { confirmateurOpenAI, confirmerOutils } from "../confirmer.ts";
import { chargerCriteres, chargerTags, enrichirOutils, expliqueurOpenAI, generateurOpenAI } from "../enrichir.ts";
import { chargerEnv } from "../env.ts";
import { lireFichier } from "../fichiers.ts";
import { ajouterUsage, coutTotal, formaterCouts, type Usage, type UsagesParModele } from "../prix.ts";
import type { OutilClasse } from "../classify.ts";

chargerEnv();
const [modele = "gpt-6.1-sol", effortArg = "-", nArg = "20"] = process.argv.slice(2);
const effort = effortArg === "-" ? "" : effortArg;
process.env.OPENAI_REASONING_EFFORT = effort; // vide: défaut du modèle (voir effortDepuisEnv)
const cle = process.env.OPENAI_API_KEY;
if (!cle) throw new Error("OPENAI_API_KEY absente (voir .env.example)");
const n = Number(nArg);
const DOSSIER = dirname(fileURLToPath(import.meta.url));

type Outil = OutilClasse & Record<string, unknown>;
const reference = lireFichier<Outil>("outils.json", "outils").donnees;
const tags = chargerTags("tags.json");
const criteres = chargerCriteres("criteres.json");
const categories = chargerCategories("categories.json");

// Échantillon fixe: moitié libres, partiels ou source-disponible, moitié propriétaires, espacés dans l'ordre alphabétique.
const fichierEchantillon = join(DOSSIER, "echantillon.json");
let noms: string[];
if (existsSync(fichierEchantillon)) noms = JSON.parse(readFileSync(fichierEchantillon, "utf8")) as string[];
else {
  const enrichis = reference.filter((o) => o.description_longue && !o.echecs_enrichissement).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const espaces = (xs: Outil[], k: number) => Array.from({ length: k }, (_, i) => xs[Math.floor((i * xs.length) / k)]!.nom);
  noms = [...espaces(enrichis.filter((o) => o.source !== "proprietaire"), Math.ceil(n / 2)), ...espaces(enrichis.filter((o) => o.source === "proprietaire"), Math.floor(n / 2))];
  writeFileSync(fichierEchantillon, JSON.stringify(noms, null, 2) + "\n");
}
const ref = new Map(reference.filter((o) => noms.includes(o.nom)).map((o) => [o.nom, o]));
const CHAMPS = ["description_longue", "tags", "source", "licence", "custom_license", "custom_license_url", "repo", "evaluation_enrichie", "enrichi_le", "criteres_confirmes", "echecs_enrichissement", "echecs_confirmation"];
const outils = noms.map((nom) => {
  const o: Outil = { ...ref.get(nom)! };
  for (const c of CHAMPS) delete o[c];
  return o;
});

let usages: UsagesParModele = new Map();
const compteur = (u: Usage, m: string) => { usages = ajouterUsage(usages, m, u); };
const journal: string[] = [];
const etiquette = `${modele} / effort ${effort || "défaut du modèle"}`;
console.error(`== ${etiquette}: ${noms.length} outils ==`);
const t0 = performance.now();
const e = await enrichirOutils(outils, {
  tags: structuredClone(tags), criteres, categories,
  generer: generateurOpenAI(cle, modele, compteur), expliquer: expliqueurOpenAI(cle, modele, compteur),
  debut: (nom) => console.error(`  ${nom}...`),
  journal: (m) => { journal.push(m); console.error(`   ${m}`); },
});
const tEnrich = performance.now() - t0;
const c = await confirmerOutils(outils, { confirmer: confirmateurOpenAI(cle, modele, compteur), criteres, modele, categories, journal: (m) => { journal.push(m); console.error(`   ${m}`); } });
const tTotal = performance.now() - t0;

// Comparaison à la référence.
const ens = (x: string[] = [], y: string[] = []) => x.length === y.length && x.every((v) => y.includes(v));
const jaccard = (x: string[] = [], y: string[] = []) => x.filter((v) => y.includes(v)).length / (new Set([...x, ...y]).size || 1);
const faits = outils.filter((o) => o.description_longue);
const compte = (f: (o: Outil, r: Outil) => boolean) => faits.filter((o) => f(o, ref.get(o.nom)!)).length;
const verifies = outils.filter((o) => o.criteres_confirmes);
const statut = (o: Outil, id: string) => (o.criteres_confirmes!.criteres.includes(id as never) ? "c" : id in o.criteres_confirmes!.infirmes ? "i" : "?");
const resume = {
  modele, effort: effort || "défaut du modèle", outils: noms.length, enrichis: faits.length, verifies: verifies.length,
  rejets: journal.filter((m) => /rejetée/.test(m)).length, echecs: e.erreurs.length + c.erreurs.length,
  source: compte((o, r) => o.source === r.source), licence: compte((o, r) => o.licence === r.licence), repo: compte((o, r) => o.repo === r.repo),
  eval_score: compte((o, r) => o.evaluation_enrichie?.score === r.evaluation_enrichie?.score),
  eval_criteres: compte((o, r) => ens(o.evaluation_enrichie?.criteres, r.evaluation_enrichie?.criteres)),
  tags_identiques: compte((o, r) => ens(o.tags, r.tags)),
  tags_jaccard_moyen: Math.round((faits.reduce((s, o) => s + jaccard(o.tags, ref.get(o.nom)!.tags), 0) / (faits.length || 1)) * 100) / 100,
  verdict_donnees: verifies.filter((o) => statut(o, "donnees") === statut(ref.get(o.nom)!, "donnees")).length,
  verdict_controle: verifies.filter((o) => statut(o, "controle") === statut(ref.get(o.nom)!, "controle")).length,
  verdict_dependance: verifies.filter((o) => statut(o, "dependance") === statut(ref.get(o.nom)!, "dependance")).length,
  usage: Object.fromEntries(usages), cout: coutTotal(usages), couts: formaterCouts(usages),
  duree_enrichissement_s: Math.round(tEnrich / 1000), duree_totale_s: Math.round(tTotal / 1000), duree_moyenne_outil_s: Math.round(tEnrich / 1000 / (faits.length || 1)),
};
writeFileSync(join(DOSSIER, `${modele}-${effort || "defaut"}.json`), JSON.stringify({ resume, journal, outils }, null, 2) + "\n");
console.log(JSON.stringify(resume, null, 1));
