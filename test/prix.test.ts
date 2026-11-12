// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { additionner, ajouterUsage, coutOpenAI, coutTotal, formaterCout, formaterCouts, PRIX, soustraireUsages, USAGE_VIDE, usageDepuisOpenAI } from "../prix.ts";

test("coutOpenAI: entrées hors cache, entrées en cache et sorties, au prix du modèle", () => {
  const cout = coutOpenAI({ entree: 1000, sortie: 500, cache_lecture: 400, cache_ecriture: 0 }, PRIX["gpt-6-astra"]!);
  assert.equal(Math.round(cout * 1e6), 600 * 10 + 400 * 1 + 500 * 50);
});
test("additionner et usageDepuisOpenAI", () => {
  assert.deepEqual(additionner(USAGE_VIDE, { entree: 1, sortie: 2, cache_lecture: 3, cache_ecriture: 4 }), { entree: 1, sortie: 2, cache_lecture: 3, cache_ecriture: 4 });
  assert.deepEqual(usageDepuisOpenAI({ usage: { input_tokens: 10, output_tokens: 5, input_tokens_details: { cached_tokens: 2 } } }), { entree: 10, sortie: 5, cache_lecture: 2, cache_ecriture: 0 });
  assert.deepEqual(usageDepuisOpenAI({}), USAGE_VIDE);
});
test("formaterCout: jetons en français et coût au prix du modèle, ou prix inconnu", () => {
  const texte = formaterCout({ entree: 12345, sortie: 678, cache_lecture: 1000, cache_ecriture: 0 }, "gpt-6-astra");
  assert.match(texte, /12 345 jetons en entrée \(dont 1 000 en cache\)/);
  assert.match(texte, /678 en sortie/);
  assert.match(texte, /≈ 0,15 \$ \(gpt-6-astra\)/);
  assert.match(formaterCout({ entree: 10, sortie: 1, cache_lecture: 0, cache_ecriture: 0 }, "inconnu"), /prix inconnu pour inconnu/);
});

test("usages par modèle: ajouterUsage accumule sans modifier l'ancien état, soustraireUsages donne la différence, coutTotal additionne chaque modèle à son prix", () => {
  const u1 = ajouterUsage(new Map(), "gpt-6.1-terra", { entree: 1000, sortie: 100, cache_lecture: 0, cache_ecriture: 0 });
  const u2 = ajouterUsage(u1, "gpt-6.1-sol", { entree: 1000, sortie: 100, cache_lecture: 0, cache_ecriture: 0 });
  const u3 = ajouterUsage(u2, "gpt-6.1-terra", { entree: 500, sortie: 50, cache_lecture: 100, cache_ecriture: 0 });
  assert.equal(u1.size, 1);
  assert.deepEqual(u3.get("gpt-6.1-terra"), { entree: 1500, sortie: 150, cache_lecture: 100, cache_ecriture: 0 });
  assert.deepEqual([...soustraireUsages(u3, u2).entries()], [["gpt-6.1-terra", { entree: 500, sortie: 50, cache_lecture: 100, cache_ecriture: 0 }]]);
  assert.equal(Math.round(coutTotal(u2)! * 1e6), 1000 * 1 + 100 * 5 + 1000 * 2 + 100 * 10);
  assert.equal(coutTotal(ajouterUsage(u2, "inconnu", USAGE_VIDE)), null);
  assert.equal(coutTotal(new Map()), 0);
});
test("formaterCouts: aucun appel, un seul modèle (comme formaterCout), plusieurs modèles avec le détail, prix inconnu", () => {
  assert.equal(formaterCouts(new Map()), "aucun appel");
  const un = ajouterUsage(new Map(), "gpt-6.1-terra", { entree: 12345, sortie: 678, cache_lecture: 1000, cache_ecriture: 0 });
  assert.equal(formaterCouts(un), formaterCout({ entree: 12345, sortie: 678, cache_lecture: 1000, cache_ecriture: 0 }, "gpt-6.1-terra"));
  const deux = ajouterUsage(un, "gpt-6.1-sol", { entree: 1000, sortie: 100, cache_lecture: 0, cache_ecriture: 0 });
  const texte = formaterCouts(deux);
  assert.match(texte, /^13 345 jetons en entrée \(dont 1 000 en cache\), 778 en sortie, ≈ 0,02 \$ \(gpt-6.1-terra 0,01 \$; gpt-6.1-sol 0,00 \$\)$/);
  assert.match(formaterCouts(ajouterUsage(un, "inconnu", { entree: 1, sortie: 1, cache_lecture: 0, cache_ecriture: 0 })), /prix inconnu pour inconnu/);
});
