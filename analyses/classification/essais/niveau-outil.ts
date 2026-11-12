// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import { readFileSync } from "node:fs";
import { evidences } from "../../../classify.ts";
const f = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const outils = f.outils.filter((o: any) => o.evaluation_enrichie);
type R = { nom: string; score: number; agree: boolean; conf: string; minEv: number; nFaibles: number; gap: number };
const rows: R[] = outils.map((o: any) => {
  const ev = evidences(o.description) as Record<string, number>;
  const evs = o.criteres.map((c: string) => ev[c]!);
  const tous = ["donnees", "controle", "dependance"].map((c) => ev[c]!).sort((a, b) => b - a);
  const gap = o.score < 3 ? tous[o.score - 1]! - tous[o.score]! : 99;
  return { nom: o.nom, score: o.score, agree: o.evaluation_enrichie.score === o.score, conf: o.confiance, minEv: Math.min(...evs), nFaibles: evs.filter((e: number) => e < 2).length, gap };
});
const tab = (cle: (r: R) => string) => {
  const m: Record<string, { n: number; a: number }> = {};
  for (const r of rows) { const k = cle(r); (m[k] ??= { n: 0, a: 0 }).n++; if (r.agree) m[k]!.a++; }
  return Object.entries(m).sort().map(([k, v]) => `${k}: ${v.a}/${v.n}`).join("  |  ");
};
console.log("par confiance v1  :", tab((r) => r.conf));
console.log("par minEv         :", tab((r) => String(r.minEv)));
console.log("par nb critères <2:", tab((r) => String(r.nFaibles)));
console.log("par score         :", tab((r) => String(r.score)));
const auc = (sc: (r: R) => number) => { let w = 0, n = 0; for (const a of rows.filter((r) => r.agree)) for (const b of rows.filter((r) => !r.agree)) { n++; w += sc(a) > sc(b) ? 1 : sc(a) === sc(b) ? 0.5 : 0; } return w / n; };
console.log("AUC accord (confiance v1):", auc((r) => ({ "élevée": 2, moyenne: 1, faible: 0 } as any)[r.conf]).toFixed(3));
console.log("AUC accord (-nFaibles):", auc((r) => -r.nFaibles).toFixed(3), " (minEv):", auc((r) => r.minEv).toFixed(3));
