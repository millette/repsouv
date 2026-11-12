// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Exécution des scripts en ligne de commande: une erreur s'affiche en un message clair (« Erreur: »
// en rouge dans un terminal), sans trace de pile, et donne le code de sortie 1.
import { couleursActives, creerCouleurs } from "./couleurs.ts";

export async function lancer(principal: () => Promise<void>): Promise<void> {
  try {
    await principal();
  } catch (e) {
    const c = creerCouleurs(couleursActives(process.stderr, process.env, process.argv.includes("--sans-couleur")));
    console.error(`${c.gras(c.rouge("Erreur:"))} ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}
