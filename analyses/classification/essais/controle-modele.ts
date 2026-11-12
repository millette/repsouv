// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Contrôle de validité des modèles A/B: apprentissage (accord sur l'entraînement) et AUC en validation croisée, critères retenus par classify.ts seulement.
import { C, charger, mots, entrainer, prob, evidences, type T, type Crit } from "./lib.ts";
const outils = charger(process.argv[2]!);
const mode = process.argv[3]!; // "texte+cat" | "tags+source+longue"
const cats = [...new Set(outils.map((o) => o.categorie))]; const tags = [...new Set(outils.flatMap((o) => o.tags))].sort(); const sources = ["libre", "partiel", "source-disponible", "proprietaire"];
const texte = (o: T) => (mode === "texte+cat" ? o.description : o.longue);
const df = new Map<string, number>(); for (const o of outils) for (const m of new Set(mots(texte(o)))) df.set(m, (df.get(m) ?? 0) + 1);
const vocab = [...df].filter(([, n]) => n >= 3 && n <= outils.length * 0.8).map(([m]) => m).sort(); const idx = new Map(vocab.map((m, i) => [m, i] as const));
const off = vocab.length; const dim = off + cats.length + tags.length + sources.length + 3;
const vec = (o: T) => { const x = new Map<number, number>(); for (const m of new Set(mots(texte(o)))) if (idx.has(m)) x.set(idx.get(m)!, 1);
  if (mode === "texte+cat") x.set(off + cats.indexOf(o.categorie), 1); else { for (const t of o.tags) x.set(off + cats.length + tags.indexOf(t), 1); x.set(off + cats.length + tags.length + sources.indexOf(o.source), 1); }
  const ev = evidences(o.description) as Record<Crit, number>; C.forEach((c, i) => x.set(dim - 3 + i, Math.max(-1, Math.min(2, ev[c] / 3)))); return x; };
const X = outils.map(vec); const lambda = 1;
let acc = 0, nTr = 0; const pos: number[] = [], neg: number[] = [], posEv: number[] = [], negEv: number[] = [];
C.forEach((c, k) => {
  const y = outils.map((o) => (o.ia.includes(c) ? 1 : 0)); const wAll = entrainer(X, y, dim, lambda);
  X.forEach((x, i) => { acc += (prob(wAll, x, dim) >= 0.5 ? 1 : 0) === y[i]! ? 1 : 0; nTr++; });
  outils.forEach((o, t) => { if (!o.v1.includes(c)) return;
    const tr = outils.map((_, i) => i).filter((i) => i !== t); const w = entrainer(tr.map((i) => X[i]!), tr.map((i) => y[i]!), dim, lambda); const p = prob(w, X[t]!, dim);
    const ev = (evidences(o.description) as Record<Crit, number>)[c]; (y[t] ? pos : neg).push(p); (y[t] ? posEv : negEv).push(ev); });
});
const auc = (a: number[], b: number[]) => { let w = 0; for (const x of a) for (const y of b) w += x > y ? 1 : x === y ? 0.5 : 0; return w / (a.length * b.length); };
console.log(`${mode}: précision sur l'entraînement ${(acc / nTr).toFixed(3)} (apprend bien) | AUC validation croisée, critères retenus: modèle ${auc(pos, neg).toFixed(3)} vs indices v1 ${auc(posEv, negEv).toFixed(3)} (n+=${pos.length}, n-=${neg.length})`);
