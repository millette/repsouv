// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Approche B: après enrichissement. Caractéristiques: tags, statut du code source, licence/dépôt présents, mots de la description longue.
// ATTENTION: tags et évaluation viennent du même appel à l'IA; ceci mesure leur cohérence, pas la vérité.
import { C, charger, eq, jaccard, mots, entrainer, prob, evidences, type T, type Crit } from "./lib.ts";
const outils = charger(process.argv[2]!);
const mode = process.argv[3] ?? "tags+source";
const tags = [...new Set(outils.flatMap((o) => o.tags))].sort();
const sources = ["libre", "partiel", "source-disponible", "proprietaire"];
const df = new Map<string, number>(); for (const o of outils) for (const m of new Set(mots(o.longue))) df.set(m, (df.get(m) ?? 0) + 1);
const vocab = [...df].filter(([, n]) => n >= 4 && n <= outils.length * 0.7).map(([m]) => m).sort(); const idx = new Map(vocab.map((m, i) => [m, i] as const));
const base = tags.length + sources.length + 3;
const dim = base + vocab.length + 3;
function vecteur(o: T): Map<number, number> {
  const x = new Map<number, number>();
  for (const t of o.tags) x.set(tags.indexOf(t), 1);
  x.set(tags.length + sources.indexOf(o.source), 1);
  x.set(tags.length + sources.length, o.licence ? 1 : 0); x.set(tags.length + sources.length + 1, o.repo ? 1 : 0); x.set(tags.length + sources.length + 2, o.score === 3 ? 1 : 0);
  if (mode.includes("longue")) for (const m of new Set(mots(o.longue))) if (idx.has(m)) x.set(base + idx.get(m)!, 1);
  const ev = evidences(o.description) as Record<Crit, number>;
  C.forEach((c, i) => x.set(base + vocab.length + i, Math.max(-1, Math.min(2, ev[c] / 3))));
  return x;
}
const X = outils.map(vecteur);
console.log(`n=${outils.length}, mode=${mode}, tags=${tags.length}, base v1 ${outils.filter((o) => eq(o.v1, o.ia)).length}/${outils.length}`);
for (const lambda of [1, 3, 10]) {
  const P = outils.map(() => [0, 0, 0]);
  for (let t = 0; t < outils.length; t++) {
    const tr = outils.map((_, i) => i).filter((i) => i !== t);
    C.forEach((c, k) => { const w = entrainer(tr.map((i) => X[i]!), tr.map((i) => (outils[i]!.ia.includes(c) ? 1 : 0)), dim, lambda); P[t]![k] = prob(w, X[t]!, dim); });
  }
  let seuil = 0, hyb = 0, sel = 0, js = 0;
  outils.forEach((o, i) => {
    const cl = C.map((c, k) => ({ c, p: P[i]![k]! })).sort((a, b) => b.p - a.p);
    const s = cl.filter((x) => x.p >= 0.5).map((x) => x.c); const h = o.v1.filter((c) => P[i]![C.indexOf(c)]! >= 0.5); const se = cl.slice(0, o.score).map((x) => x.c);
    if (eq(s, o.ia)) seuil++; if (eq(h, o.ia)) hyb++; if (eq(se, o.ia)) sel++; js += jaccard(h, o.ia);
  });
  console.log(`λ=${lambda}: exact seuil libre ${seuil}, hybride ${hyb}, sélection(k=score) ${sel} | Jaccard hybride ${(js / outils.length).toFixed(3)}`);
}
