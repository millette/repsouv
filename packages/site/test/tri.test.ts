// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Règle de tri de l'explorateur (specs/002-explorateur-outils/data-model.md): toujours déterminée, départagée par le nom.
import assert from "node:assert/strict";
import { test } from "node:test";
import { trier } from "../src/lib/tri.ts";
import { outil } from "./explorateur-fixtures.ts";

const categories = ["messagerie", "bureautique"];
const noms = (liste: { nom: string }[]) => liste.map((o) => o.nom);
const outils = [
  outil({ nom: "framapad", categorie: "bureautique", score: 2 }),
  outil({ nom: "Élodia", categorie: "bureautique", score: 3 }),
  outil({ nom: "Zimbra", categorie: "messagerie", score: 2 }),
  outil({ nom: "outil 10", categorie: "messagerie", score: 0 }),
  outil({ nom: "outil 2", categorie: "messagerie", score: 0 }),
];

test("par nom: ordre français, sans égard à la casse ni aux accents, nombres comparés comme des nombres", () => {
  assert.deepEqual(noms(trier(outils, "nom", "asc", categories)), ["Élodia", "framapad", "outil 2", "outil 10", "Zimbra"]);
  assert.deepEqual(noms(trier(outils, "nom", "desc", categories)), ["Zimbra", "outil 10", "outil 2", "framapad", "Élodia"]);
});

test("par score: égalités départagées par le nom, toujours croissant", () => {
  assert.deepEqual(noms(trier(outils, "score", "asc", categories)), ["outil 2", "outil 10", "framapad", "Zimbra", "Élodia"]);
  assert.deepEqual(noms(trier(outils, "score", "desc", categories)), ["Élodia", "framapad", "Zimbra", "outil 2", "outil 10"]);
});

test("par catégorie: selon le rang des catégories dans les données, puis par nom", () => {
  assert.deepEqual(noms(trier(outils, "categorie", "asc", categories)), ["outil 2", "outil 10", "Zimbra", "Élodia", "framapad"]);
  assert.deepEqual(noms(trier(outils, "categorie", "desc", categories)), ["Élodia", "framapad", "outil 2", "outil 10", "Zimbra"]);
});

test("le tableau reçu n'est pas modifié", () => {
  const avant = noms(outils);
  trier(outils, "nom", "asc", categories);
  assert.deepEqual(noms(outils), avant);
});
