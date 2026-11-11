// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Couleurs ANSI pour les messages en ligne de commande, sans dépendance.
// Elles ne sont actives que si la sortie est un terminal (voir couleursActives); sinon, chaque
// fonction rend le texte tel quel, de sorte que les sorties redirigées ou analysées restent propres.

export type Peintre = (texte: string) => string;

export interface Couleurs {
  actif: boolean;
  gras: Peintre;
  attenue: Peintre;
  rouge: Peintre;
  vert: Peintre;
  jaune: Peintre;
  magenta: Peintre;
  cyan: Peintre;
}

/**
 * Faut-il colorer ce flux? Dans l'ordre: `sansCouleur` et NO_COLOR (https://no-color.org, toute valeur
 * non vide) l'interdisent; FORCE_COLOR l'impose (sauf « 0 » ou « false »); un terminal « dumb » n'a pas de
 * couleurs; sinon, seulement si le flux est un terminal.
 */
export function couleursActives(
  flux: { isTTY?: boolean },
  env: Record<string, string | undefined> = process.env,
  sansCouleur = false,
): boolean {
  if (sansCouleur || (env.NO_COLOR !== undefined && env.NO_COLOR !== "")) return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== "") return env.FORCE_COLOR !== "0" && env.FORCE_COLOR !== "false";
  if (env.TERM === "dumb") return false;
  return flux.isTTY === true;
}

export function creerCouleurs(actif: boolean): Couleurs {
  const peintre = (ouvrir: number, fermer: number): Peintre => (actif ? (t) => `\x1b[${ouvrir}m${t}\x1b[${fermer}m` : (t) => t);
  return {
    actif,
    gras: peintre(1, 22),
    attenue: peintre(2, 22),
    rouge: peintre(31, 39),
    vert: peintre(32, 39),
    jaune: peintre(33, 39),
    magenta: peintre(35, 39),
    cyan: peintre(36, 39),
  };
}
