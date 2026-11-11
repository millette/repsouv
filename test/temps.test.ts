// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { horodatage, localVersIso } from "../temps.ts";

test("horodatage: heure de Toronto avec décalage, hiver (EST, -05:00)", () => {
  assert.equal(horodatage(new Date("2026-11-11T21:42:07Z")), "2026-11-11T16:42:07-05:00");
});
test("horodatage: heure d'été (EDT, -04:00)", () => {
  assert.equal(horodatage(new Date("2026-07-01T12:00:00Z")), "2026-07-01T08:00:00-04:00");
});
test("horodatage: minuit et changement de jour (pas d'heure « 24 »)", () => {
  assert.equal(horodatage(new Date("2026-11-12T05:00:00Z")), "2026-11-12T00:00:00-05:00");
});
test("horodatage: par défaut, l'heure actuelle à Toronto", () => {
  assert.match(horodatage(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[45]:00$/);
});
test("horodatage: le fuseau peut changer (UTC donne +00:00)", () => {
  assert.equal(horodatage(new Date("2026-11-11T21:42:07Z"), "UTC"), "2026-11-11T21:42:07+00:00");
});

test("localVersIso: ajoute le décalage de Toronto, selon la saison", () => {
  assert.equal(localVersIso(2026, 11, 5, 9, 53), "2026-11-05T09:53:00-05:00");
  assert.equal(localVersIso(2026, 7, 5, 10, 0), "2026-07-05T10:00:00-04:00");
});
test("localVersIso: juste avant et juste après le passage à l'heure d'été (8 mars 2026, 2 h)", () => {
  assert.equal(localVersIso(2026, 3, 8, 1, 59), "2026-03-08T01:59:00-05:00");
  assert.equal(localVersIso(2026, 3, 8, 3, 0), "2026-03-08T03:00:00-04:00");
});
test("localVersIso: l'instant produit correspond bien à l'heure locale demandée", () => {
  for (const [a, m, j, h, mi] of [[2026, 1, 15, 0, 0], [2026, 6, 30, 23, 59], [2026, 11, 1, 12, 0], [2026, 11, 2, 0, 30]] as const) {
    const iso = localVersIso(a, m, j, h, mi);
    assert.equal(horodatage(new Date(iso)), iso, iso);
  }
});
