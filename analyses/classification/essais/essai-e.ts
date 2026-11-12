// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Essai E: combiner le classement de classify.ts avec les confirmations critère par critère (confirmer.ts, OpenAI et Claude,
// départ et règle A) et les données d'enrichissement, pour retrouver evaluation_enrichie.criteres. Règles sans paramètre ajusté.
// Usage: nub analyses/classification/essais/essai-e.ts <copie de outils.json>
import { readFileSync } from "node:fs";
import { classer } from "../../../classify.ts";
import type { CritereId } from "../../../ids.ts";
import { C, charger, eq, jaccard, type Crit } from "./lib.ts";

const outils = charger(process.argv[2]!);
const D = "analyses/classification";
type Conf = Record<CritereId, { statut: string }>;
const lire = (f: string): Map<string, Conf> => new Map((JSON.parse(readFileSync(`${D}/${f}`, "utf8")).resultats as { nom: string; confirmation?: Conf }[]).filter((r) => r.confirmation).map((r) => [r.nom, r.confirmation!]));
const openai = lire("confirmations-openai.json"), claude = lire("confirmations-claude.json");
const openaiA = lire("confirmations-openai-regle-a.json"), claudeA = lire("confirmations-claude-regle-a.json");
const avecA = (base: Map<string, Conf>, a: Map<string, Conf>) => new Map([...base].map(([n, c]) => [n, a.has(n) ? { ...c, controle: a.get(n)!.controle } : c]));
const openaiR = avecA(openai, openaiA), claudeR = avecA(claude, claudeA);
const statut = (m: Map<string, Conf>, n: string, c: Crit) => m.get(n)?.[c].statut ?? "absent";

type Regle = (o: (typeof outils)[number]) => Crit[];
const v1 = (o: (typeof outils)[number]) => classer(o.description, o.score).criteres as Crit[];
const topK = (o: (typeof outils)[number], k: number) => v1(o).slice(0, Math.max(0, Math.min(k, o.score)));
const nbConf = (m: Map<string, Conf>, n: string) => C.filter((c) => statut(m, n, c) === "confirme").length;
const regles: Record<string, Regle> = {
  "v1 (classify.ts)": v1,
  "v1 sans les critères infirmés par Claude": (o) => v1(o).filter((c) => statut(claude, o.nom, c) !== "infirme"),
  "v1 sans les critères infirmés par OpenAI": (o) => v1(o).filter((c) => statut(openai, o.nom, c) !== "infirme"),
  "v1 sans les critères infirmés par l'une ou l'autre": (o) => v1(o).filter((c) => statut(claude, o.nom, c) !== "infirme" && statut(openai, o.nom, c) !== "infirme"),
  "v1 ∩ confirmés par Claude": (o) => v1(o).filter((c) => statut(claude, o.nom, c) === "confirme"),
  "v1 ∩ confirmés par Claude (règle A)": (o) => v1(o).filter((c) => statut(claudeR, o.nom, c) === "confirme"),
  "v1 ∩ confirmés par OpenAI": (o) => v1(o).filter((c) => statut(openai, o.nom, c) === "confirme"),
  "v1 ∩ confirmés par OpenAI (règle A)": (o) => v1(o).filter((c) => statut(openaiR, o.nom, c) === "confirme"),
  "v1 ∩ confirmés par les deux (règle A)": (o) => v1(o).filter((c) => statut(claudeR, o.nom, c) === "confirme" && statut(openaiR, o.nom, c) === "confirme"),
  "v1 ∩ confirmés par l'une ou l'autre (règle A)": (o) => v1(o).filter((c) => statut(claudeR, o.nom, c) === "confirme" || statut(openaiR, o.nom, c) === "confirme"),
  "v1 ∩ (confirmés par les deux, ou par l'une sans indétermination de l'autre)": (o) => v1(o).filter((c) => { const a = statut(claudeR, o.nom, c), b = statut(openaiR, o.nom, c); return a === "confirme" && b === "confirme"; }),
  "top-k, k = nb confirmés par Claude (règle A)": (o) => topK(o, nbConf(claudeR, o.nom)),
  "top-k, k = nb confirmés par OpenAI (règle A)": (o) => topK(o, nbConf(openaiR, o.nom)),
  "top-k, k = max des deux (règle A)": (o) => topK(o, Math.max(nbConf(claudeR, o.nom), nbConf(openaiR, o.nom))),
  "top-k, k = min des deux (règle A)": (o) => topK(o, Math.min(nbConf(claudeR, o.nom), nbConf(openaiR, o.nom))),
  "v1 sans « dependance » si propriétaire sans auto-hébergement": (o) => v1(o).filter((c) => !(c === "dependance" && o.source === "proprietaire" && !o.tags.includes("auto-hebergeable") && !o.tags.includes("hors-ligne"))),
  "v1 ∩ Claude (règle A), sans « dependance » si propriétaire sans auto-hébergement": (o) => v1(o).filter((c) => statut(claudeR, o.nom, c) === "confirme" && !(c === "dependance" && o.source === "proprietaire" && !o.tags.includes("auto-hebergeable") && !o.tags.includes("hors-ligne"))),
};
console.log(`n=${outils.length}; accord avec evaluation_enrichie.criteres`);
const lignes = Object.entries(regles).map(([nom, r]) => {
  let exact = 0, jac = 0, moins = 0, plus = 0;
  for (const o of outils) { const s = r(o); if (eq(s, o.ia)) exact++; jac += jaccard(s, o.ia); if (s.length < o.ia.length) moins++; if (s.length > o.ia.length) plus++; }
  return { nom, exact, jac: jac / outils.length, moins, plus };
}).sort((a, b) => b.exact - a.exact);
for (const l of lignes) console.log(`${String(l.exact).padStart(2)}/57  Jaccard ${l.jac.toFixed(3)}  (trop peu: ${l.moins}, trop: ${l.plus})  ${l.nom}`);
