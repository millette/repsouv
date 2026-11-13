// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les trois lectures des critères d'un outil (data-model.md): vérifiés avec citation, déduits des étoiles, second avis.
import assert from "node:assert/strict";
import { test } from "node:test";
import { lecturesCriteres } from "../src/lib/criteres.ts";
import { chargerDonnees } from "../src/lib/donnees.ts";

const d = chargerDonnees("test/fixtures/valide");
const lectures = (nom: string) => lecturesCriteres(d.outils.find((o) => o.nom === nom)!, d.criteres);

test("critères vérifiés: confirmé avec sa preuve, infirmé avec sa citation, indéterminé sans citation", () => {
  const { verifies } = lectures("Nuage Complet");
  assert.ok(verifies);
  assert.deepEqual(verifies.verdicts.map((v) => [v.critere.id, v.statut, v.citation]), [
    ["donnees", "confirme", "Vos données restent sur votre serveur."],
    ["controle", "infirme", "Société établie aux États-Unis."],
    ["dependance", "indetermine", undefined],
  ]);
  assert.equal(verifies.modele, "gpt-6.1-sol");
  assert.equal(verifies.date, "2026-11-12T12:45:00-05:00");
});

test("critères vérifiés sans aucun verdict: trois indéterminés", () => {
  assert.deepEqual(lectures("Nuage FACiLe").verifies!.verdicts.map((v) => v.statut), ["indetermine", "indetermine", "indetermine"]);
});

test("critères déduits: toujours présents, avec leur fiabilité, dans l'ordre de criteres.json", () => {
  const { deduits } = lectures("Nuage Complet");
  assert.deepEqual(deduits.criteres.map((c) => c.id), ["donnees", "controle", "dependance"]);
  assert.equal(deduits.confiance, "élevée");
  assert.equal(lectures("Mystère").deduits.confiance, "indéterminée");
  assert.deepEqual(lectures("Automate").deduits.criteres, []);
});

test("second avis: score, critères, fiabilité et écart quand il existe", () => {
  const { secondAvis } = lectures("Nuage Complet");
  assert.ok(secondAvis);
  assert.equal(secondAvis.score, 2);
  assert.deepEqual(secondAvis.criteres.map((c) => c.id), ["donnees", "dependance"]);
  assert.equal(secondAvis.confiance, "moyenne");
  assert.equal(secondAvis.ecart, "La page ne dit pas qui contrôle l'éditeur.");
  assert.equal(lectures("Nuage FACiLe").secondAvis!.ecart, undefined);
});

test("un outil non enrichi n'a que les critères déduits", () => {
  const l = lectures("Mystère");
  assert.equal(l.verifies, undefined);
  assert.equal(l.secondAvis, undefined);
});
