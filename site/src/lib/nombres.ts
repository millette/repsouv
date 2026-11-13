// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Nombres et pourcentages à la française: virgule décimale, espace avant « % ».
const ENTIER = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 });
const POURCENT = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 1 });

/** Espaces ordinaires: Intl sépare les milliers par une espace insécable fine, mal rendue par certaines polices. */
const espaces = (texte: string) => texte.replace(/[\u202f\u00a0]/g, " ");

export function nombre(n: number): string {
  return espaces(ENTIER.format(n));
}

/** Nombre à deux décimales au plus (une moyenne). */
export function decimal(n: number): string {
  return espaces(DECIMAL.format(n));
}

/** Pourcentage déjà calculé (de 0 à 100), à une décimale au plus. */
export function pourcent(p: number): string {
  return `${espaces(POURCENT.format(p))} %`;
}

/** Part de n dans une base, en pourcentage; une base nulle donne 0 %. */
export function part(n: number, base: number): string {
  return pourcent(base ? (n * 100) / base : 0);
}
