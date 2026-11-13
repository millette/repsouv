// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Statistiques de la page « Statistiques »: celles du dépôt, calculées par les mêmes fonctions que donnees/sommaire.md
// (calculerStatistiques et construireGraphiques de packages/commun), pour que la page et le sommaire ne se
// contredisent jamais. Le site n'ajoute que les chiffres clés que le sommaire écrit en phrases.
// Ces fonctions sont pures (ni disque, ni réseau, ni dépendance à installer): elles s'importent comme le reste du site.
import { construireGraphiques, type Graphique } from "../../../commun/graphiques.ts";
import { calculerStatistiques, type Statistiques } from "../../../commun/statistiques.ts";
import type { Donnees } from "./donnees.ts";
import { nomPays } from "./libelles.ts";
import { outilsActifs } from "./repertoire.ts";

export type { Graphique, Statistiques };

export interface StatistiquesSite {
  stats: Statistiques;
  graphiques: Graphique[];
}

export function statistiquesDuSite(donnees: Donnees): StatistiquesSite {
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
