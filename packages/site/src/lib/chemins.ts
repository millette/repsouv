// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Chemins du dépôt vus du site, qui lit hors de son dossier les données (donnees/), le package.json de la racine et
// la documentation. Ils partent du dossier courant, celui du site, d'où se lancent toutes ses commandes, et non de
// l'emplacement de ce module: Astro regroupe le code du site, ce qui déplace les modules au moment du build.
import { resolve } from "node:path";

/** Racine du dépôt: deux dossiers au-dessus du site (packages/site/). */
export const racineDepot = (): string => resolve(process.cwd(), "..", "..");

/** Chemin absolu d'un fichier du dépôt, donné depuis sa racine (ex. `depuisRacine("donnees", "outils.json")`). */
export const depuisRacine = (...segments: string[]): string => resolve(racineDepot(), ...segments);
