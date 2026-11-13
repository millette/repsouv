// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Données du site, chargées une fois par build et partagées par toutes les pages, et constantes du site.
import { verifierUnicite } from "./adresses.ts";
import { infosBuild, type InfosBuild } from "./depot.ts";
import { chargerDonnees, type Donnees, type OutilClasse } from "./donnees.ts";
import { preparer } from "./interaction.ts";
import { compilerVega, rendreSvg } from "./rendu.ts";
import { outilsActifs } from "./repertoire.ts";
import { statistiquesDuSite, type StatistiquesSite } from "./statistiques.ts";
import { adapterAuTheme, CONTOUR, THEMES_GRAPHIQUES, type ThemeGraphique } from "./themes-graphiques.ts";

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

let cacheStatistiques: Promise<StatistiquesSite> | undefined;

/** Statistiques et graphiques de la racine, calculés une fois par build. */
export function statistiques(): Promise<StatistiquesSite> {
  return (cacheStatistiques ??= statistiquesDuSite(site()));
}

export interface Rendu {
  id: string;
  theme: ThemeGraphique;
  /** Image SVG du graphique, pour la lecture sans JavaScript. */
  svg: string;
  largeur: number;
  hauteur: number;
  /** Spécification Vega compilée, préparée pour l'interaction, que l'île charge dans le navigateur. */
  vega: unknown;
}

let cacheRendus: Promise<Rendu[]> | undefined;

/** Chaque graphique, dans chaque thème: son image et sa spécification compilée; calculés une fois par build. */
export function rendus(): Promise<Rendu[]> {
  return (cacheRendus ??= statistiques().then(({ graphiques }) =>
    Promise.all(
    graphiques.flatMap((g) =>
      THEMES_GRAPHIQUES.map(async (theme): Promise<Rendu> => {
        const spec = adapterAuTheme(g.spec, theme);
        const svg = await rendreSvg(spec);
        const dimension = (nom: string) => Math.round(Number(svg.match(new RegExp(`<svg[^>]*\\s${nom}="([\\d.]+)"`))?.[1] ?? 0));
        return { id: g.id, theme, svg, largeur: dimension("width"), hauteur: dimension("height"), vega: compilerVega(preparer(spec, CONTOUR[theme])) };
      }),
    ),
    ),
  ));
}

let cacheBuild: InfosBuild | undefined;

/** Dépôt, version et date du build, lus une fois: toutes les pages d'un build disent la même chose. */
export function build(): InfosBuild {
  return (cacheBuild ??= infosBuild());
}
