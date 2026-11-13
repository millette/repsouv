// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Choix du thème d'affichage, clair ou sombre. Sans Solid ni accès au DOM: testable seul.

export type Theme = "light" | "dark";

/** Clé de la préférence dans le stockage local du navigateur. */
export const CLE_THEME = "theme";

/** Préférence enregistrée, ou null quand il n'y en a pas (ou qu'elle est inconnue). */
export function lireTheme(valeur: string | null): Theme | null {
  return valeur === "light" || valeur === "dark" ? valeur : null;
}

/** Thème au chargement: le choix enregistré s'il existe, sinon celui que le système demande. */
export function themeInitial(enregistre: string | null, systemeSombre: boolean): Theme {
  return lireTheme(enregistre) ?? (systemeSombre ? "dark" : "light");
}
