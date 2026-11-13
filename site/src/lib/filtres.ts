// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Filtres de la page d'accueil (contracts/filtres.md). Sans Solid, sans Astro, sans accès au DOM: testable seul.

/** Forme de comparaison d'un nom: minuscules, sans accents, sans espaces aux extrémités. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Choix de la personne: plusieurs valeurs par type, et une recherche par nom. */
export interface Etat {
  categories: string[];
  tags: string[];
  statuts: string[];
  q: string;
}

/** Valeurs que les données connaissent, dans leur ordre: une valeur inconnue dans une adresse est ignorée. */
export interface ValeursConnues {
  categories: readonly string[];
  tags: readonly string[];
  statuts: readonly string[];
}

/** Ce que les filtres lisent d'un outil (attributs data-* de sa carte). */
export interface Filtrable {
  categorie: string;
  tags: readonly string[];
  statut: string;
  /** Nom déjà normalisé. */
  nom: string;
}

/** Paramètre de l'adresse de chaque type de filtre. */
const PARAMETRES = { categories: "categorie", tags: "tag", statuts: "statut" } as const;
const TYPES = ["categories", "tags", "statuts"] as const;
const RECHERCHE = "q";

export function etatVide(): Etat {
  return { categories: [], tags: [], statuts: [], q: "" };
}

export function estVide(etat: Etat): boolean {
  return TYPES.every((t) => etat[t].length === 0) && etat.q.trim() === "";
}

/** État d'après les paramètres d'une adresse: valeurs inconnues et doublons ignorés, dans l'ordre des données. */
export function lireEtat(parametres: string | URLSearchParams, connues: ValeursConnues): Etat {
  const p = typeof parametres === "string" ? new URLSearchParams(parametres) : parametres;
  const etat = etatVide();
  for (const type of TYPES) {
    const demandees = new Set(p.getAll(PARAMETRES[type]));
    etat[type] = connues[type].filter((v) => demandees.has(v));
  }
  etat.q = (p.get(RECHERCHE) ?? "").trim();
  return etat;
}

/**
 * Paramètres d'adresse d'un état (sans « ? »): seulement les choix actifs, dans l'ordre des données, pour qu'un même
 * état donne toujours la même adresse. Les paramètres de `actuels` qui ne sont pas des filtres sont conservés devant.
 */
export function ecrireEtat(etat: Etat, connues: ValeursConnues, actuels: string | URLSearchParams = ""): string {
  const filtres = new Set<string>([...Object.values(PARAMETRES), RECHERCHE]);
  const p = new URLSearchParams();
  for (const [cle, valeur] of new URLSearchParams(actuels)) if (!filtres.has(cle)) p.append(cle, valeur);
  for (const type of TYPES) {
    const choisies = new Set(etat[type]);
    for (const v of connues[type]) if (choisies.has(v)) p.append(PARAMETRES[type], v);
  }
  const q = etat.q.trim();
  if (q) p.append(RECHERCHE, q);
  return p.toString();
}

/** Règle de sélection: « ou » à l'intérieur d'un type, « et » entre les types et avec la recherche; un type vide ne filtre rien. */
export function retenu(outil: Filtrable, etat: Etat): boolean {
  if (etat.categories.length > 0 && !etat.categories.includes(outil.categorie)) return false;
  if (etat.tags.length > 0 && !etat.tags.some((t) => outil.tags.includes(t))) return false;
  if (etat.statuts.length > 0 && !etat.statuts.includes(outil.statut)) return false;
  const q = normaliser(etat.q);
  return q === "" || outil.nom.includes(q);
}
