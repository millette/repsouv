// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Adaptation d'un graphique au thème: seules les couleurs de fond et de texte changent.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chargerDonnees } from "../src/lib/donnees.ts";
import { statistiquesDuSite } from "../src/lib/statistiques.ts";
import { adapterAuTheme, CONTOUR, contraste, SOMBRE } from "../src/lib/themes-graphiques.ts";

const { graphiques } = await statistiquesDuSite(chargerDonnees("test/fixtures/valide"));
const PALETTE_SERIES = ["#009E73", "#56B4E9", "#E69F00", "#CC79A7", "#BBBBBB", "#D55E00", "#0072B2"];

test("le thème clair rend la spécification de la racine telle quelle", () => {
  for (const g of graphiques) assert.equal(adapterAuTheme(g.spec, "clair"), g.spec, g.id);
});

test("le thème sombre ne change que le fond et la configuration, sans modifier l'original", () => {
  for (const g of graphiques) {
    const avant = JSON.stringify(g.spec);
    const sombre = adapterAuTheme(g.spec, "sombre") as unknown as Record<string, unknown>;
    assert.equal(JSON.stringify(g.spec), avant, g.id);
    assert.equal(sombre.background, SOMBRE.fond, g.id);
    const original = g.spec as unknown as Record<string, unknown>;
    for (const cle of Object.keys(original)) if (cle !== "background" && cle !== "config") assert.deepEqual(sombre[cle], original[cle], `${g.id}: ${cle}`);
  }
});

test("les couleurs des séries ne sont pas remplacées", () => {
  const remplacees = Object.values(SOMBRE).map((c) => c.toLowerCase());
  for (const c of PALETTE_SERIES) assert.ok(!remplacees.includes(c.toLowerCase()), c);
  for (const g of graphiques) {
    const series = (JSON.stringify(g.spec).match(/#[0-9A-Fa-f]{6}/g) ?? []).filter((c) => PALETTE_SERIES.includes(c.toUpperCase()));
    const apres = JSON.stringify(adapterAuTheme(g.spec, "sombre"));
    for (const c of series) assert.ok(apres.includes(c), `${g.id}: ${c}`);
  }
});

test("le texte du thème sombre est lisible sur son fond (contraste d'au moins 4,5 pour 1)", () => {
  assert.ok(contraste("#ffffff", "#000000") > 20.9);
  assert.ok(contraste(SOMBRE.texte, SOMBRE.fond) >= 4.5);
  assert.ok(contraste(SOMBRE.discret, SOMBRE.fond) >= 4.5);
  assert.ok(contraste(SOMBRE.axe, SOMBRE.fond) >= 3);
  assert.ok(contraste(CONTOUR.sombre, SOMBRE.fond) >= 4.5);
});
