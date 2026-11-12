// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import { readFileSync } from "node:fs";
import { evidences } from "../../../classify.ts";
const f = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const outils = f.outils.filter((o: any) => o.evaluation_enrichie);
const niv = { "élevée": 2, moyenne: 1, faible: 0 } as Record<string, number>;
type R = { agree: boolean; A: number; B: number; C: number };
const rows: R[] = outils.map((o: any) => {
  const ev = evidences(o.description) as Record<string, number>;
  const nF = o.criteres.filter((c: string) => ev[c]! < 2).length;
  const B = nF === 0 ? 2 : nF === 1 ? 1 : 0;
  const A = niv[o.confiance]!;
  return { agree: o.evaluation_enrichie.score === o.score, A, B, C: Math.min(A, B) };
});
const auc = (rs: R[], k: "A" | "B" | "C") => { let w = 0, n = 0; for (const a of rs.filter((r) => r.agree)) for (const b of rs.filter((r) => !r.agree)) { n++; w += a[k] > b[k] ? 1 : a[k] === b[k] ? 0.5 : 0; } return n ? w / n : NaN; };
const bucket = (k: "A" | "B" | "C") => [2, 1, 0].map((l) => { const g = rows.filter((r) => r[k] === l); return `${["faible", "moyenne", "élevée"][l]}: ${g.filter((r) => r.agree).length}/${g.length}`; }).join("  ");
for (const k of ["A", "B", "C"] as const) console.log(k, "AUC", auc(rows, k).toFixed(3), "|", bucket(k));
// bootstrap de la différence d'AUC B-A et C-A (graine fixe)
let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const diff = (k: "B" | "C") => { const d: number[] = []; for (let i = 0; i < 4000; i++) { const rs = rows.map(() => rows[Math.floor(rnd() * rows.length)]!); const a = auc(rs, "A"), b = auc(rs, k); if (!isNaN(a) && !isNaN(b)) d.push(b - a); } d.sort((x, y) => x - y); return `moy ${(d.reduce((x, y) => x + y, 0) / d.length).toFixed(3)} IC95% [${d[Math.floor(d.length * 0.025)]!.toFixed(3)}; ${d[Math.floor(d.length * 0.975)]!.toFixed(3)}] part>0: ${(d.filter((x) => x > 0).length / d.length).toFixed(2)}`; };
console.log("B-A:", diff("B")); console.log("C-A:", diff("C"));
