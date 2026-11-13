// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Génère donnees/schemas/{outils,categories,criteres,tags,sources}.schema.json (JSON Schema 2020-12) à partir des types de
// schemas-types.ts, avec mion RunTypes. Les appels createJsonSchemaFn<T>() ne fonctionnent qu'après la
// transformation faite par le plugin RunTypes: ce fichier est donc empaqueté par obuild (build.config.ts)
// avant d'être exécuté, voir les scripts `schemas` et `schemas:verifier` de package.json.
//
// Usage: nub dist/generer-schemas.mjs [--verifier]
//   --verifier: n'écrit rien; échoue si un schéma commité diffère de celui que les types produisent.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createJsonSchemaFn } from "@mionjs/run-types";
import { affiner } from "./affiner-schema.ts";
import type { FichierCategories, FichierCriteres, FichierOutils, FichierSources, FichierTags } from "./schemas-types.ts";

// Ce module s'exécute empaqueté (packages/scripts/dist/generer-schemas.mjs): la racine du dépôt est trois dossiers plus haut.
const DOSSIER = join(import.meta.dirname, "..", "..", "..", "donnees", "schemas");
const DIALECTE = "https://json-schema.org/draft/2020-12/schema";
/** Licence déclarée dans chaque schéma (JSON n'admet pas d'en-tête); la même que dans REUSE.toml et package.json. */
const LICENCE = "SPDX-License-Identifier: AGPL-3.0-or-later; SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>";

const generateurs = {
  outils: { titre: "outils.json: outils du répertoire", schema: createJsonSchemaFn<FichierOutils>() },
  categories: { titre: "categories.json: catégories du répertoire", schema: createJsonSchemaFn<FichierCategories>() },
  criteres: { titre: "criteres.json: critères de souveraineté numérique", schema: createJsonSchemaFn<FichierCriteres>() },
  tags: { titre: "tags.json: vocabulaire des tags", schema: createJsonSchemaFn<FichierTags>() },
  sources: { titre: "sources.json: sources des outils (répertoires extraits, collections ajoutées à la main)", schema: createJsonSchemaFn<FichierSources>() },
};

/** Texte du fichier de schéma. `portable` retire les mots-clés propres à RunTypes (jsType). */
function texte(nom: keyof typeof generateurs): string {
  const { titre, schema } = generateurs[nom];
  const doc = affiner(schema({ libraryOptions: { portable: true } }));
  return `${JSON.stringify({ $schema: DIALECTE, $comment: LICENCE, title: titre, ...doc }, null, 2)}\n`;
}

const verifier = process.argv.includes("--verifier");
const differents: string[] = [];
if (!verifier) mkdirSync(DOSSIER, { recursive: true });
for (const nom of Object.keys(generateurs) as (keyof typeof generateurs)[]) {
  const chemin = join(DOSSIER, `${nom}.schema.json`);
  const attendu = texte(nom);
  if (verifier) {
    if (!existsSync(chemin) || readFileSync(chemin, "utf8") !== attendu) differents.push(chemin);
  } else {
    writeFileSync(chemin, attendu);
    console.log(`écrit: ${chemin}`);
  }
}
if (verifier) {
  if (differents.length > 0) {
    console.error(`Schémas périmés ou absents: ${differents.join(", ")}. Lancer « nub run schemas ».`);
    process.exit(1);
  }
  console.log("Schémas à jour.");
}
