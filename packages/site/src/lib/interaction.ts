// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Prépare un graphique pour l'interaction de la page « Statistiques », sans toucher à packages/commun/graphiques.ts
// (specs/003-page-statistiques/contracts/graphiques.md): chaque valeur reçoit son rang (_i), et deux paramètres pilotés
// par l'île, « courant » (valeur atteinte au clavier) et « serie » (série mise en évidence), règlent l'opacité et le
// contour des marques. La mise en évidence ne repose donc pas sur la couleur seule: estompage et contour.
import type { TopLevelSpec } from "vega-lite";

type Objet = Record<string, unknown>;
const objet = (v: unknown): Objet => (v && typeof v === "object" && !Array.isArray(v) ? (v as Objet) : {});

export interface Series {
  /** Champ des valeurs qui porte la série. */
  champ: string;
  noms: string[];
}

/** Unités de dessin d'une spécification: elle-même, ses couches, et la spécification d'une facette. */
function unites(spec: Objet): Objet[] {
  const interne = spec.spec ? unites(objet(spec.spec)) : [];
  const couches = Array.isArray(spec.layer) ? (spec.layer as unknown[]).flatMap((c) => unites(objet(c))) : [];
  return [spec, ...interne, ...couches];
}

const typeMarque = (unite: Objet): string | undefined => (typeof unite.mark === "string" ? unite.mark : (objet(unite.mark).type as string | undefined));

/**
 * Séries qu'on peut isoler: la couleur suit un champ nominal qui regroupe plusieurs marques, c'est-à-dire un champ
 * différent de celui de l'axe des catégories. Un graphique à une barre par catégorie n'en a pas.
 */
export function seriesDe(spec: TopLevelSpec): Series | undefined {
  const racine = spec as unknown as Objet;
  for (const unite of unites(racine)) {
    const encodage = { ...objet(racine.encoding), ...objet(unite.encoding) };
    const couleur = objet(encodage.color);
    if (typeof couleur.field !== "string" || couleur.type !== "nominal") continue;
    const axes = [objet(encodage.x).field, objet(encodage.y).field];
    if (axes.includes(couleur.field)) continue;
    const domaine = objet(couleur.scale).domain;
    if (Array.isArray(domaine)) return { champ: couleur.field, noms: domaine.map(String) };
  }
  return undefined;
}

/** Copie de la spécification, prête pour le survol, le clavier et la mise en évidence. `contour` est la couleur du contour. */
export function preparer<T extends TopLevelSpec>(spec: T, contour: string): T {
  const copie = structuredClone(spec) as unknown as Objet;
  const donnees = objet(copie.data);
  if (Array.isArray(donnees.values)) copie.data = { ...donnees, values: (donnees.values as Objet[]).map((v, i) => ({ ...v, _i: i })) };
  copie.params = [...(Array.isArray(copie.params) ? copie.params : []), { name: "courant", value: -1 }, { name: "serie", value: null }];
  const series = seriesDe(spec);
  const dansSerie = series ? `serie != null && datum[${JSON.stringify(series.champ)}] == serie` : "false";
  const horsSerie = series ? `serie != null && datum[${JSON.stringify(series.champ)}] != serie` : "false";
  for (const unite of unites(copie)) {
    const type = typeMarque(unite);
    if (type !== "bar" && type !== "rect") continue;
    unite.mark = { ...(typeof unite.mark === "string" ? { type } : objet(unite.mark)), tooltip: { content: "data" } };
    unite.encoding = {
      ...objet(unite.encoding),
      opacity: { condition: { test: horsSerie, value: 0.25 }, value: 1 },
      stroke: { condition: { test: `datum._i == courant || (${dansSerie})`, value: contour }, value: null },
      strokeWidth: { condition: { test: "datum._i == courant", value: 3 }, value: 1.5 },
    };
  }
  return copie as unknown as T;
}
