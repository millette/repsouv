// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import { readFileSync } from "node:fs";
import { evidences } from "../../../classify.ts";
const f = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const niv = ["faible", "moyenne", "élevée"];
const trans: Record<string, string[]> = {};
for (const o of f.outils) {
  const ev = evidences(o.description) as Record<string, number>;
  const nF = o.criteres.filter((c: string) => ev[c]! < 2).length;
  const B = nF === 0 ? 2 : nF === 1 ? 1 : 0;
  const A = niv.indexOf(o.confiance);
  const k = `${niv[A]}->${niv[Math.min(A, B)]} (score ${o.score})`;
  (trans[k] ??= []).push(`${o.nom}: ${o.description.slice(0, 110)}`);
}
for (const [k, v] of Object.entries(trans).sort()) console.log(`${k}: ${v.length}`, v.length < 3 ? "\n   " + v.join("\n   ") : "\n   ex: " + v[0]);
