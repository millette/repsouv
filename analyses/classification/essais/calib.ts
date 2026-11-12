// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import { readFileSync } from "node:fs";
import { evidences } from "../../../classify.ts";
const f = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const outils = f.outils.filter((o: any) => o.evaluation_enrichie);
// confiance v1 vs désaccord avec l'IA
const par: Record<string, { n: number; accord: number }> = {};
for (const o of outils) {
  const k = o.confiance; const p = (par[k] ??= { n: 0, accord: 0 }); p.n++;
  if (o.criteres.length === o.evaluation_enrichie.criteres.length) p.accord++;
}
console.log("confiance v1 -> accord de comptage avec l'IA:", JSON.stringify(par));
// par critère retenu: évidence (poids) selon confirmé / non confirmé, score 2 seulement
const rows: { c: string; ev: number; ok: boolean; score: number }[] = [];
for (const o of outils) {
  const ev = evidences(o.description);
  for (const c of o.criteres) rows.push({ c, ev: ev[c as keyof typeof ev], ok: o.evaluation_enrichie.criteres.includes(c), score: o.score });
}
const resume = (xs: typeof rows) => {
  const m: Record<string, number[]> = {};
  for (const r of xs) (m[`${r.c}:${r.ok ? "confirmé" : "non confirmé"}`] ??= []).push(r.ev);
  for (const [k, v] of Object.entries(m).sort()) console.log(k.padEnd(26), "n=" + v.length, "ev moyen=" + (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2), "valeurs:", JSON.stringify([...new Set(v)].sort((a, b) => a - b)));
};
console.log("--- score 2 et 3");
resume(rows);
console.log("--- score 2 seulement");
resume(rows.filter((r) => r.score === 2));
// AUC globale (ev retenu confirmé vs non)
const pos = rows.filter((r) => r.ok).map((r) => r.ev), neg = rows.filter((r) => !r.ok).map((r) => r.ev);
let w = 0; for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0;
console.log("AUC (évidence v1 sépare confirmé/non confirmé):", (w / (pos.length * neg.length)).toFixed(3), "n+/n-:", pos.length, neg.length);
