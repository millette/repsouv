// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// La version de Node.js est épinglée une seule fois: .node-version (lue par nub, pour le développement) et
// engines.node de package.json (pour qui exécute les scripts avec node) disent la même chose, et la documentation la cite.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const nodeVersion = readFileSync(".node-version", "utf8").trim();
const engines = JSON.parse(readFileSync("package.json", "utf8")).engines as { node?: string } | undefined;

test(".node-version est une version exacte de Node.js", () => {
  assert.match(nodeVersion, /^\d+\.\d+\.\d+$/);
});
test("package.json engines.node accepte .node-version et ses versions suivantes de la même majeure (^)", () => {
  assert.equal(engines?.node, `^${nodeVersion}`);
});
test("la documentation cite cette version", () => {
  for (const f of ["README.md", "implementation.md"]) {
    assert.ok(readFileSync(f, "utf8").includes(`\`${nodeVersion}\``), f);
  }
});
