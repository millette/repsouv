// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Provenance de chaque champ affiché (principe II de la constitution): une seule table, quatre provenances.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAMPS, LIBELLES_PROVENANCE, provenanceDe } from "../src/lib/provenance.ts";

test("chaque champ affiché a exactement une provenance connue", () => {
  for (const champ of Object.keys(CHAMPS)) assert.ok(["source", "heuristique", "ia", "openhub"].includes(provenanceDe(champ as keyof typeof CHAMPS)), champ);
});

test("provenance des champs, d'après data-model.md", () => {
  for (const c of ["nom", "categorie", "score", "description", "lien", "pays", "alternative_a", "instance_de", "source_repertoire_id"] as const) assert.equal(provenanceDe(c), "source", c);
  for (const c of ["criteres", "confiance", "score_estime", "voir_aussi"] as const) assert.equal(provenanceDe(c), "heuristique", c);
  for (const c of ["description_longue", "tags", "source", "licence", "custom_license", "custom_license_url", "repo", "evaluation_enrichie", "criteres_confirmes", "description_categorie"] as const) assert.equal(provenanceDe(c), "ia", c);
  for (const c of ["openhub", "openhub_id"] as const) assert.equal(provenanceDe(c), "openhub", c);
});

test("libellés de provenance", () => {
  assert.equal(LIBELLES_PROVENANCE.ia, "Produit par IA, à vérifier");
  assert.equal(LIBELLES_PROVENANCE.heuristique, "Déduit par ce dépôt");
  assert.equal(LIBELLES_PROVENANCE.openhub, "Données publiques d'Open Hub");
  assert.equal(LIBELLES_PROVENANCE.source, "Selon la source");
});
