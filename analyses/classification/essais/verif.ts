// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import { readFileSync } from "node:fs";
const v1 = JSON.parse(readFileSync(process.argv[2]!, "utf8")).outils, v2 = JSON.parse(readFileSync(process.argv[3]!, "utf8")).outils;
const memes = v1.every((o: any, i: number) => JSON.stringify(o.criteres) === JSON.stringify(v2[i].criteres));
const autre = v1.every((o: any, i: number) => JSON.stringify({ ...o, confiance: 0 }) === JSON.stringify({ ...v2[i], confiance: 0 }));
console.log("critères identiques:", memes, "| seule la confiance diffère:", autre);
const dist = (xs: any[]) => JSON.stringify(xs.reduce((m: any, o: any) => ((m[o.confiance] = (m[o.confiance] ?? 0) + 1), m), {}));
console.log("confiance v1 (60):", dist(v1)); console.log("confiance v2 (60):", dist(v2));
const rang: any = { faible: 0, moyenne: 1, "élevée": 2 };
const enr = (xs: any[]) => xs.filter((o) => o.evaluation_enrichie);
const bucket = (xs: any[]) => ["élevée", "moyenne", "faible"].map((c) => { const g = enr(xs).filter((o) => o.confiance === c); return `${c} ${g.filter((o) => o.evaluation_enrichie.score === o.score).length}/${g.length}`; }).join("  ");
console.log("accord IA par confiance v1:", bucket(v1)); console.log("accord IA par confiance v2:", bucket(v2));
const auc = (xs: any[]) => { const e = enr(xs), a = e.filter((o) => o.evaluation_enrichie.score === o.score), d = e.filter((o) => o.evaluation_enrichie.score !== o.score); let w = 0; for (const x of a) for (const y of d) w += rang[x.confiance] > rang[y.confiance] ? 1 : rang[x.confiance] === rang[y.confiance] ? 0.5 : 0; return (w / (a.length * d.length)).toFixed(3); };
console.log("AUC v1:", auc(v1), "AUC v2:", auc(v2));
const ch = v1.map((o: any, i: number) => [o.nom, o.confiance, v2[i].confiance]).filter(([, a, b]: any) => a !== b);
console.log("outils dont la confiance change:", ch.length);
const non = v1.filter((o: any) => !o.evaluation_enrichie).map((o: any, ) => o.nom); console.log("non enrichis (hors mesure):", non.join(", "));
