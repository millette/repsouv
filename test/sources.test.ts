// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { chargerSources, COURRIEL, ID_PRAXIS, problemesSource, sauverSources, SOURCE_PRAXIS, sourcesAvec, type Source } from "../sources.ts";

const facil: Source = { id: "facil", nom: "FACiL", url: "https://facil.services/", extracteur: "manuel", pdc: "https://facil.services/pdc/", donnees: "https://facil.services/donnees/", soumis_par: { nom: "Robin Millette", url: "https://robin.millette.info/", email: "robin@example.com" } };

test("SOURCE_PRAXIS: identifiant « praxis », extracteur praxis, URL du répertoire, valide", () => {
  assert.equal(SOURCE_PRAXIS.id, ID_PRAXIS);
  assert.equal(SOURCE_PRAXIS.extracteur, "praxis");
  assert.match(SOURCE_PRAXIS.url, /^https:\/\/praxis\.encommun\.io\//);
  assert.deepEqual(problemesSource(SOURCE_PRAXIS), []);
});
test("problemesSource: id en slug, nom et URL obligatoires, pdc et donnees en URL, soumis_par avec nom obligatoire et courriel valide", () => {
  assert.deepEqual(problemesSource(facil), []);
  assert.deepEqual(problemesSource({ ...facil, soumis_par: { nom: "R" } }), []);
  assert.match(problemesSource({ ...facil, id: "FACiL" }).join(), /id/);
  assert.match(problemesSource({ ...facil, nom: " " }).join(), /nom vide/);
  assert.match(problemesSource({ ...facil, url: "facil.services" }).join(), /url/);
  assert.match(problemesSource({ ...facil, pdc: "ftp://x" }).join(), /pdc/);
  assert.match(problemesSource({ ...facil, extracteur: "autre" as never }).join(), /extracteur/);
  assert.match(problemesSource({ ...facil, soumis_par: { nom: "" } }).join(), /soumis_par\.nom/);
  assert.match(problemesSource({ ...facil, soumis_par: { nom: "R", email: "robin at example.com" } }).join(), /email/);
  assert.match(problemesSource({ ...facil, soumis_par: { nom: "R", url: "robin.millette.info" } }).join(), /soumis_par\.url/);
});
test("COURRIEL: adresses acceptées et refusées (addr-spec usuel)", () => {
  for (const ok of ["a@b.ca", "robin.millette+test@example.com", "x_y@sub.domaine-long.org"]) assert.ok(COURRIEL.test(ok), ok);
  for (const non of ["robin", "robin@", "@example.com", "robin@localhost", "Robin <robin@example.com>", "a b@c.ca"]) assert.ok(!COURRIEL.test(non), non);
});
test("sourcesAvec: ajoute une source nouvelle, met à jour une source existante sans la déplacer, refuse une source invalide", () => {
  const deux = sourcesAvec([SOURCE_PRAXIS], facil);
  assert.deepEqual(deux.map((s) => s.id), ["praxis", "facil"]);
  const trois = sourcesAvec(deux, { id: "praxis", nom: "Praxis", url: SOURCE_PRAXIS.url, extracteur: "praxis" });
  assert.deepEqual(trois.map((s) => s.id), ["praxis", "facil"]);
  assert.equal(trois[0]!.nom, "Praxis");
  assert.throws(() => sourcesAvec([], { ...facil, url: "x" }), /source invalide/);
});
test("sauverSources et chargerSources: fichier de données avec meta, relecture", () => {
  const f = join(mkdtempSync(join(tmpdir(), "sources-")), "sources.json");
  assert.equal(existsSync(f), false);
  sauverSources(f, [SOURCE_PRAXIS, facil]);
  assert.deepEqual(chargerSources(f).map((s) => s.id), ["praxis", "facil"]);
  const lu = chargerSources(f);
  assert.deepEqual(lu[1], facil);
});
