// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Nombres et pourcentages à la française.
import assert from "node:assert/strict";
import { test } from "node:test";
import { decimal, nombre, part, pourcent } from "../src/lib/nombres.ts";

test("nombre: milliers séparés par une espace", () => {
  assert.equal(nombre(3938168), "3 938 168");
  assert.equal(nombre(154), "154");
});

test("decimal: virgule décimale, deux décimales au plus", () => {
  assert.equal(decimal(1.16), "1,16");
  assert.equal(decimal(2), "2");
  assert.equal(decimal(1.1649), "1,16");
});

test("pourcent et part: une décimale au plus, virgule, espace avant le signe", () => {
  assert.equal(pourcent(36.36), "36,4 %");
  assert.equal(pourcent(50), "50 %");
  assert.equal(part(56, 154), "36,4 %");
  assert.equal(part(1, 0), "0 %");
});
