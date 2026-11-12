// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Précise un schéma JSON produit par RunTypes avec ce que les types TypeScript n'expriment pas:
//   - les objets refusent les clés inconnues (additionalProperties: false), comme le fait fichiers.ts;
//   - `score` est un entier de 0 à 3, `echecs_enrichissement`, `echecs_confirmation` et `echecs_openhub` des entiers d'au moins 1, `tags` compte de 1 à 5 identifiants distincts;
//   - les dates sont des horodatages ISO 8601 avec décalage (même motif que fichiers.ts);
//   - les URL (lien, url, pdc, donnees, alternative_a) sont en http(s), les courriels (soumis_par.email) ont la forme usuelle;
//   - les identifiants (id, categorie et source_repertoire_id des outils) sont des slugs; outils[].categorie renvoie à categories[].id de categories.json
//     (relation entre fichiers, que JSON Schema ne peut exprimer qu'en commentaire; le test schemas.test.ts la vérifie).
// Les règles s'appliquent par nom de propriété. Les règles de croisement (licence SPDX, tags présents dans
// tags.json, score égal au nombre de critères) restent dans les validateurs et les tests.
export const HORODATAGE = "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$";
const CHAMPS_HORODATAGE = new Set(["derniere_modification", "enrichi_le", "created_at", "updated_at"]);
/** Identifiants: minuscules, chiffres et tirets (slug; voir categories.ts), pour les id des catégories, des critères et des tags. */
export const SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";
/** URL http(s) (lien d'un outil, pages d'une source, alternatives). */
export const URL_HTTP = "^https?://\\S+$";
/** Adresse de courriel (addr-spec usuel de la RFC 5322), même motif que sources.ts. */
export const COURRIEL = "^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$";
const CHAMPS_URL = new Set(["lien", "url", "pdc"]);

type Noeud = Record<string, unknown>;
const estObjet = (x: unknown): x is Noeud => typeof x === "object" && x !== null && !Array.isArray(x);

/** Règle propre à une propriété, selon son nom et la forme de son schéma; retourne ce qu'il faut ajouter. */
function regle(nom: string, schema: Noeud, freres: Set<string>): Noeud {
  if (nom === "score") return { type: "integer", minimum: 0, maximum: 3 };
  if (nom === "categorie" && schema.type === "string") return { pattern: SLUG, $comment: "identifiant d'une catégorie: categories[].id de categories.json" };
  if (nom === "id" && schema.type === "string") return { pattern: SLUG };
  if (nom === "source_repertoire_id" && schema.type === "string") return { pattern: SLUG, $comment: "identifiant d'une source: sources[].id de sources.json" };
  if ((CHAMPS_URL.has(nom) || (nom === "donnees" && freres.has("extracteur"))) && schema.type === "string") return { pattern: URL_HTTP };
  if (nom === "email" && schema.type === "string") return { pattern: COURRIEL };
  if (nom === "echecs_enrichissement" || nom === "echecs_confirmation" || nom === "echecs_openhub") return { type: "integer", minimum: 1 };
  if (CHAMPS_HORODATAGE.has(nom) && schema.type === "string") return { pattern: HORODATAGE };
  const elements = schema.items;
  if (schema.type === "array" && estObjet(elements) && elements.type === "string") {
    if (nom === "tags") return { minItems: 1, maxItems: 5, uniqueItems: true };
    if (nom === "alternative_a") return { minItems: 1, uniqueItems: true, items: { ...elements, pattern: URL_HTTP } };
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
    sortie[nom] = estObjet(affine) ? { ...affine, ...regle(nom, affine, new Set(Object.keys(props))) } : affine;
  }
  return sortie;
}
