// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { additionner, coutOpenAI, formaterCout, PRIX, USAGE_VIDE, usageDepuisOpenAI } from "../prix.ts";

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
