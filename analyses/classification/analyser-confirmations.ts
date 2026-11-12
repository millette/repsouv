// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Compare les confirmations de critères (confirmer.ts) entre fournisseurs, avec `criteres` (déduit) et avec
// `evaluation_enrichie.criteres` (second avis de l'enrichissement). Rapporte aussi jetons et coût par fournisseur.
// Usage: nub analyses/classification/analyser-confirmations.ts [outils.json] [fichier-confirmations ...]
import { readFileSync } from "node:fs";
import type { OutilClasse } from "../../classify.ts";
import { accordEnsembles, ensembleConfirme, IDS_CRITERES, type Confirmation, type Resultat, type Totaux } from "../../confirmer.ts";
import { lireFichier } from "../../fichiers.ts";

interface Fichier {
  meta: { fournisseur: string; modele: string };
  totaux: Totaux;
  resultats: Resultat[];
}

const args = process.argv.slice(2);
const fichierOutils = args.find((a) => a.endsWith("outils.json")) ?? "outils.json";
const fichiers = args.filter((a) => a !== fichierOutils);
const chemins = fichiers.length ? fichiers : ["analyses/classification/confirmations-openai.json", "analyses/classification/confirmations-claude.json"];
const lus = chemins.map((c) => JSON.parse(readFileSync(c, "utf8")) as Fichier);
const outils = new Map(lireFichier<OutilClasse>(fichierOutils, "outils").donnees.map((o) => [o.nom, o]));

const pct = (a: number, b: number) => `${a}/${b} (${b ? Math.round((100 * a) / b) : 0} %)`;
const fmt = (n: number) => n.toLocaleString("fr-CA");
const confirmations = (f: Fichier) => new Map(f.resultats.filter((r) => r.confirmation).map((r) => [r.nom, r.confirmation as Confirmation]));

console.log(`# Résultats des confirmations de critères par IA\n\n*Documentation : [README](../../README.md) · [Implémentation](../../implementation.md) · [Historique](../../historique.md) · [Sommaire statistique](../../sommaire.md) · [Analyse de la classification](../../analyses/classification/README.md)*\n\n*Généré le ${new Date().toISOString().slice(0, 10)} par \`analyses/classification/analyser-confirmations.ts\` à partir des fichiers \`confirmations-*.json\`. Ne pas modifier à la main.*\n`);
console.log("## Jetons et coût\n");
console.log("| Fournisseur | Modèle | Outils | Appels | Jetons en entrée (cache lu) | Jetons en sortie | Coût ($) | Échecs |\n|---|---|---|---|---|---|---|---|");
for (const f of lus) {
  const t = f.totaux;
  console.log(`| ${f.meta.fournisseur} | ${f.meta.modele} | ${f.resultats.length} | ${t.appels} | ${fmt(t.entree)} (${fmt(t.cache_lecture)}) | ${fmt(t.sortie)} | ${t.cout_usd.toFixed(4)} | ${t.echecs} |`);
}

console.log("\n## Verdicts par critère\n");
console.log("| Fournisseur | Critère | confirmé | infirmé | indéterminé |\n|---|---|---|---|---|");
for (const f of lus) {
  const cs = [...confirmations(f).values()];
  for (const id of IDS_CRITERES) {
    const n = (s: string) => cs.filter((c) => c[id].statut === s).length;
    console.log(`| ${f.meta.fournisseur} | ${id} | ${n("confirme")} | ${n("infirme")} | ${n("indetermine")} |`);
  }
}

console.log("\n## Accord des ensembles de critères confirmés\n");
console.log("| Comparaison | Ensembles identiques | Jaccard moyen |\n|---|---|---|");
const ligne = (nom: string, paires: [string[], string[]][]) => {
  const a = accordEnsembles(paires);
  console.log(`| ${nom} | ${pct(a.exact, a.total)} | ${a.jaccard.toFixed(3)} |`);
};
for (const f of lus) {
  const c = confirmations(f);
  const noms = [...c.keys()].filter((n) => outils.has(n));
  ligne(`${f.meta.fournisseur} contre \`criteres\` (déduit)`, noms.map((n) => [ensembleConfirme(c.get(n)!), outils.get(n)!.criteres]));
  ligne(`${f.meta.fournisseur} contre \`evaluation_enrichie.criteres\``, noms.map((n) => [ensembleConfirme(c.get(n)!), outils.get(n)!.evaluation_enrichie!.criteres]));
}
if (lus.length === 2) {
  const [a, b] = [confirmations(lus[0]!), confirmations(lus[1]!)];
  const communs = [...a.keys()].filter((n) => b.has(n));
  ligne(`${lus[0]!.meta.fournisseur} contre ${lus[1]!.meta.fournisseur} (${communs.length} outils communs)`, communs.map((n) => [ensembleConfirme(a.get(n)!), ensembleConfirme(b.get(n)!)]));
  console.log("\n## Accord critère par critère entre les deux fournisseurs (confirmé ou non)\n");
  console.log("| Critère | Accord | Les deux confirment | Seulement le premier | Seulement le second | Aucun |\n|---|---|---|---|---|---|");
  for (const id of IDS_CRITERES) {
    let tt = 0, tf = 0, ft = 0, ff = 0;
    for (const n of communs) {
      const x = a.get(n)![id].statut === "confirme", y = b.get(n)![id].statut === "confirme";
      if (x && y) tt++; else if (x) tf++; else if (y) ft++; else ff++;
    }
    console.log(`| ${id} | ${pct(tt + ff, communs.length)} | ${tt} | ${tf} | ${ft} | ${ff} |`);
  }
}

console.log("\n## Rapport entre critères confirmés et étoiles\n");
console.log("| Fournisseur | Confirmés = étoiles | Confirmés < étoiles | Confirmés > étoiles |\n|---|---|---|---|");
for (const f of lus) {
  const c = confirmations(f);
  let egal = 0, moins = 0, plus = 0;
  for (const [nom, conf] of c) {
    const o = outils.get(nom);
    if (!o) continue;
    const k = ensembleConfirme(conf).length;
    if (k === o.score) egal++; else if (k < o.score) moins++; else plus++;
  }
  console.log(`| ${f.meta.fournisseur} | ${egal} | ${moins} | ${plus} |`);
}

console.log("\n## Les 18 outils où l'enrichissement confirmait moins de critères que d'étoiles\n");
const ecarts = [...outils.values()].filter((o) => o.evaluation_enrichie && o.evaluation_enrichie.score < o.score);
console.log("| Fournisseur | Outils | Mêmes critères confirmés que l'enrichissement | Aucun critère non retenu n'est confirmé | Plus de critères confirmés (proche du répertoire) |\n|---|---|---|---|---|");
for (const f of lus) {
  const c = confirmations(f);
  const cibles = ecarts.filter((o) => c.has(o.nom));
  const memes = cibles.filter((o) => ensembleConfirme(c.get(o.nom)!).join() === o.evaluation_enrichie!.criteres.join()).length;
  const aucunDeplus = cibles.filter((o) => ensembleConfirme(c.get(o.nom)!).every((id) => o.evaluation_enrichie!.criteres.includes(id))).length;
  const plus = cibles.filter((o) => ensembleConfirme(c.get(o.nom)!).length > o.evaluation_enrichie!.score).length;
  console.log(`| ${f.meta.fournisseur} | ${cibles.length} | ${memes} | ${aucunDeplus} | ${plus} |`);
}
