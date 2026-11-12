// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Jetons et prix des appels aux modèles d'IA: compte des jetons d'un appel, prix par million de jetons, coût en dollars.
// Les prix viennent de la page de tarifs d'OpenAI consultée le 2026-11-12; ils servent aux estimations
// de update.ts (--dry-run et premier import) et au coût rapporté par confirmer.ts. Un modèle absent de PRIX donne un coût inconnu.

/** Jetons d'un appel; `entree` comprend les jetons en cache (lus ou écrits). */
export interface Usage {
  entree: number;
  sortie: number;
  cache_lecture: number;
  cache_ecriture: number;
}
export const USAGE_VIDE: Readonly<Usage> = { entree: 0, sortie: 0, cache_lecture: 0, cache_ecriture: 0 };

export const additionner = (a: Usage, b: Usage): Usage => ({
  entree: a.entree + b.entree,
  sortie: a.sortie + b.sortie,
  cache_lecture: a.cache_lecture + b.cache_lecture,
  cache_ecriture: a.cache_ecriture + b.cache_ecriture,
});

/** Les jetons rapportés par l'API Responses d'OpenAI (`usage` du corps de la réponse); vide si absents. */
export function usageDepuisOpenAI(corps: { usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } } }): Usage {
  const u = corps.usage;
  if (!u) return { ...USAGE_VIDE };
  return { entree: u.input_tokens ?? 0, sortie: u.output_tokens ?? 0, cache_lecture: u.input_tokens_details?.cached_tokens ?? 0, cache_ecriture: 0 };
}

/** Prix en dollars par million de jetons. */
export interface Prix {
  entree: number;
  cache_lecture: number;
  sortie: number;
}
export const PRIX: Readonly<Record<string, Prix>> = {
  "gpt-6-astra": { entree: 10, cache_lecture: 1, sortie: 50 },
  "gpt-6.1-sol": { entree: 2, cache_lecture: 0.1, sortie: 10 },
  "gpt-6.1-terra": { entree: 1, cache_lecture: 0.05, sortie: 5 },
  "gpt-6-luna": { entree: 0.1, cache_lecture: 0.01, sortie: 0.5 },
};

/** Coût d'un appel OpenAI: entrées hors cache, entrées en cache et sorties (les jetons de raisonnement sont facturés comme sorties). */
export function coutOpenAI(usage: Usage, prix: Prix): number {
  return ((usage.entree - usage.cache_lecture) * prix.entree + usage.cache_lecture * prix.cache_lecture + usage.sortie * prix.sortie) / 1e6;
}

/** Coût en dollars pour un modèle, ou null si son prix est inconnu. */
export const coutPour = (usage: Usage, modele: string): number | null => (PRIX[modele] ? coutOpenAI(usage, PRIX[modele]!) : null);

/** Nombres en français, avec des espaces ordinaires (les espaces insécables de la locale gênent la recherche dans un terminal). */
const espaces = (s: string) => s.replace(/[  ]/g, " ");
const nombre = (n: number) => espaces(n.toLocaleString("fr-CA"));
export const dollars = (n: number) => `${espaces(n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} $`;

// ---------- jetons par modèle (le principal et son repli n'ont pas le même prix) ----------

/** Jetons consommés par modèle au cours d'une exécution. */
export type UsagesParModele = ReadonlyMap<string, Usage>;

/** Un nouvel état avec les jetons ajoutés au modèle (l'ancien état reste intact, pour mesurer une phase par différence). */
export function ajouterUsage(usages: UsagesParModele, modele: string, u: Usage): UsagesParModele {
  return new Map(usages).set(modele, additionner(usages.get(modele) ?? USAGE_VIDE, u));
}

/** Ce qui s'est ajouté entre deux états, modèle par modèle (les modèles sans nouveauté sont omis). */
export function soustraireUsages(apres: UsagesParModele, avant: UsagesParModele): UsagesParModele {
  const diff = new Map<string, Usage>();
  for (const [modele, u] of apres) {
    const a = avant.get(modele) ?? USAGE_VIDE;
    const d = { entree: u.entree - a.entree, sortie: u.sortie - a.sortie, cache_lecture: u.cache_lecture - a.cache_lecture, cache_ecriture: u.cache_ecriture - a.cache_ecriture };
    if (d.entree || d.sortie || d.cache_lecture || d.cache_ecriture) diff.set(modele, d);
  }
  return diff;
}

/** Coût total, chaque modèle à son prix; null dès qu'un modèle a un prix inconnu. */
export function coutTotal(usages: UsagesParModele): number | null {
  let total = 0;
  for (const [modele, u] of usages) {
    const c = coutPour(u, modele);
    if (c === null) return null;
    total += c;
  }
  return total;
}

/** Comme formaterCout, mais pour plusieurs modèles: le total des jetons, le coût total et le coût par modèle. */
export function formaterCouts(usages: UsagesParModele): string {
  if (usages.size === 0) return "aucun appel";
  if (usages.size === 1) {
    const [modele, u] = [...usages][0]!;
    return formaterCout(u, modele);
  }
  let total: Usage = { ...USAGE_VIDE };
  for (const u of usages.values()) total = additionner(total, u);
  const cache = total.cache_lecture ? ` (dont ${nombre(total.cache_lecture)} en cache)` : "";
  const inconnus = [...usages.keys()].filter((m) => !PRIX[m]);
  const detail = inconnus.length
    ? `prix inconnu pour ${inconnus.join(", ")}`
    : `≈ ${dollars(coutTotal(usages)!)} (${[...usages].map(([m, u]) => `${m} ${dollars(coutPour(u, m)!)}`).join("; ")})`;
  return `${nombre(total.entree)} jetons en entrée${cache}, ${nombre(total.sortie)} en sortie, ${detail}`;
}

/** « 12 345 jetons en entrée (dont 1 000 en cache), 678 en sortie, ≈ 0,15 $ (modele) », ou le prix inconnu. */
export function formaterCout(usage: Usage, modele: string): string {
  const cache = usage.cache_lecture ? ` (dont ${nombre(usage.cache_lecture)} en cache)` : "";
  const cout = coutPour(usage, modele);
  return `${nombre(usage.entree)} jetons en entrée${cache}, ${nombre(usage.sortie)} en sortie, ${cout === null ? `prix inconnu pour ${modele}` : `≈ ${dollars(cout)} (${modele})`}`;
}
