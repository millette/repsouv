// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Forme des trois fichiers de données, telle qu'elle est écrite sur le disque (voir fichiers.ts):
// un objet « meta » puis le tableau de données. Ces types sont la source des schémas JSON
// (schemas/*.schema.json), générés par generer-schemas.ts avec RunTypes.
import type { Critere } from "./extract.ts";
import type { OutilClasse } from "./classify.ts";
import type { Tag } from "./enrichir.ts";
import type { Metadonnees } from "./fichiers.ts";
import type { Categorie } from "./categories.ts";

export interface FichierOutils {
  meta: Metadonnees;
  outils: OutilClasse[];
}

export interface FichierCriteres {
  meta: Metadonnees;
  criteres: Critere[];
}

export interface FichierCategories {
  meta: Metadonnees;
  categories: Categorie[];
}

export interface FichierTags {
  meta: Metadonnees;
  tags: Tag[];
}
