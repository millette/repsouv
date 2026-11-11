// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { problemeLicenceSpdx } from "../spdx.ts";

test("expressions valides", () => {
  for (const s of ["MIT", "Apache-2.0", "AGPL-3.0-only", "AGPL-3.0-or-later", "MPL-2.0 AND MIT", "(MIT OR GPL-2.0-only)", "Elastic-2.0", "BUSL-1.1"]) {
    assert.equal(problemeLicenceSpdx(s), null, s);
  }
});
test("exceptions SPDX valides", () => {
  assert.equal(problemeLicenceSpdx("GPL-2.0-only WITH Classpath-exception-2.0"), null);
});
test("refus: noms en toutes lettres, casse incorrecte, identifiant inexistant, chaîne vide", () => {
  for (const s of ["GNU Affero General Public License v3.0", "mit", "BSL-1.1", "NOASSERTION", "", "MIT OR"]) {
    assert.match(problemeLicenceSpdx(s) ?? "", /SPDX/, JSON.stringify(s));
  }
});
test("refus: identifiants dépréciés ou ambigus, y compris dans une expression", () => {
  assert.match(problemeLicenceSpdx("GPL-3.0") ?? "", /déprécié/);
  assert.match(problemeLicenceSpdx("MIT OR GPL-2.0") ?? "", /déprécié/);
  assert.match(problemeLicenceSpdx("GPL-2.0-only+") ?? problemeLicenceSpdx("GPL-2.0+") ?? "", /déprécié/);
});
test("refus: LicenseRef maison (hors liste SPDX)", () => {
  assert.match(problemeLicenceSpdx("LicenseRef-Proprietary") ?? "", /maison/);
  assert.match(problemeLicenceSpdx("LicenseRef-Proprietary") ?? "", /custom_license/);
});
