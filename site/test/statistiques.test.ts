// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Statistiques du site: celles de la racine, et les chiffres clés de la page.
import assert from "node:assert/strict";
import { test } from "node:test";
import { IDS_GRAPHIQUES } from "../../graphiques.ts";
import { chargerDonnees } from "../src/lib/donnees.ts";
import { chiffresCles, statistiquesDuSite } from "../src/lib/statistiques.ts";

const donnees = chargerDonnees("test/fixtures/valide");
const { stats, graphiques } = await statistiquesDuSite(donnees);

test("les statistiques et les graphiques sont ceux de la racine, pour les outils actifs", () => {
  assert.equal(stats.total, 5);
  assert.deepEqual(stats.retires, ["Disparu"]);
  assert.ok(graphiques.length > 0);
  for (const g of graphiques) {
    assert.ok((IDS_GRAPHIQUES as readonly string[]).includes(g.id), g.id);
    assert.ok(Array.isArray((g.spec as { data?: { values?: unknown[] } }).data?.values), g.id);
  }
});

test("chiffres clés: outils, catégories, étoiles, estimés, enrichis, provenance, pays", () => {
  const c = chiffresCles(stats, donnees);
  assert.equal(c.outils, 5);
  assert.equal(c.categories, 2);
  assert.deepEqual(c.etoiles, [{ etoiles: 3, outils: 1 }, { etoiles: 2, outils: 2 }, { etoiles: 1, outils: 1 }, { etoiles: 0, outils: 1 }]);
  assert.equal(c.etoiles.reduce((s, e) => s + e.outils, 0), c.outils);
  assert.equal(c.moyenne, stats.scores.moyen);
  assert.equal(c.estimes, 3);
  assert.equal(c.enrichis, 3);
  assert.deepEqual(c.provenance.map((p) => [p.id, p.outils]).sort(), [["charles", 2], ["facil", 1], ["praxis", 2]]);
  assert.deepEqual(c.pays.map((p) => [p.code, p.nom, p.outils]).sort(), [["DE", "Allemagne", 1], ["EU", "Union européenne", 1]]);
  assert.equal(c.avecPays, 2);
});
