// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// D'où vient chaque champ affiché (principe II de la constitution: rien de généré n'est présenté comme vérifié).
// Une seule table, pour qu'aucun composant n'oublie le signalement; test/build/provenance.test.ts le vérifie sur le site bâti.

export type Provenance = "source" | "heuristique" | "ia" | "openhub";

/** Libellé affiché en texte, à côté du champ ou de la section: jamais par la couleur seule ni au survol. */
export const LIBELLES_PROVENANCE: Record<Provenance, string> = {
  source: "Selon la source",
  heuristique: "Déduit par ce dépôt",
  ia: "Produit par IA, à vérifier",
  openhub: "Données publiques d'Open Hub",
};

export const CHAMPS = {
  nom: "source",
  categorie: "source",
  score: "source",
  description: "source",
  lien: "source",
  pays: "source",
  alternative_a: "source",
  instance_de: "source",
  source_repertoire_id: "source",
  criteres: "heuristique",
  confiance: "heuristique",
  score_estime: "heuristique",
  voir_aussi: "heuristique",
  description_longue: "ia",
  tags: "ia",
  source: "ia",
  licence: "ia",
  custom_license: "ia",
  custom_license_url: "ia",
  repo: "ia",
  evaluation_enrichie: "ia",
  criteres_confirmes: "ia",
  description_categorie: "ia",
  openhub: "openhub",
  openhub_id: "openhub",
} as const satisfies Record<string, Provenance>;

export type Champ = keyof typeof CHAMPS;

export function provenanceDe(champ: Champ): Provenance {
  return CHAMPS[champ];
}
