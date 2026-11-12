// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Le sommaire généré (sommaire.md, graphiques/) existe, suit les conventions de la documentation, et tous les liens
// des fichiers Markdown du dépôt, y compris vers lui, sont valides. Exige un `nub run update` terminé.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { FICHIERS_GENERES, FICHIERS_MD, problemesConventions, problemesLiens } from "../markdown.ts";
import { exigerFichiers } from "./garde.ts";

exigerFichiers(FICHIERS_GENERES);

const lire = (f: string) => (existsSync(f) ? readFileSync(f, "utf8") : null);

test("tous les fichiers Markdown, générés compris, ont des liens relatifs et des ancres valides (dont les images de graphiques/)", () => {
  for (const f of FICHIERS_MD) assert.deepEqual(problemesLiens(f, lire(f)!, lire), [], f);
});

test("les fichiers générés respectent les conventions et disent par quel script ils sont produits", () => {
  for (const f of FICHIERS_GENERES) {
    assert.deepEqual(problemesConventions(f, lire(f)!), [], f);
    assert.match(lire(f)!, /Généré le .+ par .+\. Ne pas modifier/, f);
  }
});
