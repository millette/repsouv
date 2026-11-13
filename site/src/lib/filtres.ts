// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Forme de comparaison des noms, pour la recherche de l'explorateur. Sans accès au DOM: testable seul.

/** Forme de comparaison d'un nom: minuscules, sans accents, sans espaces aux extrémités. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
