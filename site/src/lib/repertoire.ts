// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Ce que les pages tirent des données, calculé au build et jamais écrit: outils actifs, groupes par catégorie,
// statut du code source, outils apparentés, source de chaque outil.
import { identifiant } from "./adresses.ts";
import type { Categorie, OutilClasse, Source } from "./donnees.ts";

export const STATUTS = ["libre", "partiel", "source-disponible", "proprietaire", "non-enrichi"] as const;
export type Statut = (typeof STATUTS)[number];

/** Les outils du répertoire courant: un outil retiré n'a ni carte ni fiche. */
export function outilsActifs(outils: readonly OutilClasse[]): OutilClasse[] {
  return outils.filter((o) => !o.removed);
}

export function estEnrichi(outil: OutilClasse): boolean {
  return outil.enrichi_le !== undefined;
}

/** Statut du code source (champ `source`, produit par IA), ou « non-enrichi » quand l'outil n'en a pas. */
export function statutDe(outil: OutilClasse): Statut {
  return outil.source ?? "non-enrichi";
}

export interface Groupe {
  categorie: Categorie;
  outils: OutilClasse[];
}

/** Les catégories dans l'ordre des données, chacune avec ses outils actifs; une catégorie sans outil est omise. */
export function groupesParCategorie(categories: readonly Categorie[], actifs: readonly OutilClasse[]): Groupe[] {
  return categories.map((categorie) => ({ categorie, outils: actifs.filter((o) => o.categorie === categorie.id) })).filter((g) => g.outils.length > 0);
}

export interface Apparente {
  nom: string;
  /** Identifiant de la fiche, quand le nom est celui d'un outil actif; absent pour un logiciel hors répertoire. */
  id?: string;
}

/** Les outils de `voir_aussi`: un lien vers la fiche quand elle existe, le nom seul sinon (pas de lien mort). */
export function apparentes(outil: OutilClasse, actifs: readonly OutilClasse[]): Apparente[] {
  const noms = new Set(actifs.map((o) => o.nom));
  return (outil.voir_aussi ?? []).map((nom) => (noms.has(nom) ? { nom, id: identifiant(nom) } : { nom }));
}

export function sourceDe(outil: OutilClasse, sources: readonly Source[]): Source {
  const source = sources.find((s) => s.id === outil.source_repertoire_id);
  if (!source) throw new Error(`${outil.nom}: source « ${outil.source_repertoire_id} » absente de sources.json`);
  return source;
}
