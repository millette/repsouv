// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Adresses du site. L'identifiant d'une fiche est le slug du nom de l'outil (slug() de packages/commun, la règle des
// identifiants de catégories): lisible, stable tant que le nom ne change pas, sans caractère à encoder.
import { slug } from "../../../commun/slug.ts";

/** Identifiant de fiche: minuscules sans accents, mots séparés par un tiret; un nom sans lettre ni chiffre est refusé. */
export function identifiant(nom: string): string {
  const id = slug(nom);
  if (!id) throw new Error(`identifiant de fiche vide pour « ${nom} »`);
  return id;
}

/** Deux outils ne peuvent pas partager une adresse: le build s'arrête plutôt que d'écraser une fiche. */
export function verifierUnicite(outils: readonly { nom: string }[]): void {
  const vus = new Map<string, string>();
  for (const { nom } of outils) {
    const id = identifiant(nom);
    const autre = vus.get(id);
    if (autre !== undefined) throw new Error(`deux outils donnent la même adresse de fiche: « ${autre} » et « ${nom} » (identifiant « ${id} »)`);
    vus.set(id, nom);
  }
}

/** Chemin de base avec une barre oblique au début et à la fin (« / », « /repertoire/ »). */
export function normaliserBase(base: string): string {
  const interieur = base.replace(/^\/+|\/+$/g, "");
  return interieur ? `/${interieur}/` : "/";
}

export function adresseAccueil(base: string, parametres = ""): string {
  return normaliserBase(base) + (parametres ? `?${parametres}` : "");
}

/** Page « Explorer », avec les paramètres d'un état (specs/002-explorateur-outils/contracts/adresse.md). */
export function adresseExplorer(base: string, parametres = ""): string {
  return `${normaliserBase(base)}explorer/` + (parametres ? `?${parametres}` : "");
}

/** Page « Statistiques ». */
export function adresseStatistiques(base: string): string {
  return `${normaliserBase(base)}statistiques/`;
}

/** Fichier d'un graphique (image ou spécification compilée) pour un thème. */
export function adresseGraphique(base: string, id: string, theme: string, extension: "svg" | "json"): string {
  return `${normaliserBase(base)}graphiques/${id}-${theme}.${extension}`;
}

export function adresseFiche(id: string, base: string): string {
  return `${normaliserBase(base)}outils/${id}/`;
}
