// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Données de l'explorateur, dérivées au build des cinq fichiers du dépôt (specs/002-explorateur-outils/contracts/donnees.md).
import assert from "node:assert/strict";
import { test } from "node:test";
import { chargerDonnees } from "../src/lib/donnees.ts";
import { donneesExplorateur } from "../src/lib/explorateur.ts";

const e = donneesExplorateur(chargerDonnees("test/fixtures/valide"));
const outil = (nom: string) => e.outils.find((o) => o.nom === nom)!;

test("exactement les outils actifs, dans l'ordre des données, avec un identifiant de fiche unique", () => {
  assert.deepEqual(e.outils.map((o) => o.id), ["nuage-complet", "elodia-notes", "nuage-facile", "automate", "mystere"]);
});

test("les champs toujours présents", () => {
  for (const o of e.outils) {
    for (const champ of ["id", "nom", "categorie", "score", "statut", "tags", "source", "enrichi", "remplace", "deduits", "description"]) assert.ok(champ in o, `${o.nom}: ${champ}`);
  }
});

test("aucun champ null: une valeur absente n'a pas de champ", () => {
  assert.ok(!JSON.stringify(e).includes("null"));
  assert.ok(!("pays" in outil("Nuage Complet")));
  assert.ok(!("scoreEstime" in outil("Nuage Complet")));
  assert.ok(!("licence" in outil("Mystère")));
  assert.ok(!("verdicts" in outil("Mystère")));
});

test("outil enrichi: statut, licence, tags, verdicts de chaque critère, critères déduits", () => {
  assert.deepEqual(outil("Nuage Complet"), {
    id: "nuage-complet",
    nom: "Nuage Complet",
    categorie: "bureautique",
    score: 3,
    statut: "libre",
    tags: ["chiffrement", "auto-hebergement"],
    source: "praxis",
    enrichi: true,
    licence: "AGPL-3.0-or-later",
    remplace: [],
    verdicts: { donnees: "confirme", controle: "infirme", dependance: "indetermine" },
    deduits: ["donnees", "controle", "dependance"],
    description: "Suite collaborative libre.",
  });
});

test("outil non enrichi: statut non-enrichi, sans tags ni licence ni verdicts", () => {
  const o = outil("Mystère");
  assert.equal(o.statut, "non-enrichi");
  assert.equal(o.enrichi, false);
  assert.deepEqual(o.tags, []);
  assert.equal(o.scoreEstime, true);
  assert.equal(o.pays, "EU");
});

test("licence maison, services remplacés par nom d'hôte, critères vérifiés tous indéterminés", () => {
  assert.equal(outil("Automate").licence, "Licence d'usage durable");
  assert.deepEqual(outil("Nuage FACiLe").remplace, ["drive.google.com", "dropbox.com"]);
  assert.deepEqual(outil("Nuage FACiLe").verdicts, { donnees: "indetermine", controle: "indetermine", dependance: "indetermine" });
});

test("les référentiels ne portent que les valeurs d'un outil actif", () => {
  assert.deepEqual(e.categories, [{ id: "bureautique", nom: "Bureautique", icone: "📝" }, { id: "automatisation", nom: "Automatisation", icone: "⚙️" }]);
  assert.deepEqual(e.tags, ["chiffrement", "auto-hebergement"]);
  assert.deepEqual(e.sources.map((s) => s.id), ["praxis", "facil", "charles"]);
  assert.deepEqual(e.criteres.map((c) => [c.id, c.icon]), [["donnees", "📍"], ["controle", "🏢"], ["dependance", "🔗"]]);
  assert.deepEqual(e.pays, [{ code: "DE", nom: "Allemagne" }, { code: "EU", nom: "Union européenne" }]);
});

test("meta porte la licence et la date des données", () => {
  assert.deepEqual(e.meta, { data_license: "CC-BY-SA-4.0", updated_at: "2026-11-13T10:28:10-05:00" });
});
