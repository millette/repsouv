// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Charge .env (clé OPENAI_API_KEY, OPENAI_MODEL) dans process.env, pour que `node update.ts` et
// `node sommaire.ts` fonctionnent sans nub. nub charge aussi .env avant de lancer un script: sans conflit,
// car une variable déjà présente dans l'environnement n'est jamais écrasée par le fichier.

/** Charge le fichier .env (relatif au dossier courant). Retourne false s'il n'existe pas; toute autre erreur remonte. */
export function chargerEnv(chemin: string = ".env"): boolean {
  try {
    process.loadEnvFile(chemin);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new Error(`Fichier d'environnement illisible (${chemin}): ${e instanceof Error ? e.message : String(e)}`);
  }
}
