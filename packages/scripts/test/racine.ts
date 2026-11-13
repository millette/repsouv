// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les tests lisent des fichiers du dépôt (documentation, licences, données, schémas) par leur chemin depuis la racine
// du dépôt, quel que soit le dossier d'où ils sont lancés.
import { join } from "node:path";
import { RACINE_DEPOT } from "../fichiers.ts";

/** Chemin absolu d'un fichier du dépôt, donné depuis sa racine (ex. `depuisRacine("donnees", "outils.json")`). */
export const depuisRacine = (...segments: string[]): string => join(RACINE_DEPOT, ...segments);
