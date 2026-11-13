// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// L'accueil n'affirme que ce que le dépôt documente: chaque logiciel cité figure dans la documentation ou dans les
// dépendances déclarées, et chaque étape correspond à une section de historique.md.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ETAPES, LOGICIELS } from "../src/lib/presentation.ts";

const documentation = ["../README.md", "../implementation.md", "../historique.md"].map((f) => readFileSync(f, "utf8")).join("\n");
const dependances = ["../package.json", "package.json"].flatMap((f) => {
  const p = JSON.parse(readFileSync(f, "utf8"));
  return [...Object.keys(p.dependencies ?? {}), ...Object.keys(p.devDependencies ?? {})];
});
const logiciels = LOGICIELS.flatMap((g) => g.logiciels);

test("chaque logiciel cité figure dans la documentation du dépôt ou dans ses dépendances", () => {
  for (const l of logiciels) {
    const documente = documentation.includes(l.nom);
    const declare = l.paquet !== undefined && dependances.includes(l.paquet);
    assert.ok(documente || declare, `${l.nom}: ni dans la documentation, ni dans les dépendances`);
    if (l.paquet !== undefined) assert.ok(dependances.includes(l.paquet), `${l.nom}: paquet « ${l.paquet} » non déclaré`);
  }
});

test("chaque logiciel a un nom unique, une adresse https et un rôle d'une phrase", () => {
  assert.equal(new Set(logiciels.map((l) => l.nom)).size, logiciels.length);
  for (const l of logiciels) {
    assert.match(l.url, /^https:\/\//, l.nom);
    assert.match(l.role, /\.$/, l.nom);
  }
});

test("chaque étape de la genèse correspond à une journée de historique.md", () => {
  for (const e of ETAPES) assert.ok(documentation.includes(`## ${e.date}`), e.date);
  assert.deepEqual(ETAPES.map((e) => e.date), [...ETAPES.map((e) => e.date)].sort());
});
