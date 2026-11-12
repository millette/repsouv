// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les tests de test/donnees/ lisent les vrais fichiers du dépôt, produits par `nub run update`. Sans eux, ils
// s'arrêtent avec un message clair plutôt qu'une erreur de fichier introuvable.
import { existsSync } from "node:fs";

export const FICHIERS_DONNEES = ["outils.json", "categories.json", "criteres.json", "tags.json"] as const;

/** Lève une erreur explicite si un des fichiers manque. */
export function exigerFichiers(fichiers: readonly string[]): void {
  const absents = fichiers.filter((f) => !existsSync(f));
  if (absents.length) {
    throw new Error(`Fichiers absents: ${absents.join(", ")}. Lancer « nub run update » d'abord; sans données, « nub run test:unit » suffit.`);
  }
}
