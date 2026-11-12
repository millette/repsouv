// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Chargement de .env par les scripts eux-mêmes, pour qu'ils tournent avec `node` seul (nub le charge aussi,
// sans conflit: une variable déjà présente dans l'environnement n'est jamais écrasée).
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { chargerEnv } from "../env.ts";

const dossier = () => mkdtempSync(join(tmpdir(), "env-"));

test("fichier absent: rien n'est chargé, aucune erreur, retourne false", () => {
  assert.equal(chargerEnv(join(dossier(), ".env")), false);
});
test("fichier présent: les variables sont chargées, retourne true", () => {
  const f = join(dossier(), ".env");
  writeFileSync(f, "# commentaire\nTEST_ENV_CHARGE=oui\n");
  delete process.env.TEST_ENV_CHARGE;
  assert.equal(chargerEnv(f), true);
  assert.equal(process.env.TEST_ENV_CHARGE, "oui");
  delete process.env.TEST_ENV_CHARGE;
});
test("une variable déjà présente dans l'environnement n'est pas écrasée par le fichier", () => {
  const f = join(dossier(), ".env");
  writeFileSync(f, "TEST_ENV_PRESENTE=fichier\n");
  process.env.TEST_ENV_PRESENTE = "environnement";
  chargerEnv(f);
  assert.equal(process.env.TEST_ENV_PRESENTE, "environnement");
  delete process.env.TEST_ENV_PRESENTE;
});
test("une erreur autre que l'absence du fichier remonte (ici un dossier à la place du fichier)", () => {
  assert.throws(() => chargerEnv(dossier()), /Fichier d'environnement illisible \(.*env-/);
});
