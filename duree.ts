// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Durées lisibles en français (« 13 min », « 1 h et 5 min ») et estimation du temps restant d'une tâche longue,
// pour la barre de progression. Sans dépendance: Temporal.Duration (arrondi et équilibrage des unités) et
// Intl.DurationFormat (libellés de la locale), tous deux natifs dans Node.js 26.

const LOCALE = "fr-CA";
const formateur = new Intl.DurationFormat(LOCALE, { style: "short" });
const formateurZero = new Intl.DurationFormat(LOCALE, { style: "short", secondsDisplay: "always" });
/** Espaces ordinaires à la place des espaces insécables de la locale (elles gênent la recherche dans un terminal). */
const espaces = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

/**
 * Formate une durée en millisecondes, arrondie à la seconde sous la minute, à la minute au-delà, les jours
 * comptant 24 heures (temps écoulé, pas calendrier). Zéro donne « 0 s ».
 */
export function formaterDuree(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`Durée invalide: ${ms}`);
  const secondes = Math.round(ms / 1000);
  const smallestUnit = secondes < 60 ? "seconds" : "minutes";
  const duree = Temporal.Duration.from({ seconds: secondes }).round({ largestUnit: "days", smallestUnit });
  return espaces((duree.blank ? formateurZero : formateur).format(duree));
}

/**
 * Temps restant estimé (ms) au rythme moyen observé depuis le début: `ecoule` ms pour `traites` unités sur
 * `total`. Null tant qu'aucune unité n'est terminée (aucun rythme à extrapoler) ou quand tout est terminé.
 */
export function estimerRestant({ ecoule, traites, total }: { ecoule: number; traites: number; total: number }): number | null {
  if (traites <= 0 || traites >= total || ecoule < 0) return null;
  return Math.round((ecoule / traites) * (total - traites));
}
