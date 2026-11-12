// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { estimerRestant, formaterDuree } from "../duree.ts";

test("formaterDuree: en français, secondes sous la minute, minutes au-delà, heures et minutes au-delà de l'heure", () => {
  assert.equal(formaterDuree(0), "0 s");
  assert.equal(formaterDuree(400), "0 s");
  assert.equal(formaterDuree(5_000), "5 s");
  assert.equal(formaterDuree(59_400), "59 s");
  assert.equal(formaterDuree(60_000), "1 min");
  assert.equal(formaterDuree(754_321), "13 min");
  assert.equal(formaterDuree(3_630_000), "1 h et 1 min");
  assert.equal(formaterDuree(7_500_000), "2 h et 5 min");
  assert.equal(formaterDuree(3 * 86_400_000 + 3_600_000), "3 j et 1 h");
});
test("formaterDuree: espaces ordinaires (pas d'espace insécable de la locale), millisecondes fractionnaires acceptées", () => {
  assert.doesNotMatch(formaterDuree(754_321), /[\u00a0\u202f]/);
  assert.equal(formaterDuree(1500.75), "2 s");
});
test("formaterDuree: une durée négative, infinie ou NaN est une erreur", () => {
  assert.throws(() => formaterDuree(-1), RangeError);
  assert.throws(() => formaterDuree(Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => formaterDuree(Number.NaN), RangeError);
});

test("estimerRestant: rythme moyen depuis le début, null tant que rien n'est terminé ou quand tout l'est", () => {
  assert.equal(estimerRestant({ ecoule: 1000, traites: 0, total: 10 }), null);
  assert.equal(estimerRestant({ ecoule: 20_000, traites: 2, total: 10 }), 80_000);
  assert.equal(estimerRestant({ ecoule: 90_000, traites: 9, total: 10 }), 10_000);
  assert.equal(estimerRestant({ ecoule: 100_000, traites: 10, total: 10 }), null);
  assert.equal(estimerRestant({ ecoule: 100_000, traites: 12, total: 10 }), null);
  assert.equal(estimerRestant({ ecoule: -5, traites: 2, total: 10 }), null); // horloge incohérente: pas d'estimation
});
