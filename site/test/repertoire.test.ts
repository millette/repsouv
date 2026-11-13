// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Ce que le site tire des données: outils actifs, groupes par catégorie, statut, outils apparentés, source.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chargerDonnees } from "../src/lib/donnees.ts";
import { apparentes, estEnrichi, groupesParCategorie, outilsActifs, sourceDe, statutDe } from "../src/lib/repertoire.ts";

const d = chargerDonnees("test/fixtures/valide");
const actifs = outilsActifs(d.outils);
const outil = (nom: string) => d.outils.find((o) => o.nom === nom)!;

test("outilsActifs écarte les outils retirés", () => {
  assert.deepEqual(actifs.map((o) => o.nom), ["Nuage Complet", "Élodia / Notes", "Nuage FACiLe", "Automate", "Mystère"]);
});

test("groupesParCategorie suit l'ordre des catégories et omet celles sans outil actif", () => {
  const groupes = groupesParCategorie(d.categories, actifs);
  assert.deepEqual(groupes.map((g) => g.categorie.id), ["bureautique", "automatisation"]);
  assert.deepEqual(groupes.map((g) => g.outils.length), [3, 2]);
});

test("estEnrichi et statutDe: le statut du code source, ou non-enrichi", () => {
  assert.equal(estEnrichi(outil("Nuage Complet")), true);
  assert.equal(estEnrichi(outil("Mystère")), false);
  assert.equal(statutDe(outil("Nuage Complet")), "libre");
  assert.equal(statutDe(outil("Automate")), "source-disponible");
  assert.equal(statutDe(outil("Mystère")), "non-enrichi");
});

test("apparentes: un lien pour un outil actif, le nom seul sinon", () => {
  assert.deepEqual(apparentes(outil("Nuage Complet"), actifs), [{ nom: "Nuage FACiLe", id: "nuage-facile" }, { nom: "Logiciel Absent" }]);
  assert.deepEqual(apparentes(outil("Mystère"), actifs), []);
});

test("sourceDe rend la source de l'outil", () => {
  assert.equal(sourceDe(outil("Nuage FACiLe"), d.sources).nom, "Services FACiLes");
});
