// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Adapte une spécification de graphique au thème de la page. Seuls le fond et les couleurs du texte, des axes, des
// grilles, des titres et des légendes changent: les données, les formes et les couleurs des séries restent celles
// de packages/commun/graphiques.ts, donc celles de sommaire.md.
import type { TopLevelSpec } from "vega-lite";

export const THEMES_GRAPHIQUES = ["clair", "sombre"] as const;
export type ThemeGraphique = (typeof THEMES_GRAPHIQUES)[number];

/** Couleurs du thème sombre: le fond est celui du thème sombre du site (daisyUI). */
export const SOMBRE = { fond: "#1d232a", texte: "#e6e9ee", discret: "#b8c0cc", grille: "#3a4250", axe: "#8b95a5" } as const;

/** Couleur du contour d'une marque mise en évidence, lisible sur le fond du thème. */
export const CONTOUR: Record<ThemeGraphique, string> = { clair: "#000000", sombre: "#ffffff" };

type Objet = Record<string, unknown>;
const objet = (v: unknown): Objet => (v && typeof v === "object" ? (v as Objet) : {});

export function adapterAuTheme<T extends TopLevelSpec>(spec: T, theme: ThemeGraphique): T {
  if (theme === "clair") return spec;
  const config = objet((spec as unknown as Objet).config);
  return {
    ...spec,
    background: SOMBRE.fond,
    config: {
      ...config,
      title: { ...objet(config.title), color: SOMBRE.texte, subtitleColor: SOMBRE.discret },
      axis: { ...objet(config.axis), labelColor: SOMBRE.texte, titleColor: SOMBRE.texte, gridColor: SOMBRE.grille, domainColor: SOMBRE.axe, tickColor: SOMBRE.axe },
      legend: { ...objet(config.legend), labelColor: SOMBRE.texte, titleColor: SOMBRE.texte },
      header: { ...objet(config.header), labelColor: SOMBRE.texte, titleColor: SOMBRE.texte },
      text: { ...objet(config.text), color: SOMBRE.texte },
    },
  } as T;
}

function luminance(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

/** Rapport de contraste WCAG entre deux couleurs « #rrggbb », de 1 à 21. */
export function contraste(a: string, b: string): number {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (clair + 0.05) / (fonce + 0.05);
}
