// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Tri des résultats de l'explorateur (specs/002-explorateur-outils/data-model.md). L'ordre est toujours déterminé:
// des outils égaux selon la clé sont départagés par leur nom, croissant, quel que soit le sens demandé.
import type { Sens, Tri } from "./etat.ts";
import type { OutilExplorateur } from "./explorateur.ts";

/** Ordre alphabétique français, sans égard à la casse ni aux accents; les nombres se comparent comme des nombres. */
const ALPHABETIQUE = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

/** Rend une copie triée; `categories` donne le rang de chaque catégorie (l'ordre des données). */
export function trier<T extends Pick<OutilExplorateur, "nom" | "score" | "categorie">>(outils: readonly T[], tri: Tri, sens: Sens, categories: readonly string[]): T[] {
  const signe = sens === "desc" ? -1 : 1;
  const rang = new Map(categories.map((id, i) => [id, i]));
  const cle = (o: T): number => (tri === "score" ? o.score : tri === "categorie" ? (rang.get(o.categorie) ?? categories.length) : 0);
  return [...outils].sort((a, b) => {
    if (tri === "nom") return signe * ALPHABETIQUE.compare(a.nom, b.nom);
    return signe * (cle(a) - cle(b)) || ALPHABETIQUE.compare(a.nom, b.nom);
  });
}
