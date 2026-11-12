// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// REUSE-IgnoreStart (ce fichier cite des étiquettes SPDX dans ses chaînes de test)
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { problemeLicenceSpdx } from "../spdx.ts";

const LICENCE_CODE = "AGPL-3.0-or-later";
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
test("chaque schéma JSON déclare la licence du code dans $comment, et REUSE.toml la déclare pour schemas/**", () => {
  const schemas = readdirSync("schemas").filter((f) => f.endsWith(".schema.json"));
  assert.equal(schemas.length, 3, `schémas trouvés: ${schemas.join(", ")}`);
  for (const f of schemas) {
    const { $comment } = JSON.parse(readFileSync(`schemas/${f}`, "utf8")) as { $comment?: string };
    assert.match($comment ?? "", new RegExp(`^SPDX-License-Identifier: ${LICENCE_CODE}; SPDX-FileCopyrightText: \\d{4} Robin Millette <`), f);
  }
  const reuse = readFileSync("REUSE.toml", "utf8");
  assert.match(reuse, /^version = 1$/m);
  assert.ok(reuse.includes('"schemas/**"'), "schemas/** annoté");
  assert.match(reuse, new RegExp(`SPDX-License-Identifier = "${LICENCE_CODE}"`));
  assert.match(reuse, /SPDX-FileCopyrightText = "\d{4} Robin Millette </);
});
test("LICENSES/ contient le texte de chaque licence utilisée, nommé par identifiant SPDX (convention REUSE)", () => {
  assert.match(readFileSync("LICENSES/AGPL-3.0-or-later.txt", "utf8"), /GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3, 19 November 2007/);
  assert.match(readFileSync("LICENSES/CC-BY-SA-4.0.txt", "utf8"), /Attribution-ShareAlike 4\.0 International/);
});
test("REUSE.toml déclare CC-BY-SA-4.0 pour les données et leurs dérivés, et la licence du code pour le reste", () => {
  const reuse = readFileSync("REUSE.toml", "utf8");
  for (const chemin of ["outils.json", "criteres.json", "tags.json", "sommaire.md", "graphiques/**", "analyses/**/*.json"]) {
    assert.ok(reuse.includes(`"${chemin}"`), `annoté: ${chemin}`);
  }
  assert.match(reuse, /SPDX-License-Identifier = "CC-BY-SA-4\.0"/);
  for (const chemin of ["README.md", "package.json", "tsconfig.json", "tsconfig.schemas.json", "nub.lock", ".gitignore", ".env.example", "spike-mion/**", "analyses/**/*.md"]) {
    assert.ok(reuse.includes(`"${chemin}"`), `annoté: ${chemin}`);
  }
});
// REUSE-IgnoreEnd
