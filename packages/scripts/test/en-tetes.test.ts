// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// REUSE-IgnoreStart (ce fichier cite des étiquettes SPDX dans ses chaînes de test)
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { problemeLicenceSpdx } from "../spdx.ts";
import { depuisRacine } from "./racine.ts";

/** Lit un fichier du dépôt, donné depuis sa racine. */
const lire = (chemin: string) => readFileSync(depuisRacine(chemin), "utf8");

const LICENCE_CODE = "AGPL-3.0-or-later";
// Le code commun, celui des scripts, leurs tests, et le banc d'essai, depuis la racine du dépôt.
const sources = ["packages/commun", "packages/commun/test", "packages/scripts", "packages/scripts/test", "packages/scripts/test/donnees", "analyse-effort"].flatMap((d) => readdirSync(depuisRacine(d)).filter((f) => f.endsWith(".ts")).map((f) => `${d}/${f}`));

test("la licence du code est un identifiant SPDX valide, le même dans package.json", () => {
  assert.equal(problemeLicenceSpdx(LICENCE_CODE), null);
  assert.equal(JSON.parse(lire("package.json")).license, LICENCE_CODE);
});
test("chaque fichier source commence par les en-têtes SPDX (licence et droit d'auteur)", () => {
  assert.ok(sources.length >= 15, `fichiers trouvés: ${sources.length}`);
  for (const f of sources) {
    const [licence, droit] = lire(f).split("\n");
    assert.equal(licence, `// SPDX-License-Identifier: ${LICENCE_CODE}`, f);
    assert.match(droit ?? "", /^\/\/ SPDX-FileCopyrightText: \d{4} Robin Millette </, f);
  }
});
test("les textes des licences sont présents: AGPL-3.0 pour le code, CC BY-SA 4.0 pour les données", () => {
  assert.match(lire("LICENSE"), /GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3, 19 November 2007/);
  assert.match(lire("LICENSE-CC-BY-SA-4.0"), /^Attribution-ShareAlike 4\.0 International/);
});
test("chaque schéma JSON déclare la licence du code dans $comment, et REUSE.toml la déclare pour donnees/schemas/**", () => {
  const schemas = readdirSync(depuisRacine("donnees/schemas")).filter((f) => f.endsWith(".schema.json"));
  assert.equal(schemas.length, 5, `schémas trouvés: ${schemas.join(", ")}`);
  for (const f of schemas) {
    const { $comment } = JSON.parse(lire(`donnees/schemas/${f}`)) as { $comment?: string };
    assert.match($comment ?? "", new RegExp(`^SPDX-License-Identifier: ${LICENCE_CODE}; SPDX-FileCopyrightText: \\d{4} Robin Millette <`), f);
  }
  const reuse = lire("REUSE.toml");
  assert.match(reuse, /^version = 1$/m);
  assert.ok(reuse.includes('"donnees/schemas/**"'), "donnees/schemas/** annoté");
  assert.match(reuse, new RegExp(`SPDX-License-Identifier = "${LICENCE_CODE}"`));
  assert.match(reuse, /SPDX-FileCopyrightText = "\d{4} Robin Millette </);
});
test("LICENSES/ contient le texte de chaque licence utilisée, nommé par identifiant SPDX (convention REUSE)", () => {
  assert.match(lire("LICENSES/AGPL-3.0-or-later.txt"), /GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3, 19 November 2007/);
  assert.match(lire("LICENSES/CC-BY-SA-4.0.txt"), /Attribution-ShareAlike 4\.0 International/);
  assert.match(lire("LICENSES/MIT.txt"), /^MIT License/);
});
test("REUSE.toml déclare CC-BY-SA-4.0 pour les données et leurs dérivés, et la licence du code pour le reste", () => {
  const reuse = lire("REUSE.toml");
  for (const chemin of ["donnees/outils.json", "donnees/categories.json", "donnees/criteres.json", "donnees/tags.json", "donnees/sources.json", "donnees/sommaire.md", "donnees/graphiques/**"]) {
    assert.ok(reuse.includes(`"${chemin}"`), `annoté: ${chemin}`);
  }
  assert.match(reuse, /SPDX-License-Identifier = "CC-BY-SA-4\.0"/);
  for (const chemin of [".claude/skills/charting-vega-lite/**", ".agents/skills/astro/**", ".claude/skills/astro/**", ".agents/skills/daisyui/**", ".claude/skills/daisyui/**", ".claude/skills/speckit-*/**", ".specify/**"]) {
    assert.ok(reuse.includes(`"${chemin}"`), `annoté: ${chemin} (skill ou outil installé, MIT)`);
  }
  assert.match(reuse, /SPDX-License-Identifier = "MIT"/);
  // skills-lock.json déclare sa propre licence (meta.$comment, comme les schémas) et celle de chaque skill installé (skills.<nom>.meta).
  const verrou = JSON.parse(lire("skills-lock.json")) as { meta?: { $comment?: string }; skills: Record<string, { source: string; meta?: { license?: string; copyright?: string; url?: string } }> };
  assert.match(verrou.meta?.$comment ?? "", new RegExp(`^SPDX-License-Identifier: ${LICENCE_CODE}; SPDX-FileCopyrightText: \\d{4} Robin Millette <`), "skills-lock.json: meta.$comment");
  for (const [nom, skill] of Object.entries(verrou.skills)) {
    assert.equal(skill.meta?.license, "MIT", `skills-lock.json: licence du skill ${nom}`);
    assert.match(skill.meta?.copyright ?? "", /^\d{4} .+ <https?:\/\/\S+>$/, `skills-lock.json: copyright du skill ${nom}`);
    assert.ok(reuse.includes(`<${skill.meta?.url}>`), `REUSE.toml: même dépôt d'origine que skills-lock.json pour ${nom}`);
    assert.ok(skill.meta?.url?.endsWith(skill.source), `skills-lock.json: url et source cohérents pour ${nom}`);
  }
  for (const chemin of ["README.md", "implementation.md", "historique.md", "package.json", "packages/commun/package.json", "packages/commun/tsconfig.json", "packages/scripts/package.json", "packages/scripts/tsconfig.json", "packages/scripts/tsconfig.schemas.json", "nub.lock", "skills-lock.json", ".gitignore", ".env.example"]) {
    assert.ok(reuse.includes(`"${chemin}"`), `annoté: ${chemin}`);
  }
});
// REUSE-IgnoreEnd
