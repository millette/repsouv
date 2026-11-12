// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import { readFileSync } from "node:fs";
import { evidences } from "../../../classify.ts";
const f = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const crit = process.argv[3]!;
for (const o of f.outils.filter((o: any) => o.evaluation_enrichie && o.criteres.includes(crit))) {
  const ev = evidences(o.description)[crit as "donnees"];
  const ok = o.evaluation_enrichie.criteres.includes(crit);
  console.log(`${ok ? "OK " : "NON"} s=${o.score} ev=${ev} src=${o.source} ${o.nom} | ${o.description.slice(0, 150)}`);
}
