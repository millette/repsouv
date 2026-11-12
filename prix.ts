// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Jetons et prix des appels aux modèles d'IA: compte des jetons d'un appel, prix par million de jetons, coût en dollars.
// Les prix viennent des pages de tarifs d'OpenAI et d'Anthropic consultées le 2026-11-12; ils servent aux estimations
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
  "claude-fable-5-2": { entree: 8, cache_lecture: 0.2, sortie: 40 },
  "claude-opus-5-5": { entree: 4, cache_lecture: 0.2, sortie: 20 },
  "claude-sonnet-5-5": { entree: 2, cache_lecture: 0.1, sortie: 10 },
  "claude-haiku-5-5": { entree: 0.1, cache_lecture: 0.01, sortie: 0.5 },
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

/** « 12 345 jetons en entrée (dont 1 000 en cache), 678 en sortie, ≈ 0,15 $ (modele) », ou le prix inconnu. */
export function formaterCout(usage: Usage, modele: string): string {
  const cache = usage.cache_lecture ? ` (dont ${nombre(usage.cache_lecture)} en cache)` : "";
  const cout = coutPour(usage, modele);
  return `${nombre(usage.entree)} jetons en entrée${cache}, ${nombre(usage.sortie)} en sortie, ${cout === null ? `prix inconnu pour ${modele}` : `≈ ${dollars(cout)} (${modele})`}`;
}
