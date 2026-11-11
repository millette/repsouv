// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { problemeLicenceSpdx } from "../spdx.ts";

const LICENCE_CODE = "AGPL-3.0-only";
const sources = [...readdirSync(".").filter((f) => f.endsWith(".ts")), ...readdirSync("test").map((f) => `test/${f}`).filter((f) => f.endsWith(".ts"))];

test("la licence du code est un identifiant SPDX valide, le même dans package.json", () => {
  assert.equal(problemeLicenceSpdx(LICENCE_CODE), null);
  assert.equal(JSON.parse(readFileSync("package.json", "utf8")).license, LICENCE_CODE);
});
test("chaque fichier source commence par les en-têtes SPDX (licence et droit d'auteur)", () => {
  assert.ok(sources.length >= 15, `fichiers trouvés: ${sources.length}`);
  for (const f of sources) {
    const [licence, droit] = readFileSync(f, "utf8").split("\n");
    assert.equal(licence, `// SPDX-License-Identifier: ${LICENCE_CODE}`, f);
    assert.match(droit ?? "", /^\/\/ SPDX-FileCopyrightText: \d{4} Robin Millette </, f);
  }
});
test("les textes des licences sont présents: AGPL-3.0 pour le code, CC BY-SA 4.0 pour les données", () => {
  assert.match(readFileSync("LICENSE", "utf8"), /GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3, 19 November 2007/);
  assert.match(readFileSync("LICENSE-CC-BY-SA-4.0", "utf8"), /^Attribution-ShareAlike 4\.0 International/);
});
