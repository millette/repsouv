// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import { readFileSync } from "node:fs";
import { evidences } from "../../../classify.ts";
export const C = ["donnees", "controle", "dependance"] as const;
export type Crit = (typeof C)[number];
export interface T { nom: string; categorie: string; description: string; score: number; v1: Crit[]; ia: Crit[]; iaScore: number; tags: string[]; source: string; licence: string | null; repo: string | null; longue: string }
export function charger(chemin: string): T[] {
  const f = JSON.parse(readFileSync(chemin, "utf8"));
  return f.outils.filter((o: any) => o.evaluation_enrichie).map((o: any) => ({ nom: o.nom, categorie: o.categorie, description: o.description, score: o.score, v1: o.criteres, ia: o.evaluation_enrichie.criteres, iaScore: o.evaluation_enrichie.score, tags: o.tags ?? [], source: o.source, licence: o.licence, repo: o.repo, longue: o.description_longue ?? "" }));
}
export const eq = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
export const jaccard = (a: string[], b: string[]) => { const u = new Set([...a, ...b]).size; return u ? a.filter((x) => b.includes(x)).length / u : 1; };
export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'");
export const mots = (s: string) => norm(s).split(/[^a-z0-9']+/).filter((m) => m.length > 2);
export { evidences };
// Régression logistique L2 (descente de gradient, lot complet). X: vecteurs creux {indice: valeur}.
export function entrainer(X: Map<number, number>[], y: number[], dim: number, lambda: number, iter = 300, lr = 0.3) {
  const w = new Float64Array(dim + 1);
  for (let k = 0; k < iter; k++) {
    const g = new Float64Array(dim + 1);
    for (let i = 0; i < X.length; i++) {
      let z = w[dim]!; for (const [j, v] of X[i]!) z += w[j]! * v;
      const p = 1 / (1 + Math.exp(-z)), e = p - y[i]!;
      for (const [j, v] of X[i]!) g[j] = g[j]! + e * v; g[dim] = g[dim]! + e;
    }
    for (let j = 0; j < dim; j++) w[j] = w[j]! - lr * (g[j]! / X.length + (lambda * w[j]!) / X.length);
    w[dim] = w[dim]! - lr * (g[dim]! / X.length);
  }
  return w;
}
export const prob = (w: Float64Array, x: Map<number, number>, dim: number) => { let z = w[dim]!; for (const [j, v] of x) z += w[j]! * v; return 1 / (1 + Math.exp(-z)); };
