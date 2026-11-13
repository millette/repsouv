// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Rendu d'un graphique en image, dans Node, sans vl-convert.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chargerDonnees } from "../src/lib/donnees.ts";
import { compilerVega, rendreSvg } from "../src/lib/rendu.ts";
import { statistiquesDuSite } from "../src/lib/statistiques.ts";
import { adapterAuTheme, SOMBRE } from "../src/lib/themes-graphiques.ts";

const { graphiques } = statistiquesDuSite(chargerDonnees("test/fixtures/valide"));

test("chaque graphique se compile en spécification Vega", () => {
  for (const g of graphiques) {
    const vega = compilerVega(g.spec) as { marks?: unknown[]; signals?: unknown[] };
    assert.ok(Array.isArray(vega.marks), g.id);
  }
});

test("chaque graphique se rend en SVG, dans les deux thèmes", async () => {
  for (const g of graphiques) {
    const clair = await rendreSvg(g.spec);
    assert.ok(clair.startsWith("<svg"), g.id);
    const sombre = await rendreSvg(adapterAuTheme(g.spec, "sombre"));
    assert.ok(sombre.toLowerCase().includes(SOMBRE.fond), g.id);
    assert.ok(!clair.toLowerCase().includes(SOMBRE.fond), g.id);
  }
});
