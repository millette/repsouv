// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Précise un schéma JSON produit par RunTypes avec ce que les types TypeScript n'expriment pas:
//   - les objets refusent les clés inconnues (additionalProperties: false), comme le fait fichiers.ts;
//   - `score` est un entier de 0 à 3, `echecs_enrichissement` un entier d'au moins 1, `tags` compte de 1 à 5 identifiants distincts;
//   - les dates sont des horodatages ISO 8601 avec décalage (même motif que fichiers.ts).
// Les règles s'appliquent par nom de propriété. Les règles de croisement (licence SPDX, tags présents dans
// tags.json, score égal au nombre de critères) restent dans les validateurs et les tests.
export const HORODATAGE = "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$";
const CHAMPS_HORODATAGE = new Set(["derniere_modification", "enrichi_le", "created_at", "updated_at"]);

type Noeud = Record<string, unknown>;
const estObjet = (x: unknown): x is Noeud => typeof x === "object" && x !== null && !Array.isArray(x);

/** Règle propre à une propriété, selon son nom et la forme de son schéma; retourne ce qu'il faut ajouter. */
function regle(nom: string, schema: Noeud): Noeud {
  if (nom === "score") return { type: "integer", minimum: 0, maximum: 3 };
  if (nom === "echecs_enrichissement") return { type: "integer", minimum: 1 };
  if (CHAMPS_HORODATAGE.has(nom) && schema.type === "string") return { pattern: HORODATAGE };
  const elements = schema.items;
  if (schema.type === "array" && estObjet(elements) && elements.type === "string") {
    if (nom === "tags") return { minItems: 1, maxItems: 5, uniqueItems: true };
  }
  if (nom === "criteres" && schema.type === "array" && estObjet(elements) && elements.type !== "object") {
    return { maxItems: 3, uniqueItems: true };
  }
  return {};
}

/** Retourne une copie du schéma avec les précisions ci-dessus. */
export function affiner<T>(schema: T): T {
  if (Array.isArray(schema)) return schema.map(affiner) as T;
  if (!estObjet(schema)) return schema;
  const sortie: Noeud = {};
  for (const [cle, valeur] of Object.entries(schema)) sortie[cle] = cle === "properties" && estObjet(valeur) ? proprietes(valeur) : affiner(valeur);
  if (sortie.type === "object" && estObjet(sortie.properties)) sortie.additionalProperties = false;
  return sortie as T;
}

function proprietes(props: Noeud): Noeud {
  const sortie: Noeud = {};
  for (const [nom, schema] of Object.entries(props)) {
    const affine = affiner(schema);
    sortie[nom] = estObjet(affine) ? { ...affine, ...regle(nom, affine) } : affine;
  }
  return sortie;
}
