// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// La majeure de Node.js est fixée une seule fois: .node-version (pour nub et les autres gestionnaires de versions),
// devEngines.runtime (Node de développement, lu par nub en premier) et engines.node (pour qui exécute les scripts
// avec node) disent la même chose (>=26 <27), et la documentation la cite.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const nodeVersion = readFileSync(".node-version", "utf8").trim();
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const engines = pkg.engines as { node?: string } | undefined;
const runtime = pkg.devEngines?.runtime as { name?: string; version?: string; onFail?: string } | undefined;

test(".node-version est une majeure de Node.js seule (nub prend la dernière version de cette majeure)", () => {
  assert.match(nodeVersion, /^\d+$/);
});
test("package.json engines.node accepte toute version de cette majeure (>=N <N+1)", () => {
  assert.equal(engines?.node, `>=${nodeVersion} <${Number(nodeVersion) + 1}`);
});
test("package.json devEngines.runtime (Node de développement, lu par nub avant .node-version) dit la même plage, avec onFail warn", () => {
  assert.equal(runtime?.name, "node");
  assert.equal(runtime?.version, engines?.node);
  assert.equal(runtime?.onFail, "warn");
});
test("la documentation cite cette majeure comme prérequis", () => {
  for (const f of ["README.md", "implementation.md"]) {
    assert.ok(readFileSync(f, "utf8").includes(`Node.js ${nodeVersion}`), f);
  }
});
