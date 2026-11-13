// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Comparaison côte à côte de deux à quatre outils (specs/002-explorateur-outils/data-model.md).
import assert from "node:assert/strict";
import { test } from "node:test";
import { basculer, comparable, lignesComparaison } from "../src/lib/comparaison.ts";
import { donnees } from "./explorateur-fixtures.ts";

const outil = (id: string) => donnees.outils.find((o) => o.id === id)!;

test("basculer ajoute un outil, le retire s'il y est, et garde l'ordre du choix", () => {
  assert.deepEqual(basculer([], "a"), { liste: ["a"], refuse: false });
  assert.deepEqual(basculer(["a", "b"], "c"), { liste: ["a", "b", "c"], refuse: false });
  assert.deepEqual(basculer(["a", "b", "c"], "b"), { liste: ["a", "c"], refuse: false });
});

test("basculer refuse un cinquième outil et le signale", () => {
  assert.deepEqual(basculer(["a", "b", "c", "d"], "e"), { liste: ["a", "b", "c", "d"], refuse: true });
  assert.deepEqual(basculer(["a", "b", "c", "d"], "d"), { liste: ["a", "b", "c"], refuse: false });
});

test("comparable: de deux à quatre outils", () => {
  assert.deepEqual([0, 1, 2, 4, 5].map((n) => comparable(Array.from({ length: n }, (_, i) => String(i)))), [false, false, true, true, false]);
});

test("les lignes, dans l'ordre, avec leur provenance", () => {
  const lignes = lignesComparaison([outil("nuage-complet"), outil("mystere")], donnees);
  assert.deepEqual(lignes.map((l) => [l.id, l.titre, l.provenance]), [
    ["score", "Score", "source"],
    ["verdict-donnees", "Où peuvent rester les données ?", "ia"],
    ["verdict-controle", "Qui contrôle l'outil ?", "ia"],
    ["verdict-dependance", "De qui dépend-il pour fonctionner ?", "ia"],
    ["deduits", "Critères déduits des étoiles", "heuristique"],
    ["statut", "Statut du code source", "ia"],
    ["licence", "Licence", "ia"],
    ["pays", "Pays de l'éditeur", "source"],
    ["remplace", "Services remplacés", "source"],
  ]);
});

test("les cases d'un outil enrichi et celles d'un outil non enrichi, sans case vide", () => {
  const cases = Object.fromEntries(lignesComparaison([outil("nuage-complet"), outil("mystere")], donnees).map((l) => [l.id, l.cellules]));
  assert.deepEqual(cases, {
    score: ["3 étoiles sur 3", "1 étoile sur 3, score estimé"],
    "verdict-donnees": ["Confirmé", "Non vérifié"],
    "verdict-controle": ["Infirmé", "Non vérifié"],
    "verdict-dependance": ["Indéterminé", "Non vérifié"],
    deduits: ["Données, contrôle, dépendance", "Données"],
    statut: ["Libre", "Pas encore enrichi"],
    licence: ["AGPL-3.0-or-later", "Non connue"],
    pays: ["Non connu", "Union européenne"],
    remplace: ["Aucun connu", "Aucun connu"],
  });
});

test("services remplacés, licence maison et aucun critère déduit", () => {
  const cases = Object.fromEntries(lignesComparaison([outil("nuage-facile"), outil("automate")], donnees).map((l) => [l.id, l.cellules]));
  assert.deepEqual(cases.remplace, ["drive.google.com, dropbox.com", "Aucun connu"]);
  assert.deepEqual(cases.licence, ["AGPL-3.0-or-later", "Licence d'usage durable"]);
  assert.deepEqual(cases.deduits, ["Données, dépendance", "Aucun"]);
  assert.deepEqual(cases.pays, ["Non connu", "Allemagne"]);
});
