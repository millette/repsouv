// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Choix du thème (clair ou sombre): préférence enregistrée, sinon celle du système. Sans navigateur.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CLE_THEME, lireTheme, themeInitial } from "../src/lib/theme.ts";

test("lireTheme: seuls « light » et « dark » sont des préférences enregistrées", () => {
  assert.equal(CLE_THEME, "theme");
  assert.equal(lireTheme("dark"), "dark");
  assert.equal(lireTheme("light"), "light");
  assert.equal(lireTheme(null), null);
  assert.equal(lireTheme("cupcake"), null);
});

test("themeInitial: la préférence enregistrée l'emporte, sinon le thème du système", () => {
  assert.equal(themeInitial("light", true), "light");
  assert.equal(themeInitial("dark", false), "dark");
  assert.equal(themeInitial(null, true), "dark");
  assert.equal(themeInitial(null, false), "light");
  assert.equal(themeInitial("cupcake", true), "dark");
});
