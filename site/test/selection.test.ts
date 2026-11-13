// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Règle de sélection de l'explorateur (specs/002-explorateur-outils/data-model.md): « ou » dans un filtre à choix
// multiple, « et » entre les filtres.
import assert from "node:assert/strict";
import { test } from "node:test";
import { retenu } from "../src/lib/selection.ts";
import { etat, outil } from "./explorateur-fixtures.ts";

const o = outil({ nom: "Élodia Notes", categorie: "bureautique", tags: ["chiffrement"], statut: "libre", pays: "FR", source: "praxis", score: 2, verdicts: { donnees: "confirme", controle: "infirme", dependance: "indetermine" } });
const nonVerifie = outil({ nom: "Mystère", statut: "non-enrichi", enrichi: false, score: 1 });

test("sans aucun choix, tout outil est retenu", () => {
  assert.equal(retenu(o, etat()), true);
  assert.equal(retenu(nonVerifie, etat()), true);
});

test("« ou » à l'intérieur d'un filtre à choix multiple", () => {
  assert.equal(retenu(o, etat({ categories: ["autre", "bureautique"] })), true);
  assert.equal(retenu(o, etat({ categories: ["autre"] })), false);
  assert.equal(retenu(o, etat({ tags: ["vpn", "chiffrement"] })), true);
  assert.equal(retenu(o, etat({ tags: ["vpn"] })), false);
  assert.equal(retenu(o, etat({ statuts: ["partiel", "libre"] })), true);
  assert.equal(retenu(o, etat({ statuts: ["proprietaire"] })), false);
  assert.equal(retenu(o, etat({ pays: ["CH", "FR"] })), true);
  assert.equal(retenu(o, etat({ pays: ["CH"] })), false);
  assert.equal(retenu(o, etat({ sources: ["facil", "praxis"] })), true);
  assert.equal(retenu(o, etat({ sources: ["facil"] })), false);
});

test("« et » entre les filtres", () => {
  assert.equal(retenu(o, etat({ categories: ["bureautique"], pays: ["FR"], statuts: ["libre"], q: "elod" })), true);
  assert.equal(retenu(o, etat({ categories: ["bureautique"], pays: ["CH"] })), false);
});

test("la recherche ignore la casse et les accents", () => {
  assert.equal(retenu(o, etat({ q: "ÉLOD" })), true);
  assert.equal(retenu(o, etat({ q: " notes " })), true);
  assert.equal(retenu(o, etat({ q: "xyz" })), false);
});

test("le score minimal retient les scores égaux ou supérieurs", () => {
  assert.equal(retenu(o, etat({ scoreMin: 2 })), true);
  assert.equal(retenu(o, etat({ scoreMin: 3 })), false);
});

test("un verdict demandé exige des critères vérifiés et ce verdict", () => {
  assert.equal(retenu(o, etat({ verdicts: { donnees: "confirme" } })), true);
  assert.equal(retenu(o, etat({ verdicts: { donnees: "infirme" } })), false);
  assert.equal(retenu(o, etat({ verdicts: { donnees: "confirme", controle: "infirme", dependance: "indetermine" } })), true);
  assert.equal(retenu(o, etat({ verdicts: { donnees: "confirme", controle: "confirme" } })), false);
});

test("un outil non vérifié n'est retenu par aucun verdict, pas même « indéterminé »", () => {
  for (const v of ["confirme", "infirme", "indetermine"] as const) assert.equal(retenu(nonVerifie, etat({ verdicts: { donnees: v } })), false, v);
});

test("un outil sans pays n'est retenu par aucun choix de pays", () => {
  assert.equal(retenu(nonVerifie, etat({ pays: ["FR"] })), false);
});

test("enrichi: oui ou non", () => {
  assert.equal(retenu(o, etat({ enrichi: "oui" })), true);
  assert.equal(retenu(o, etat({ enrichi: "non" })), false);
  assert.equal(retenu(nonVerifie, etat({ enrichi: "non" })), true);
});
