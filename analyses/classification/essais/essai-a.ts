// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Approche A: modèle texte (mots + catégorie + indices v1) appris par critère, évalué en validation croisée « un contre tous ».
import { C, charger, eq, jaccard, mots, entrainer, prob, evidences, type T, type Crit } from "./lib.ts";
const outils = charger(process.argv[2]!);
const mode = process.argv[3] ?? "texte";
const df = new Map<string, number>(); const cats = [...new Set(outils.map((o) => o.categorie))];
for (const o of outils) for (const m of new Set(mots(o.description))) df.set(m, (df.get(m) ?? 0) + 1);
const vocab = [...df].filter(([, n]) => n >= 3 && n <= outils.length * 0.8).map(([m]) => m).sort();
const idx = new Map(vocab.map((m, i) => [m, i] as const));
const dim = vocab.length + cats.length + 3;
function vecteur(o: T): Map<number, number> {
  const x = new Map<number, number>();
  if (mode !== "indices") for (const m of new Set(mots(o.description))) if (idx.has(m)) x.set(idx.get(m)!, 1);
  if (mode === "texte+cat" || mode === "indices+cat") x.set(vocab.length + cats.indexOf(o.categorie), 1);
  const ev = evidences(o.description) as Record<Crit, number>;
  C.forEach((c, i) => x.set(vocab.length + cats.length + i, Math.max(-1, Math.min(2, ev[c] / 3))));
  return x;
}
const X = outils.map(vecteur);
const lambdas = [1, 3, 10];
const base = outils.filter((o) => eq(o.v1, o.ia)).length;
console.log(`n=${outils.length}, base v1: ${base}/${outils.length} exact, Jaccard ${(outils.reduce((s, o) => s + jaccard(o.v1, o.ia), 0) / outils.length).toFixed(3)}, mode=${mode}, vocabulaire=${vocab.length}`);
for (const lambda of lambdas) {
  const P: number[][] = outils.map(() => [0, 0, 0]);
  for (let t = 0; t < outils.length; t++) {
    const tr = outils.map((_, i) => i).filter((i) => i !== t);
    C.forEach((c, k) => {
      const y = tr.map((i) => (outils[i]!.ia.includes(c) ? 1 : 0));
      const w = entrainer(tr.map((i) => X[i]!), y, dim, lambda);
      P[t]![k] = prob(w, X[t]!, dim);
    });
  }
  const res = { selection: 0, seuil: 0, hybride: 0 }; const jac = { selection: 0, seuil: 0, hybride: 0 };
  outils.forEach((o, i) => {
    const classes = C.map((c, k) => ({ c, p: P[i]![k]! })).sort((a, b) => b.p - a.p);
    const sel = classes.slice(0, o.score).map((x) => x.c);
    const seuil = classes.filter((x) => x.p >= 0.5).map((x) => x.c);
    const hyb = o.v1.filter((c) => P[i]![C.indexOf(c)]! >= 0.5);
    for (const [k, v] of [["selection", sel], ["seuil", seuil], ["hybride", hyb]] as const) { if (eq(v, o.ia)) res[k]++; jac[k] += jaccard(v, o.ia); }
  });
  console.log(`λ=${lambda}: exact sélection(k=score) ${res.selection}, seuil libre ${res.seuil}, hybride(v1 puis p≥.5) ${res.hybride} | Jaccard ${(jac.selection / outils.length).toFixed(3)}, ${(jac.seuil / outils.length).toFixed(3)}, ${(jac.hybride / outils.length).toFixed(3)}`);
}
