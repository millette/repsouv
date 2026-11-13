// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Filtres de la page d'accueil (contracts/filtres.md). Sans Solid, sans Astro, sans accès au DOM: testable seul.

/** Forme de comparaison d'un nom: minuscules, sans accents, sans espaces aux extrémités. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
