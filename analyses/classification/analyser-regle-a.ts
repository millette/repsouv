// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Effet de la règle A (« controle » : la nationalité mentionnée suffit) sur les outils où les deux IA divergeaient pour ce critère.
// Compare, pour chaque fournisseur, la confirmation de départ et celle avec la règle A; rapporte accord entre IA, coût et jetons.
// Attention (biais de sélection): ces outils ont été choisis parce que les deux IA divergeaient, donc leur accord de départ est
// nul par construction. Les critères « donnees » et « dependance », dont les consignes n'ont pas changé, donnent une idée de la
// variabilité d'une exécution à l'autre.
// Usage: nub analyses/classification/analyser-regle-a.ts [outils.json]
import { readFileSync } from "node:fs";
import type { OutilClasse } from "../../classify.ts";
import type { Confirmation, Resultat, Totaux } from "../../confirmer.ts";
import { IDS_CRITERES } from "../../confirmer.ts";
import { lireFichier } from "../../fichiers.ts";

interface Fichier {
  meta: { fournisseur: string; modele: string; regle: string | null };
  totaux: Totaux;
  resultats: Resultat[];
}
const D = "analyses/classification";
const lire = (nom: string) => JSON.parse(readFileSync(`${D}/${nom}`, "utf8")) as Fichier;
const noms = JSON.parse(readFileSync(`${D}/liste-desaccord-controle.json`, "utf8")) as string[];
const outils = new Map(lireFichier<OutilClasse>(process.argv[2] ?? "outils.json", "outils").donnees.map((o) => [o.nom, o]));
const confirmations = (f: Fichier) => new Map(f.resultats.filter((r) => r.confirmation).map((r) => [r.nom, r.confirmation as Confirmation]));

const fournisseurs = ["openai", "claude"] as const;
const depart = Object.fromEntries(fournisseurs.map((p) => [p, confirmations(lire(`confirmations-${p}.json`))]));
const fichiersA = Object.fromEntries(fournisseurs.map((p) => [p, lire(`confirmations-${p}-regle-a.json`)]));
const regleA = Object.fromEntries(fournisseurs.map((p) => [p, confirmations(fichiersA[p]!)]));
const pct = (a: number, b: number) => `${a}/${b} (${b ? Math.round((100 * a) / b) : 0} %)`;
const sur = noms.filter((n) => fournisseurs.every((p) => regleA[p]!.has(n)));

console.log(`# Résultats de la règle A pour « contrôle »\n\n*Documentation : [README](../../README.md) · [Implémentation](../../implementation.md) · [Historique](../../historique.md) · [Sommaire statistique](../../sommaire.md) · [Analyse de la classification](../../analyses/classification/README.md)*\n\n*Généré le ${new Date().toISOString().slice(0, 10)} par \`analyses/classification/analyser-regle-a.ts\` à partir des fichiers \`confirmations-*.json\`. Ne pas modifier à la main.*\n\n## Règle A, ${sur.length} outils sur ${noms.length} (divergence de départ sur « controle »)\n`);
console.log("### Jetons et coût\n\n| Fournisseur | Modèle | Appels | Jetons en entrée (cache lu) | Jetons en sortie | Coût ($) | Échecs |\n|---|---|---|---|---|---|---|");
for (const p of fournisseurs) {
  const f = fichiersA[p]!, t = f.totaux;
  console.log(`| ${p} | ${f.meta.modele} | ${t.appels} | ${t.entree.toLocaleString("fr-CA")} (${t.cache_lecture.toLocaleString("fr-CA")}) | ${t.sortie.toLocaleString("fr-CA")} | ${t.cout_usd.toFixed(4)} | ${t.echecs} |`);
}

console.log("\n### Verdicts « controle » sur ces outils\n\n| Fournisseur | | confirmé | infirmé | indéterminé |\n|---|---|---|---|---|");
for (const p of fournisseurs) {
  for (const [nom, source] of [["départ", depart], ["règle A", regleA]] as const) {
    const n = (s: string) => sur.filter((x) => source[p]!.get(x)!.controle.statut === s).length;
    console.log(`| ${p} | ${nom} | ${n("confirme")} | ${n("infirme")} | ${n("indetermine")} |`);
  }
}

const accord = (src: Record<string, Map<string, Confirmation>>, id: (typeof IDS_CRITERES)[number]) => {
  const conf = (p: string, n: string) => src[p]!.get(n)![id].statut === "confirme";
  const exact = (n: string) => src.openai!.get(n)![id].statut === src.claude!.get(n)![id].statut;
  return { confirme: sur.filter((n) => conf("openai", n) === conf("claude", n)).length, exact: sur.filter(exact).length };
};
console.log("\n### Accord entre OpenAI et Claude sur « controle » (mêmes outils)\n\n| | Confirmé ou non, identique | Statut identique (3 statuts) |\n|---|---|---|");
const a0 = accord(depart, "controle"), a1 = accord(regleA, "controle");
console.log(`| Départ (nul par construction) | ${pct(a0.confirme, sur.length)} | ${pct(a0.exact, sur.length)} |`);
console.log(`| Règle A | ${pct(a1.confirme, sur.length)} | ${pct(a1.exact, sur.length)} |`);

console.log("\n### Variabilité d'une exécution à l'autre (consignes inchangées pour ces critères): verdicts qui changent entre le départ et la règle A\n\n| Fournisseur | donnees | controle | dependance |\n|---|---|---|---|");
for (const p of fournisseurs) {
  const change = (id: (typeof IDS_CRITERES)[number]) => sur.filter((n) => depart[p]!.get(n)![id].statut !== regleA[p]!.get(n)![id].statut).length;
  console.log(`| ${p} | ${change("donnees")} | ${change("controle")} | ${change("dependance")} |`);
}

console.log("\n### Contre les autres sources, pour « controle » confirmé (mêmes outils)\n\n| Source | Outils où « controle » est retenu |\n|---|---|");
const retenu = (f: (n: string) => boolean) => sur.filter(f).length;
console.log(`| \`criteres\` (déduit par \`classify.ts\`) | ${pct(retenu((n) => outils.get(n)!.criteres.includes("controle")), sur.length)} |`);
console.log(`| \`evaluation_enrichie.criteres\` | ${pct(retenu((n) => outils.get(n)!.evaluation_enrichie!.criteres.includes("controle")), sur.length)} |`);
for (const p of fournisseurs) {
  console.log(`| ${p}, départ | ${pct(retenu((n) => depart[p]!.get(n)!.controle.statut === "confirme"), sur.length)} |`);
  console.log(`| ${p}, règle A | ${pct(retenu((n) => regleA[p]!.get(n)!.controle.statut === "confirme"), sur.length)} |`);
}
console.log("\n### Outils où les deux IA divergent encore avec la règle A\n");
const encore = sur.filter((n) => regleA.openai!.get(n)!.controle.statut !== regleA.claude!.get(n)!.controle.statut);
for (const n of encore) console.log(`- ${n} : openai ${regleA.openai!.get(n)!.controle.statut}, claude ${regleA.claude!.get(n)!.controle.statut}`);
if (!encore.length) console.log("(aucun)");
