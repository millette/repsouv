// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Un clic simple sur le nom d'un outil ouvre la boîte de l'explorateur; un clic modifié suit le lien, comme partout.
import assert from "node:assert/strict";
import { test } from "node:test";
import { clicSimple } from "../src/lib/clic.ts";

const clic = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };

test("un clic du bouton principal, sans touche, est un clic simple", () => {
  assert.equal(clicSimple(clic), true);
});

for (const touche of ["ctrlKey", "metaKey", "shiftKey", "altKey"] as const) {
  test(`un clic avec ${touche} n'est pas un clic simple: le navigateur garde la main (nouvel onglet, téléchargement)`, () => {
    assert.equal(clicSimple({ ...clic, [touche]: true }), false);
  });
}

test("un clic d'un autre bouton n'est pas un clic simple", () => {
  assert.equal(clicSimple({ ...clic, button: 1 }), false);
});
