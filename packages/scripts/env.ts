// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Charge .env (clé OPENAI_API_KEY, OPENAI_MODEL) dans process.env, pour que `node packages/scripts/update.ts` et
// `node packages/scripts/sommaire.ts` fonctionnent sans nub. nub charge aussi .env avant de lancer un script: sans conflit,
// car une variable déjà présente dans l'environnement n'est jamais écrasée par le fichier.
import { join } from "node:path";
import { RACINE_DEPOT } from "./fichiers.ts";

/** Charge le fichier .env (par défaut celui de la racine du dépôt, quel que soit le dossier courant). Retourne false s'il n'existe pas; toute autre erreur remonte. */
export function chargerEnv(chemin: string = join(RACINE_DEPOT, ".env")): boolean {
  try {
    process.loadEnvFile(chemin);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new Error(`Fichier d'environnement illisible (${chemin}): ${e instanceof Error ? e.message : String(e)}`);
  }
}
