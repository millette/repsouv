// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Comparaison côte à côte de l'explorateur (specs/002-explorateur-outils/data-model.md): de deux à quatre outils,
// les mêmes informations ligne par ligne. Une information absente est écrite en clair, pour que les colonnes restent
// comparables. Sans Solid ni accès au DOM: testable seul.
import type { StatutVerdict } from "./criteres.ts";
import { MAX_COMPARES } from "./etat.ts";
import type { DonneesExplorateur, OutilExplorateur } from "./explorateur.ts";
import { LIBELLES_STATUT, texteEtoiles } from "./libelles.ts";
import type { Provenance } from "./provenance.ts";

export const MIN_COMPARES = 2;

/** Ajoute l'outil à la comparaison, ou le retire s'il y est; un outil de trop est refusé et signalé. */
export function basculer(liste: readonly string[], id: string): { liste: string[]; refuse: boolean } {
  if (liste.includes(id)) return { liste: liste.filter((v) => v !== id), refuse: false };
  if (liste.length >= MAX_COMPARES) return { liste: [...liste], refuse: true };
  return { liste: [...liste, id], refuse: false };
}

export function comparable(liste: readonly string[]): boolean {
  return liste.length >= MIN_COMPARES && liste.length <= MAX_COMPARES;
}

export const LIBELLES_VERDICT: Record<StatutVerdict, string> = { confirme: "Confirmé", infirme: "Infirmé", indetermine: "Indéterminé" };

/** Nom court d'un critère, pour une case de tableau; un critère inconnu garde son identifiant. */
const CRITERES_COURTS: Record<string, string> = { donnees: "données", controle: "contrôle", dependance: "dépendance" };

export interface Ligne {
  id: string;
  /** En-tête de la ligne. */
  titre: string;
  provenance: Provenance;
  /** Une case par outil comparé, jamais vide. */
  cellules: string[];
}

const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);

export function lignesComparaison(outils: readonly OutilExplorateur[], donnees: Pick<DonneesExplorateur, "criteres" | "pays">): Ligne[] {
  const nomPays = new Map(donnees.pays.map((p) => [p.code, p.nom]));
  const ligne = (id: string, titre: string, provenance: Provenance, cellule: (o: OutilExplorateur) => string): Ligne => ({ id, titre, provenance, cellules: outils.map(cellule) });
  return [
    ligne("score", "Score", "source", (o) => texteEtoiles(o.score) + (o.scoreEstime ? ", score estimé" : "")),
    ...donnees.criteres.map((c) => ligne(`verdict-${c.id}`, c.titre, "ia", (o) => (o.verdicts?.[c.id] ? LIBELLES_VERDICT[o.verdicts[c.id]!] : "Non vérifié"))),
    ligne("deduits", "Critères déduits des étoiles", "heuristique", (o) => (o.deduits.length > 0 ? majuscule(o.deduits.map((id) => CRITERES_COURTS[id] ?? id).join(", ")) : "Aucun")),
    ligne("statut", "Statut du code source", "ia", (o) => LIBELLES_STATUT[o.statut]),
    ligne("licence", "Licence", "ia", (o) => o.licence ?? "Non connue"),
    ligne("pays", "Pays de l'éditeur", "source", (o) => (o.pays ? (nomPays.get(o.pays) ?? o.pays) : "Non connu")),
    ligne("remplace", "Services remplacés", "source", (o) => (o.remplace.length > 0 ? o.remplace.join(", ") : "Aucun connu")),
  ];
}
