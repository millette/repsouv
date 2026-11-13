// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Identifiants lisibles tirés d'un nom: ceux des catégories (packages/scripts/categories.ts) et les adresses des
// fiches du site (packages/site/src/lib/adresses.ts). Une seule règle, pour que les deux ne divergent pas.

/**
 * Minuscules sans accents, mots séparés par un tiret: « Gestion d’événements et billetterie » →
 * « gestion-d-evenements-et-billetterie ». Rend une chaîne vide quand le nom n'a ni lettre ni chiffre:
 * à l'appelant de refuser, avec un message qui dit de quel identifiant il s'agit.
 */
export function slug(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
