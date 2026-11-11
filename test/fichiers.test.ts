// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ecrireFichier, LICENCE_DONNEES, lireFichier, lireSiExiste } from "../fichiers.ts";
import { horodatage } from "../temps.ts";
import { problemeLicenceSpdx } from "../spdx.ts";

const T0 = "2026-11-11T16:00:00-05:00";
const T1 = "2026-11-12T09:30:00-05:00";
const fichier = () => join(mkdtempSync(join(tmpdir(), "fichiers-")), "outils.json");

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
  assert.deepEqual(JSON.parse(texte), { meta: { data_license: "CC-BY-SA-4.0", created_at: T0, updated_at: T0 }, outils: [{ nom: "a" }] });
  assert.ok(texte.endsWith("}\n"));
  assert.deepEqual(lu.meta, { data_license: "CC-BY-SA-4.0", created_at: T0, updated_at: T0 });
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
  const avant = ecrireFichier(f, "outils", [{ nom: "a" }], null, T0);
  const apres = ecrireFichier(f, "outils", [{ nom: "z" }], lireFichier(f, "outils", T1), T1);
  assert.equal(apres.meta.created_at, avant.meta.created_at);
});
test("ancien format (simple tableau): reconnu, converti à l'écriture avec la date du moment", () => {
  const f = fichier();
  writeFileSync(f, JSON.stringify([{ nom: "a" }]));
  const lu = lireFichier<{ nom: string }>(f, "outils", T1);
  assert.deepEqual(lu.donnees, [{ nom: "a" }]);
  assert.equal(lu.aCorriger, true);
  ecrireFichier(f, "outils", lu.donnees, lu, T1);
  assert.deepEqual(JSON.parse(readFileSync(f, "utf8")), { meta: { data_license: "CC-BY-SA-4.0", created_at: T1, updated_at: T1 }, outils: [{ nom: "a" }] });
});
test("une licence absente ou différente est corrigée, ce qui compte comme une mise à jour", () => {
  const f = fichier();
  writeFileSync(f, JSON.stringify({ meta: { data_license: "MIT", created_at: T0, updated_at: T0 }, outils: [{ nom: "a" }] }));
  const lu = lireFichier(f, "outils", T1);
  assert.equal(lu.aCorriger, true);
  const apres = ecrireFichier(f, "outils", lu.donnees, lu, T1);
  assert.equal(JSON.parse(readFileSync(f, "utf8")).meta.data_license, "CC-BY-SA-4.0");
  assert.equal(apres.meta.created_at, T0);
  assert.equal(apres.meta.updated_at, T1);
});
test("dates manquantes ou invalides: remplacées par la date du moment", () => {
  const f = fichier();
  writeFileSync(f, JSON.stringify({ meta: { data_license: "CC-BY-SA-4.0", created_at: "hier" }, outils: [] }));
  const lu = lireFichier(f, "outils", T1);
  assert.deepEqual(lu.meta, { data_license: "CC-BY-SA-4.0", created_at: T1, updated_at: T1 });
  assert.equal(lu.aCorriger, true);
});
test("fichier conforme: rien à corriger", () => {
  const f = fichier();
  ecrireFichier(f, "tags", [{ id: "x" }], null, T0);
  assert.equal(lireFichier(f, "tags").aCorriger, false);
});
test("structure invalide: erreur claire; lireSiExiste retourne null (absent, illisible, invalide)", () => {
  const f = fichier();
  writeFileSync(f, JSON.stringify({ meta: { data_license: "CC-BY-SA-4.0" }, autre: [] }));
  assert.throws(() => lireFichier(f, "outils"), /tableau « outils » manquant/);
  assert.equal(lireSiExiste(f, "outils"), null);
  writeFileSync(f, "pas du json");
  assert.equal(lireSiExiste(f, "outils"), null);
  assert.equal(lireSiExiste(join(f, "absent"), "outils"), null);
});

test("les fichiers de données du dépôt portent la licence et des dates valides", () => {
  for (const [f, cle] of [["outils.json", "outils"], ["criteres.json", "criteres"], ["tags.json", "tags"]] as const) {
    const lu = lireFichier(f, cle);
    assert.equal(lu.aCorriger, false, `${f}: métadonnées à corriger`);
    assert.equal(lu.meta.data_license, "CC-BY-SA-4.0", f);
    assert.ok(Date.parse(lu.meta.created_at) <= Date.parse(lu.meta.updated_at), f);
  }
});

test("métadonnées au premier niveau (ancien format): dates conservées, fichier à corriger, converti vers « meta »", () => {
  const f = fichier();
  writeFileSync(f, JSON.stringify({ data_license: "CC-BY-SA-4.0", created_at: T0, updated_at: T0, outils: [{ nom: "a" }] }));
  const lu = lireFichier(f, "outils", T1);
  assert.equal(lu.aCorriger, true);
  assert.deepEqual(lu.meta, { data_license: "CC-BY-SA-4.0", created_at: T0, updated_at: T0 });
  ecrireFichier(f, "outils", lu.donnees, lu, T1);
  const converti = JSON.parse(readFileSync(f, "utf8"));
  assert.deepEqual(Object.keys(converti), ["meta", "outils"]);
  assert.equal(converti.meta.created_at, T0);
});
test("normaliser: un changement des données rend le fichier « à corriger » (et il est écrit au format courant)", () => {
  const f = fichier();
  ecrireFichier(f, "outils", [{ d: "2026-11-05T09:53" }], null, T0);
  const sans = lireFichier<{ d: string }>(f, "outils", T1);
  assert.equal(sans.aCorriger, false);
  const avec = lireFichier<{ d: string }>(f, "outils", T1, (os) => os.map((o) => ({ d: `${o.d}:00-05:00` })));
  assert.equal(avec.aCorriger, true);
  assert.equal(avec.donnees[0]!.d, "2026-11-05T09:53:00-05:00");
  const apres = ecrireFichier(f, "outils", avec.donnees, avec, T1);
  assert.equal(apres.meta.updated_at, T1);
  assert.equal(apres.meta.created_at, T0);
});
