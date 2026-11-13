// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Statistiques de la page « Statistiques »: celles des scripts (packages/scripts), calculées par les mêmes fonctions que sommaire.md
// (calculerStatistiques de statistiques.ts, construireGraphiques de graphiques.ts), pour que la page et le sommaire
// ne se contredisent jamais. Le site n'ajoute que les chiffres clés que le sommaire écrit en phrases.
// Conséquence: bâtir le site exécute ces modules des scripts, donc demande leurs dépendances installées.
// Ils sont chargés à leur emplacement réel, par leur chemin, et non regroupés avec le code du site: certains
// modules des scripts lisent des fichiers à côté d'eux (le package.json de la racine du dépôt), ce qu'un regroupement casserait.
import { pathToFileURL } from "node:url";
import type { Graphique } from "../../../scripts/graphiques.ts";
import type { Statistiques } from "../../../scripts/statistiques.ts";
import { depuisRacine } from "./chemins.ts";
import type { Donnees } from "./donnees.ts";
import { nomPays } from "./libelles.ts";
import { outilsActifs } from "./repertoire.ts";

export type { Graphique, Statistiques };

export interface StatistiquesSite {
  stats: Statistiques;
  graphiques: Graphique[];
}

/** Module des scripts du dépôt, chargé par Node tel quel, à son emplacement. */
async function moduleScripts<T>(fichier: string): Promise<T> {
  return (await import(/* @vite-ignore */ pathToFileURL(depuisRacine("packages", "scripts", fichier)).href)) as T;
}

export async function statistiquesDuSite(donnees: Donnees): Promise<StatistiquesSite> {
  const { calculerStatistiques } = await moduleScripts<typeof import("../../../scripts/statistiques.ts")>("statistiques.ts");
  const { construireGraphiques } = await moduleScripts<typeof import("../../../scripts/graphiques.ts")>("graphiques.ts");
  const stats = calculerStatistiques({ outils: donnees.outils, categories: donnees.categories, tags: donnees.tags, criteres: donnees.criteres, meta: donnees.meta, sources: donnees.sources });
  return { stats, graphiques: construireGraphiques(stats) };
}

export interface ChiffresCles {
  outils: number;
  /** Catégories qui ont au moins un outil. */
  categories: number;
  /** Nombre d'outils par nombre d'étoiles, de 3 à 0. */
  etoiles: { etoiles: number; outils: number }[];
  moyenne: number;
  /** Outils dont le score est estimé, faute d'étoiles dans la source. */
  estimes: number;
  enrichis: number;
  provenance: { id: string; nom: string; outils: number; enrichis: number }[];
  /** Pays de l'éditeur, nommés en français, quand la source le donne. */
  pays: { code: string; nom: string; outils: number }[];
  /** Outils dont la source donne le pays: base des chiffres par pays. */
  avecPays: number;
}

export function chiffresCles(stats: Statistiques, donnees: Donnees): ChiffresCles {
  const actifs = outilsActifs(donnees.outils);
  return {
    outils: stats.total,
    categories: stats.categories.filter((c) => c.outils > 0).length,
    etoiles: [3, 2, 1, 0].map((etoiles) => ({ etoiles, outils: actifs.filter((o) => o.score === etoiles).length })),
    moyenne: stats.scores.moyen,
    estimes: stats.scoresEstimes.length,
    enrichis: stats.enrichissement.enrichis,
    provenance: stats.provenance,
    pays: stats.pays.map((p) => ({ code: p.pays, nom: nomPays(p.pays), outils: p.n })),
    avecPays: stats.pays.reduce((somme, p) => somme + p.n, 0),
  };
}
