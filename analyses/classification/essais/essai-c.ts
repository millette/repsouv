// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Approche C: bornes. (1) « retirer les critères retenus sans indice »; (2) nombre de critères connu (oracle) + classement par indices v1.
import { C, charger, eq, jaccard, evidences, type Crit } from "./lib.ts";
const outils = charger(process.argv[2]!);
const ORDRE: Crit[] = ["donnees", "controle", "dependance"];
let base = 0, sansIndice = 0, oracle = 0, oracleSansTri = 0; const mism: string[] = [];
for (const o of outils) {
  const ev = evidences(o.description) as Record<Crit, number>;
  if (eq(o.v1, o.ia)) base++;
  const garde = o.v1.filter((c) => ev[c] >= 2);
  if (eq(garde, o.ia)) sansIndice++;
  const classes = [...ORDRE].sort((a, b) => ev[b] - ev[a] || ORDRE.indexOf(a) - ORDRE.indexOf(b));
  const k = o.ia.length;
  if (eq(classes.slice(0, k), o.ia)) oracle++; else mism.push(`${o.nom} (s=${o.score}, IA=${o.ia.join("+") || "aucun"}, classement=${classes.map((c) => c + ":" + ev[c]).join(" ")})`);
}
console.log(`exact: v1 ${base}/57 | retirer les critères sans indice ${sansIndice}/57 | nombre IA connu + classement v1 ${oracle}/57`);
console.log("non retrouvés avec le bon nombre:", mism.length); mism.forEach((m) => console.log("  ", m));
