// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Ce que les tests dans un navigateur attendent, calculé depuis les vraies données et la règle de src/lib/filtres.ts.
import { readFileSync } from "node:fs";
import { identifiant } from "../../src/lib/adresses.ts";
import { type Etat, normaliser, retenu } from "../../src/lib/filtres.ts";

interface OutilBrut {
  nom: string;
  categorie: string;
  tags?: string[];
  source?: string;
  removed?: true;
  enrichi_le?: string;
  source_repertoire_id: string;
}

export const actifs: OutilBrut[] = (JSON.parse(readFileSync("../outils.json", "utf8")).outils as OutilBrut[]).filter((o) => !o.removed);

/** Identifiants des fiches que la règle de sélection retient pour un état, triés. */
export function attendus(etat: Partial<Etat>): string[] {
  const complet: Etat = { categories: [], tags: [], statuts: [], q: "", ...etat };
  return actifs
    .filter((o) => retenu({ categorie: o.categorie, tags: o.tags ?? [], statut: o.source ?? "non-enrichi", nom: normaliser(o.nom) }, complet))
    .map((o) => identifiant(o.nom))
    .sort();
}

export { identifiant };
