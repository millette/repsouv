// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { abandonne, abandonneOpenHub, aCompleterOpenHub, MAX_ECHECS_PAR_DEFAUT } from "../abandon.ts";
import type { OpenHub } from "../modele.ts";
import { enrichi, outil } from "./donnees-fictives.ts";

const OPENHUB: OpenHub = {
  organisation: null, activite: "High", licences: ["MIT"], langage_principal: null, lignes_de_code: null, contributeurs_total: null,
  contributeurs_12_mois: 5, commits_12_mois: 40, premier_mois: null, dernier_mois: null, consulte_le: "2026-11-13T10:00:00-05:00",
};

test("abandonne: à partir du nombre maximal d'échecs consécutifs d'enrichissement, trois par défaut", () => {
  assert.equal(MAX_ECHECS_PAR_DEFAUT, 3);
  assert.equal(abandonne(outil("A")), false);
  assert.equal(abandonne(outil("B", { echecs_enrichissement: 2 })), false);
  assert.equal(abandonne(outil("C", { echecs_enrichissement: 3 })), true);
});
test("abandonne: le nombre maximal est configurable", () => {
  assert.equal(abandonne(outil("A", { echecs_enrichissement: 5 }), 10), false);
  assert.equal(abandonne(outil("B", { echecs_enrichissement: 1 }), 1), true);
});
test("aCompleterOpenHub: outils enrichis au code public, sans données Open Hub, sous le nombre maximal d'échecs", () => {
  assert.equal(aCompleterOpenHub(enrichi("A")), true);
  assert.equal(aCompleterOpenHub(enrichi("B", { source: "partiel" })), true);
  assert.equal(aCompleterOpenHub(enrichi("C", { source: "source-disponible" })), true);
  assert.equal(aCompleterOpenHub(enrichi("D", { source: "proprietaire" })), false);
  assert.equal(aCompleterOpenHub(outil("E")), false, "pas encore enrichi");
  assert.equal(aCompleterOpenHub(enrichi("F", { openhub_id: "f", openhub: OPENHUB })), false, "déjà complété");
  assert.equal(aCompleterOpenHub(enrichi("G", { removed: true })), false, "retiré");
  assert.equal(aCompleterOpenHub(enrichi("H", { echecs_openhub: 2 })), true);
  assert.equal(aCompleterOpenHub(enrichi("I", { echecs_openhub: 3 })), false);
});
test("abandonneOpenHub: les mêmes outils, une fois le nombre maximal d'échecs atteint; jamais les deux à la fois", () => {
  assert.equal(abandonneOpenHub(enrichi("A", { echecs_openhub: 3 })), true);
  assert.equal(abandonneOpenHub(enrichi("B", { echecs_openhub: 2 })), false);
  assert.equal(abandonneOpenHub(enrichi("C", { echecs_openhub: 2 }), 2), true);
  assert.equal(abandonneOpenHub(enrichi("D", { source: "proprietaire", echecs_openhub: 9 })), false, "code fermé: jamais cherché");
  assert.equal(abandonneOpenHub(enrichi("E", { openhub: OPENHUB, echecs_openhub: 9 })), false, "déjà complété");
  for (const echecs of [0, 2, 3, 7]) {
    const o = enrichi("F", { echecs_openhub: echecs });
    assert.notEqual(aCompleterOpenHub(o), abandonneOpenHub(o), `${echecs} échecs`);
  }
});
