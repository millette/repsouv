// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// État de l'explorateur (tri, filtres, vue, outils comparés) et adresse de la page
// (specs/002-explorateur-outils/contracts/adresse.md). Tout l'état vit dans l'adresse: un lien copié le restaure.
// Sans Solid, sans Astro, sans accès au DOM: testable seul.
import type { StatutVerdict } from "./criteres.ts";
import type { DonneesExplorateur } from "./explorateur.ts";
import { STATUTS } from "./repertoire.ts";

export const TRIS = ["nom", "score", "categorie"] as const;
export type Tri = (typeof TRIS)[number];
export const SENS = ["asc", "desc"] as const;
export type Sens = (typeof SENS)[number];
export const VUES = ["cartes", "tableau"] as const;
export type Vue = (typeof VUES)[number];
export const VERDICTS = ["confirme", "infirme", "indetermine"] as const;
export const ENRICHIS = ["oui", "non"] as const;
export type Enrichi = "" | (typeof ENRICHIS)[number];

/** Filtres à choix multiple, dans l'ordre où ils s'écrivent dans l'adresse, avec le nom de leur paramètre. */
export const MULTIPLES = [
  ["categories", "categorie"],
  ["tags", "tag"],
  ["statuts", "statut"],
  ["pays", "pays"],
  ["sources", "source"],
] as const;
export type Multiple = (typeof MULTIPLES)[number][0];

/** La comparaison montre de deux à quatre outils. */
export const MAX_COMPARES = 4;

export interface Etat {
  categories: string[];
  tags: string[];
  statuts: string[];
  pays: string[];
  sources: string[];
  /** Recherche par une partie du nom. */
  q: string;
  /** Score minimal, de 0 (aucun minimum) à 3. */
  scoreMin: number;
  /** Verdict exigé pour un critère vérifié, par identifiant de critère; un verdict au plus par critère. */
  verdicts: Record<string, StatutVerdict>;
  enrichi: Enrichi;
  tri: Tri;
  sens: Sens;
  vue: Vue;
  /** Identifiants des outils à comparer, dans l'ordre du choix. */
  comparer: string[];
}

/** Valeurs que les données connaissent, dans leur ordre: une valeur inconnue dans une adresse est ignorée. */
export interface EtatConnu {
  categories: readonly string[];
  tags: readonly string[];
  statuts: readonly string[];
  pays: readonly string[];
  sources: readonly string[];
  criteres: readonly string[];
  outils: readonly string[];
}

export function connuesDe(donnees: DonneesExplorateur): EtatConnu {
  return {
    categories: donnees.categories.map((c) => c.id),
    tags: donnees.tags,
    statuts: STATUTS,
    pays: donnees.pays.map((p) => p.code),
    sources: donnees.sources.map((s) => s.id),
    criteres: donnees.criteres.map((c) => c.id),
    outils: donnees.outils.map((o) => o.id),
  };
}

export function etatParDefaut(): Etat {
  return { categories: [], tags: [], statuts: [], pays: [], sources: [], q: "", scoreMin: 0, verdicts: {}, enrichi: "", tri: "categorie", sens: "asc", vue: "cartes", comparer: [] };
}

const parmi = <T extends string>(valeurs: readonly T[], valeur: string | null, defaut: T): T => (valeurs.includes(valeur as T) ? (valeur as T) : defaut);

/** État d'après les paramètres d'une adresse: valeurs inconnues ignorées, défauts appliqués, sans jamais lever d'erreur. */
export function lireEtat(parametres: string | URLSearchParams, connues: EtatConnu): Etat {
  const p = typeof parametres === "string" ? new URLSearchParams(parametres) : parametres;
  const etat = etatParDefaut();
  for (const [champ, nom] of MULTIPLES) {
    const demandees = new Set(p.getAll(nom));
    etat[champ] = connues[champ].filter((v) => demandees.has(v));
  }
  etat.q = (p.get("q") ?? "").trim();
  const score = Number(p.get("score"));
  etat.scoreMin = Number.isInteger(score) && score >= 1 && score <= 3 ? score : 0;
  for (const critere of connues.criteres) {
    const verdict = p.get(critere);
    if (VERDICTS.includes(verdict as StatutVerdict)) etat.verdicts[critere] = verdict as StatutVerdict;
  }
  etat.enrichi = parmi(ENRICHIS, p.get("enrichi"), "") as Enrichi;
  etat.tri = parmi(TRIS, p.get("tri"), "categorie");
  etat.sens = parmi(SENS, p.get("sens"), "asc");
  etat.vue = parmi(VUES, p.get("vue"), "cartes");
  const outils = new Set(connues.outils);
  etat.comparer = [...new Set(p.getAll("comparer"))].filter((id) => outils.has(id)).slice(0, MAX_COMPARES);
  return etat;
}

/**
 * Paramètres d'adresse d'un état (sans « ? »): seulement ce qui diffère du défaut, dans un ordre fixe, pour qu'un même
 * état donne toujours la même adresse. Les paramètres de `actuels` qui ne sont pas ceux de l'explorateur sont conservés devant.
 */
export function ecrireEtat(etat: Etat, connues: EtatConnu, actuels: string | URLSearchParams = ""): string {
  const siens = new Set<string>([...MULTIPLES.map(([, nom]) => nom), "q", "score", ...connues.criteres, "enrichi", "tri", "sens", "vue", "comparer"]);
  const p = new URLSearchParams();
  for (const [cle, valeur] of new URLSearchParams(actuels)) if (!siens.has(cle)) p.append(cle, valeur);
  for (const [champ, nom] of MULTIPLES) {
    const choisies = new Set(etat[champ]);
    for (const v of connues[champ]) if (choisies.has(v)) p.append(nom, v);
  }
  const q = etat.q.trim();
  if (q) p.append("q", q);
  if (etat.scoreMin > 0) p.append("score", String(etat.scoreMin));
  for (const critere of connues.criteres) {
    const verdict = etat.verdicts[critere];
    if (verdict) p.append(critere, verdict);
  }
  if (etat.enrichi) p.append("enrichi", etat.enrichi);
  if (etat.tri !== "categorie") p.append("tri", etat.tri);
  if (etat.sens !== "asc") p.append("sens", etat.sens);
  if (etat.vue !== "cartes") p.append("vue", etat.vue);
  for (const id of etat.comparer) p.append("comparer", id);
  return p.toString();
}

/** Vrai dès qu'un filtre réduit la liste; le tri, la vue et la comparaison n'en sont pas. */
export function filtresActifs(etat: Etat): boolean {
  return MULTIPLES.some(([champ]) => etat[champ].length > 0) || etat.q.trim() !== "" || etat.scoreMin > 0 || Object.keys(etat.verdicts).length > 0 || etat.enrichi !== "";
}
