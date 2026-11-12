// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Approche D: même modèle (texte+catégorie+indices v1, validation croisée un-contre-tous), mais seuil de retrait τ balayé,
// et τ choisi par validation croisée imbriquée (τ choisi sans le tout outil évalué).
import { C, charger, eq, jaccard, mots, entrainer, prob, evidences, type T, type Crit } from "./lib.ts";
const outils = charger(process.argv[2]!); const lambda = Number(process.argv[3] ?? 1); const mode = process.argv[4] ?? "texte+cat";
const cats = [...new Set(outils.map((o) => o.categorie))]; const tags = [...new Set(outils.flatMap((o) => o.tags))].sort(); const sources = ["libre", "partiel", "source-disponible", "proprietaire"];
const texte = (o: T) => (mode === "texte+cat" ? o.description : o.longue);
const df = new Map<string, number>(); for (const o of outils) for (const m of new Set(mots(texte(o)))) df.set(m, (df.get(m) ?? 0) + 1);
const vocab = [...df].filter(([, n]) => n >= 3 && n <= outils.length * 0.8).map(([m]) => m).sort(); const idx = new Map(vocab.map((m, i) => [m, i] as const));
const off = vocab.length; const dim = off + cats.length + tags.length + sources.length + 3;
const vec = (o: T) => { const x = new Map<number, number>(); for (const m of new Set(mots(texte(o)))) if (idx.has(m)) x.set(idx.get(m)!, 1);
  if (mode === "texte+cat") x.set(off + cats.indexOf(o.categorie), 1); else { for (const t of o.tags) x.set(off + cats.length + tags.indexOf(t), 1); x.set(off + cats.length + tags.length + sources.indexOf(o.source), 1); }
  const ev = evidences(o.description) as Record<Crit, number>; C.forEach((c, i) => x.set(dim - 3 + i, Math.max(-1, Math.min(2, ev[c] / 3)))); return x; };
const X = outils.map(vec);
const P = outils.map(() => [0, 0, 0]);
for (let t = 0; t < outils.length; t++) { const tr = outils.map((_, i) => i).filter((i) => i !== t);
  C.forEach((c, k) => { P[t]![k] = prob(entrainer(tr.map((i) => X[i]!), tr.map((i) => (outils[i]!.ia.includes(c) ? 1 : 0)), dim, lambda), X[t]!, dim); }); }
const garde = (i: number, tau: number) => outils[i]!.v1.filter((c) => P[i]![C.indexOf(c)]! >= tau);
const exact = (tau: number, idxs: number[]) => idxs.filter((i) => eq(garde(i, tau), outils[i]!.ia)).length;
const tous = outils.map((_, i) => i); const taus = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
console.log(`mode=${mode} λ=${lambda} n=${outils.length} base v1=${exact(0, tous)} exact`);
console.log("τ:", taus.join("  "), "\nexact:", taus.map((t) => exact(t, tous)).join("  "), "\nJaccard:", taus.map((t) => (tous.reduce((s, i) => s + jaccard(garde(i, t), outils[i]!.ia), 0) / tous.length).toFixed(2)).join(" "));
// τ imbriqué: pour chaque outil, choisir τ qui maximise l'accord exact sur les AUTRES outils (égalités: le plus petit τ, donc le plus proche de v1)
let nested = 0; const choix: number[] = [];
for (const t of tous) { const autres = tous.filter((i) => i !== t); let best = 0, bv = -1; for (const tau of taus) { const v = exact(tau, autres); if (v > bv) { bv = v; best = tau; } } choix.push(best); if (eq(garde(t, best), outils[t]!.ia)) nested++; }
console.log(`τ imbriqué: exact ${nested}/${outils.length} (v1: ${exact(0, tous)}) | τ choisis: ${JSON.stringify(choix.reduce((m: Record<string, number>, c) => ((m[c] = (m[c] ?? 0) + 1), m), {}))}`);
// Paires discordantes (v1 contre modèle avec τ imbriqué): outils gagnés / perdus
let gagnes = 0, perdus = 0;
tous.forEach((t, k) => { const v1ok = eq(outils[t]!.v1, outils[t]!.ia), mok = eq(garde(t, choix[k]!), outils[t]!.ia); if (!v1ok && mok) gagnes++; if (v1ok && !mok) perdus++; });
const n = gagnes + perdus; let p = 0; for (let i = Math.max(gagnes, perdus); i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = (c * (n - j)) / (j + 1); p += c; } p = Math.min(1, (2 * p) / 2 ** n);
console.log(`gagnés ${gagnes}, perdus ${perdus}; test des signes bilatéral p=${p.toFixed(2)}`);
