// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ecrireFichier, LICENCE_DONNEES, lireFichier, lireSiExiste } from "../fichiers.ts";
import { problemeLicenceSpdx } from "../spdx.ts";

const T0 = "2026-11-11T16:00:00-05:00";
const T1 = "2026-11-12T09:30:00-05:00";
const fichier = () => join(mkdtempSync(join(tmpdir(), "fichiers-")), "outils.json");
const meta = (extra: Record<string, unknown> = {}) => ({ data_license: "CC-BY-SA-4.0", created_at: T0, updated_at: T0, ...extra });

test("la licence des données est un identifiant SPDX valide", () => {
  assert.equal(LICENCE_DONNEES, "CC-BY-SA-4.0");
  assert.equal(problemeLicenceSpdx(LICENCE_DONNEES), null);
});

test("écrire un nouveau fichier: « meta » (licence, created_at = updated_at), puis les données", () => {
  const f = fichier();
  const lu = ecrireFichier(f, "outils", [{ nom: "a" }], null, T0);
  const texte = readFileSync(f, "utf8");
  assert.deepEqual(Object.keys(JSON.parse(texte)), ["meta", "outils"]);
  assert.deepEqual(Object.keys(JSON.parse(texte).meta), ["data_license", "created_at", "updated_at"]);
  assert.deepEqual(JSON.parse(texte), { meta: meta(), outils: [{ nom: "a" }] });
  assert.ok(texte.endsWith("}\n"));
  assert.deepEqual(lu.meta, meta());
});
test("contenu inchangé: updated_at et created_at sont conservés", () => {
  const f = fichier();
  const avant = ecrireFichier(f, "outils", [{ nom: "a" }], null, T0);
  const apres = ecrireFichier(f, "outils", [{ nom: "a" }], avant, T1);
  assert.deepEqual(apres.meta, avant.meta);
  assert.equal(lireFichier(f, "outils").meta.updated_at, T0);
});
test("contenu modifié: updated_at change, created_at est conservé", () => {
  const f = fichier();
  const avant = ecrireFichier(f, "outils", [{ nom: "a" }], null, T0);
  const apres = ecrireFichier(f, "outils", [{ nom: "a" }, { nom: "b" }], avant, T1);
  assert.equal(apres.meta.created_at, T0);
  assert.equal(apres.meta.updated_at, T1);
});
test("contenu remplacé en entier: created_at est tout de même conservé", () => {
  const f = fichier();
  ecrireFichier(f, "outils", [{ nom: "a" }], null, T0);
  const apres = ecrireFichier(f, "outils", [{ nom: "z" }], lireFichier(f, "outils"), T1);
  assert.equal(apres.meta.created_at, T0);
});
test("une autre licence est rétablie à l'écriture, ce qui compte comme une mise à jour", () => {
  const f = fichier();
  writeFileSync(f, JSON.stringify({ meta: meta({ data_license: "MIT" }), outils: [{ nom: "a" }] }));
  const lu = lireFichier<{ nom: string }>(f, "outils");
  assert.equal(lu.meta.data_license, "MIT");
  const apres = ecrireFichier(f, "outils", lu.donnees, lu, T1);
  assert.equal(JSON.parse(readFileSync(f, "utf8")).meta.data_license, "CC-BY-SA-4.0");
  assert.equal(apres.meta.created_at, T0);
  assert.equal(apres.meta.updated_at, T1);
});

test("lecture: le format est strict (pas de « meta », simple tableau, tableau manquant, dates invalides)", () => {
  const f = fichier();
  const refuse = (contenu: unknown, re: RegExp) => {
    writeFileSync(f, JSON.stringify(contenu));
    assert.throws(() => lireFichier(f, "outils"), re);
    assert.equal(lireSiExiste(f, "outils"), null);
  };
  refuse([{ nom: "a" }], /format invalide/);
  refuse({ data_license: "CC-BY-SA-4.0", created_at: T0, updated_at: T0, outils: [] }, /format invalide/);
  refuse({ meta: meta(), autre: [] }, /format invalide/);
  refuse({ meta: meta({ created_at: "hier" }), outils: [] }, /meta.* invalide/);
  refuse({ meta: { data_license: "CC-BY-SA-4.0", created_at: T0 }, outils: [] }, /meta.* invalide/);
  refuse({ meta: meta({ updated_at: "2026-11-11T16:00:00" }), outils: [] }, /meta.* invalide/);
});
test("lireSiExiste retourne null si le fichier est absent ou illisible, et la lecture d'un fichier valide réussit", () => {
  const f = fichier();
  assert.equal(lireSiExiste(f, "outils"), null);
  writeFileSync(f, "pas du json");
  assert.equal(lireSiExiste(f, "outils"), null);
  ecrireFichier(f, "outils", [{ nom: "a" }], null, T0);
  assert.deepEqual(lireSiExiste(f, "outils")?.donnees, [{ nom: "a" }]);
});

test("les fichiers de données du dépôt portent la licence et des dates valides", () => {
  for (const [f, cle] of [["outils.json", "outils"], ["criteres.json", "criteres"], ["tags.json", "tags"]] as const) {
    const lu = lireFichier(f, cle);
    assert.equal(lu.meta.data_license, "CC-BY-SA-4.0", f);
    assert.ok(Date.parse(lu.meta.created_at) <= Date.parse(lu.meta.updated_at), f);
  }
});
