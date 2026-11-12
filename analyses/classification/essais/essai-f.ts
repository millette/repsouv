// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Essai F: suite de l'essai E. Règle R1 (« dependance » retiré si propriétaire sans auto-hébergement ni hors-ligne), puis
// règle R2 (« donnees » retiré quand il ne tient qu'à l'a priori « fournisseur canadien », indice < 2, et qu'aucune
// confirmation d'IA ne l'établit). Usage: nub analyses/classification/essais/essai-f.ts <copie de outils.json>
import { readFileSync } from "node:fs";
import { classer, evidences } from "../../../classify.ts";
import type { CritereId } from "../../../ids.ts";
import { charger, eq, jaccard, type Crit } from "./lib.ts";

const outils = charger(process.argv[2]!);
const D = "analyses/classification";
type Conf = Record<CritereId, { statut: string }>;
const lire = (f: string): Map<string, Conf> => new Map((JSON.parse(readFileSync(`${D}/${f}`, "utf8")).resultats as { nom: string; confirmation?: Conf }[]).filter((r) => r.confirmation).map((r) => [r.nom, r.confirmation!]));
const claude = lire("confirmations-claude.json"), openai = lire("confirmations-openai.json");
const conf = (m: Map<string, Conf>, n: string, c: Crit) => m.get(n)?.[c].statut === "confirme";
type O = (typeof outils)[number];
const v1 = (o: O) => classer(o.description, o.score).criteres as Crit[];
const sansDependance = (o: O) => o.source === "proprietaire" && !o.tags.includes("auto-hebergeable") && !o.tags.includes("hors-ligne");
const r1 = (o: O) => v1(o).filter((c) => !(c === "dependance" && sansDependance(o)));
const aPriori = (o: O) => (evidences(o.description) as Record<Crit, number>).donnees < 2;
const regles: Record<string, (o: O) => Crit[]> = {
  "v1": v1,
  "R1": r1,
  "R1 + R2 (Claude)": (o) => r1(o).filter((c) => !(c === "donnees" && aPriori(o) && !conf(claude, o.nom, c))),
  "R1 + R2 (OpenAI)": (o) => r1(o).filter((c) => !(c === "donnees" && aPriori(o) && !conf(openai, o.nom, c))),
  "R1 + R2 (l'une ou l'autre)": (o) => r1(o).filter((c) => !(c === "donnees" && aPriori(o) && !conf(claude, o.nom, c) && !conf(openai, o.nom, c))),
  "R1 + R2 (les deux)": (o) => r1(o).filter((c) => !(c === "donnees" && aPriori(o) && !(conf(claude, o.nom, c) && conf(openai, o.nom, c)))),
  "R1 + « donnees » retiré si a priori seul (sans IA)": (o) => r1(o).filter((c) => !(c === "donnees" && aPriori(o))),
  "R2 (Claude) seul": (o) => v1(o).filter((c) => !(c === "donnees" && aPriori(o) && !conf(claude, o.nom, c))),
};
console.log(`n=${outils.length}; accord avec evaluation_enrichie.criteres`);
for (const [nom, r] of Object.entries(regles)) {
  let exact = 0, jac = 0, moins = 0, plus = 0, gagnes = 0, perdus = 0;
  for (const o of outils) { const s = r(o), ok = eq(s, o.ia), ok1 = eq(v1(o), o.ia); if (ok) exact++; if (ok && !ok1) gagnes++; if (!ok && ok1) perdus++; jac += jaccard(s, o.ia); if (s.length < o.ia.length) moins++; if (s.length > o.ia.length) plus++; }
  console.log(`${String(exact).padStart(2)}/57  Jaccard ${(jac / outils.length).toFixed(3)}  trop peu ${moins}, trop ${plus}  (vs v1: +${gagnes} −${perdus})  ${nom}`);
}
// Par score: où sont les gains de R1 + R2 (Claude)?
const r = regles["R1 + R2 (Claude)"]!;
const par: Record<string, [number, number]> = {};
for (const o of outils) { const k = `score ${o.score}`; par[k] ??= [0, 0]; par[k]![1]++; if (eq(r(o), o.ia)) par[k]![0]++; }
console.log("R1 + R2 (Claude), par score:", JSON.stringify(par));
