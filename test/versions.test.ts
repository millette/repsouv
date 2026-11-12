// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// La majeure de Node.js est fixée une seule fois: .node-version (lue par nub, pour le développement: la dernière 26.x)
// et engines.node de package.json (pour qui exécute les scripts avec node: >=26 <27) disent la même chose, et la
// documentation la cite.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const nodeVersion = readFileSync(".node-version", "utf8").trim();
const engines = JSON.parse(readFileSync("package.json", "utf8")).engines as { node?: string } | undefined;

test(".node-version est une majeure de Node.js seule (nub prend la dernière version de cette majeure)", () => {
  assert.match(nodeVersion, /^\d+$/);
});
test("package.json engines.node accepte toute version de cette majeure (>=N <N+1)", () => {
  assert.equal(engines?.node, `>=${nodeVersion} <${Number(nodeVersion) + 1}`);
});
test("la documentation cite cette majeure comme prérequis", () => {
  for (const f of ["README.md", "implementation.md"]) {
    assert.ok(readFileSync(f, "utf8").includes(`Node.js ${nodeVersion}`), f);
  }
});
