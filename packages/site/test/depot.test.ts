// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Dépôt et build affichés dans le pied de page: adresse du dépôt déclarée dans package.json, hash Git, date du build.
import assert from "node:assert/strict";
import { test } from "node:test";
import { adresseDepot, formaterDateHeure, infosBuild } from "../src/lib/depot.ts";

const DEPOT = "https://github.com/millette/repsouv";

test("adresseDepot ramène le champ repository à l'adresse Web du dépôt", () => {
  assert.equal(adresseDepot({ repository: { type: "git", url: "git+https://github.com/millette/repsouv.git" } }), DEPOT);
  assert.equal(adresseDepot({ repository: { url: "https://github.com/millette/repsouv" } }), DEPOT);
  assert.equal(adresseDepot({ repository: { url: "git@github.com:millette/repsouv.git" } }), DEPOT);
  assert.equal(adresseDepot({ repository: "https://github.com/millette/repsouv.git" }), DEPOT);
  assert.equal(adresseDepot({}), undefined);
  assert.equal(adresseDepot({ repository: { url: "pas une adresse" } }), undefined);
});

const paquet = () => ({ repository: { url: "git+https://github.com/millette/repsouv.git" } });
const maintenant = () => new Date("2026-11-13T18:30:00Z");

test("infosBuild: dépôt, hash complet et court, adresse du commit, date du build", () => {
  const hash = "466a2b3f0e1d2c3b4a5968778695a4b3c2d1e0f9";
  assert.deepEqual(infosBuild({ lirePaquet: paquet, git: () => `${hash}\n`, maintenant }), {
    depot: DEPOT,
    hash,
    hashCourt: "466a2b3",
    commit: `${DEPOT}/commit/${hash}`,
    date: "2026-11-13T18:30:00.000Z",
  });
});

test("infosBuild: hors d'un dépôt Git, ou si la commande échoue, le hash est omis", () => {
  const sansGit = infosBuild({ lirePaquet: paquet, git: () => { throw new Error("pas un dépôt"); }, maintenant });
  assert.deepEqual(sansGit, { depot: DEPOT, date: "2026-11-13T18:30:00.000Z" });
  assert.deepEqual(infosBuild({ lirePaquet: paquet, git: () => "pas un hash", maintenant }), { depot: DEPOT, date: "2026-11-13T18:30:00.000Z" });
});

test("infosBuild: sans dépôt déclaré, ni lien de dépôt ni lien de commit, mais le hash reste", () => {
  const hash = "a".repeat(40);
  assert.deepEqual(infosBuild({ lirePaquet: () => ({}), git: () => hash, maintenant }), { hash, hashCourt: "aaaaaaa", date: "2026-11-13T18:30:00.000Z" });
});

test("formaterDateHeure: date et heure en français, à l'heure de Toronto", () => {
  assert.equal(formaterDateHeure("2026-11-13T18:30:00.000Z"), "13 novembre 2026 à 13 h 30");
  assert.equal(formaterDateHeure("2026-07-01T04:05:00.000Z"), "1er juillet 2026 à 0 h 05");
});
