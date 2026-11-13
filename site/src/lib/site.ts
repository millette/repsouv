// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Données du site, chargées une fois par build et partagées par toutes les pages, et constantes du site.
import { verifierUnicite } from "./adresses.ts";
import { chargerDonnees, type Donnees, type OutilClasse } from "./donnees.ts";
import { outilsActifs } from "./repertoire.ts";

export const NOM_SITE = "Répertoire d'outils favorisant la souveraineté numérique";
export const AUTEURS_PRAXIS = ["Sven Buridans", "François Delnooz", "Marie-Renee Duguay"] as const;
export const LICENCE_DONNEES = { nom: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/deed.fr" } as const;
/** Identifiant, dans sources.json, du répertoire d'origine. */
export const ID_PRAXIS = "praxis";

export interface Site extends Donnees {
  /** Outils du répertoire courant (sans les outils retirés), aux adresses de fiche uniques. */
  actifs: OutilClasse[];
  /** Chemin de base du site (« / » par défaut, SITE_BASE sinon). */
  base: string;
}

let cache: Site | undefined;

/** Charge les données et vérifie que chaque outil actif a une adresse de fiche unique; échoue sinon, sans site partiel. */
export function site(): Site {
  if (cache) return cache;
  const donnees = chargerDonnees();
  const actifs = outilsActifs(donnees.outils);
  verifierUnicite(actifs);
  cache = { ...donnees, actifs, base: import.meta.env?.BASE_URL ?? "/" };
  return cache;
}
