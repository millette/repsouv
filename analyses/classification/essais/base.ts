// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import { readFileSync } from "node:fs";
const f = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const C = ["donnees", "controle", "dependance"];
const outils = f.outils.filter((o: any) => o.evaluation_enrichie);
const eq = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
console.log("enrichis:", outils.length);
let exact = 0, jacc = 0;
const parScore: Record<number, { n: number; exact: number }> = {};
for (const o of outils) {
  const a: string[] = o.criteres, b: string[] = o.evaluation_enrichie.criteres;
  const inter = a.filter((x) => b.includes(x)).length, union = new Set([...a, ...b]).size;
  jacc += inter / union; if (eq(a, b)) exact++;
  const p = (parScore[o.score] ??= { n: 0, exact: 0 }); p.n++; if (eq(a, b)) p.exact++;
}
console.log(`accord exact: ${exact}/${outils.length}, Jaccard moyen: ${(jacc / outils.length).toFixed(3)}`);
console.log("par score répertoire:", JSON.stringify(parScore));
for (const c of C) {
  let tp = 0, fp = 0, fn = 0;
  for (const o of outils) { const a = o.criteres.includes(c), b = o.evaluation_enrichie.criteres.includes(c); if (a && b) tp++; else if (a) fp++; else if (b) fn++; }
  console.log(c, `déduit=${tp + fp} enrichi=${tp + fn} tp=${tp} fp=${fp} fn=${fn} P=${(tp / (tp + fp)).toFixed(2)} R=${(tp / (tp + fn)).toFixed(2)}`);
}
const memeScore = outils.filter((o: any) => o.evaluation_enrichie.score === o.score);
console.log("score enrichi = score répertoire:", memeScore.length, "dont ensemble identique:", memeScore.filter((o: any) => eq(o.criteres, o.evaluation_enrichie.criteres)).length);
const dist: Record<string, number> = {};
for (const o of outils) { const k = `${o.score}->${o.evaluation_enrichie.score}`; dist[k] = (dist[k] ?? 0) + 1; }
console.log("score répertoire -> enrichi:", JSON.stringify(dist));
