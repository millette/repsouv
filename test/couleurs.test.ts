// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { couleursActives, creerCouleurs } from "../couleurs.ts";

const terminal = { isTTY: true };
const redirige = { isTTY: false };
const sansIsTTY = {};

test("couleursActives: seulement dans un terminal, par défaut", () => {
  assert.equal(couleursActives(terminal, {}), true);
  assert.equal(couleursActives(redirige, {}), false);
  assert.equal(couleursActives(sansIsTTY, {}), false);
});
test("couleursActives: NO_COLOR (non vide) les interdit, même dans un terminal ou avec FORCE_COLOR", () => {
  assert.equal(couleursActives(terminal, { NO_COLOR: "1" }), false);
  assert.equal(couleursActives(terminal, { NO_COLOR: "1", FORCE_COLOR: "1" }), false);
  assert.equal(couleursActives(terminal, { NO_COLOR: "" }), true); // une valeur vide est ignorée (no-color.org)
});
test("couleursActives: FORCE_COLOR les impose hors terminal, sauf « 0 » et « false »", () => {
  assert.equal(couleursActives(redirige, { FORCE_COLOR: "1" }), true);
  assert.equal(couleursActives(redirige, { FORCE_COLOR: "true" }), true);
  assert.equal(couleursActives(terminal, { FORCE_COLOR: "0" }), false);
  assert.equal(couleursActives(terminal, { FORCE_COLOR: "false" }), false);
  assert.equal(couleursActives(redirige, { FORCE_COLOR: "" }), false);
});
test("couleursActives: un terminal « dumb » n'a pas de couleurs; --sans-couleur les interdit toujours", () => {
  assert.equal(couleursActives(terminal, { TERM: "dumb" }), false);
  assert.equal(couleursActives(terminal, { TERM: "xterm-256color" }), true);
  assert.equal(couleursActives(terminal, { FORCE_COLOR: "1" }, true), false);
});

test("couleurs inactives: chaque fonction rend le texte tel quel", () => {
  const c = creerCouleurs(false);
  assert.equal(c.actif, false);
  for (const peindre of [c.gras, c.attenue, c.rouge, c.vert, c.jaune, c.magenta, c.cyan]) assert.equal(peindre("texte"), "texte");
});
test("couleurs actives: codes ANSI ouvrants et fermants", () => {
  const c = creerCouleurs(true);
  assert.equal(c.actif, true);
  assert.equal(c.rouge("x"), "\x1b[31mx\x1b[39m");
  assert.equal(c.vert("x"), "\x1b[32mx\x1b[39m");
  assert.equal(c.jaune("x"), "\x1b[33mx\x1b[39m");
  assert.equal(c.cyan("x"), "\x1b[36mx\x1b[39m");
  assert.equal(c.magenta("x"), "\x1b[35mx\x1b[39m");
  assert.equal(c.gras("x"), "\x1b[1mx\x1b[22m");
  assert.equal(c.attenue("x"), "\x1b[2mx\x1b[22m");
});
test("couleurs actives: gras et couleur s'imbriquent sans s'annuler", () => {
  const c = creerCouleurs(true);
  assert.equal(c.gras(c.rouge("x")), "\x1b[1m\x1b[31mx\x1b[39m\x1b[22m");
});
