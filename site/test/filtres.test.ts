// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Forme de comparaison des noms, pour la recherche par nom.
import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliser } from "../src/lib/filtres.ts";

test("normaliser: minuscules, sans accents, sans espaces aux extrémités", () => {
  assert.equal(normaliser("ÉLODIA "), "elodia");
  assert.equal(normaliser("  Bouclier canadien"), "bouclier canadien");
});
