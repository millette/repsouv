// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les tests de test/donnees/ lisent les vrais fichiers du dépôt, produits par `nub run update`. Sans eux, ils
// s'arrêtent avec un message clair plutôt qu'une erreur de fichier introuvable.
import { existsSync } from "node:fs";
import { depuisRacine } from "../racine.ts";

/** Les cinq fichiers de données, par leur chemin depuis la racine du dépôt. */
export const FICHIERS_DONNEES = ["donnees/outils.json", "donnees/categories.json", "donnees/criteres.json", "donnees/tags.json", "donnees/sources.json"] as const;

/** Lève une erreur explicite si un des fichiers (chemins depuis la racine du dépôt) manque. */
export function exigerFichiers(fichiers: readonly string[]): void {
  const absents = fichiers.filter((f) => !existsSync(depuisRacine(f)));
  if (absents.length) {
    throw new Error(`Fichiers absents: ${absents.join(", ")}. Lancer « nub run update » d'abord; sans données, « nub run test:unit » suffit.`);
  }
}
