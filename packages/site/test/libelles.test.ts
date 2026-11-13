// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Textes d'interface tirés des données: étoiles, statuts, pays, nombres et dates en français.
import assert from "node:assert/strict";
import { test } from "node:test";
import { formaterDate, formaterNombre, LIBELLES_STATUT, nomHote, nomPays, texteEtoiles } from "../src/lib/libelles.ts";

test("texteEtoiles: équivalent textuel du score", () => {
  assert.equal(texteEtoiles(0), "0 étoile sur 3");
  assert.equal(texteEtoiles(1), "1 étoile sur 3");
  assert.equal(texteEtoiles(2), "2 étoiles sur 3");
});

test("libellés des statuts du code source", () => {
  assert.deepEqual(LIBELLES_STATUT, {
    libre: "Libre",
    partiel: "Partiellement libre",
    "source-disponible": "Code source disponible",
    proprietaire: "Propriétaire",
    "non-enrichi": "Pas encore enrichi",
  });
});

test("nomPays: nom français, codes EU et UK compris, code inconnu rendu tel quel", () => {
  assert.equal(nomPays("FR"), "France");
  assert.equal(nomPays("EU"), "Union européenne");
  assert.equal(nomPays("UK"), "Royaume-Uni");
  assert.equal(nomPays("ZZZ"), "ZZZ");
});

test("formaterNombre et formaterDate: format français, sans décalage de jour", () => {
  assert.equal(formaterNombre(3938168).replace(/\s/g, " "), "3 938 168");
  assert.equal(formaterDate("2026-11-12T23:50:00-05:00"), "12 novembre 2026");
  assert.equal(formaterDate("2026-11-01T00:10:00-04:00"), "1er novembre 2026");
});

test("nomHote: texte d'un lien vers un service remplacé", () => {
  assert.equal(nomHote("https://www.dropbox.com/"), "dropbox.com");
  assert.equal(nomHote("https://drive.google.com/x"), "drive.google.com");
});
