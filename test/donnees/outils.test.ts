// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les vrais fichiers de données du dépôt (outils.json, categories.json, criteres.json, tags.json) sont cohérents
// entre eux, conformes aux règles de classification et aux schémas JSON. Exige un `nub run update` terminé.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import formats from "ajv-formats";
import type { Categorie } from "../../categories.ts";
import { classer, type OutilClasse } from "../../classify.ts";
import { chargerTags } from "../../enrichir.ts";
import type { Critere } from "../../extract.ts";
import { lireFichier } from "../../fichiers.ts";
import { problemesSource, type Source } from "../../sources.ts";
import { ID_PAR_ICONE } from "../../ids.ts";
import { exigerFichiers, FICHIERS_DONNEES } from "./garde.ts";

exigerFichiers(FICHIERS_DONNEES);

const outils = lireFichier<OutilClasse>("outils.json", "outils");
const categories = lireFichier<Categorie>("categories.json", "categories");
const criteres = lireFichier<Critere>("criteres.json", "criteres");

test("outils.json: 60 outils, chacun dans une catégorie de categories.json, et chaque catégorie a au moins un outil", () => {
  assert.equal(outils.donnees.length, 60);
  const ids = new Set(categories.donnees.map((c) => c.id));
  for (const o of outils.donnees) assert.ok(ids.has(o.categorie), `${o.nom}: catégorie ${o.categorie} absente de categories.json`);
  const utilisees = new Set(outils.donnees.map((o) => o.categorie));
  for (const id of ids) assert.ok(utilisees.has(id), `catégorie ${id} sans outil`);
});

test("sources.json: sources valides, Praxis présente, et chaque outil renvoie à une source existante", () => {
  const sources = lireFichier<Source>("sources.json", "sources").donnees;
  for (const s of sources) assert.deepEqual(problemesSource(s), [], s.id);
  assert.ok(sources.some((s) => s.id === "praxis"));
  const ids = new Set(sources.map((s) => s.id));
  for (const o of outils.donnees) assert.ok(ids.has(o.source_repertoire_id), `${o.nom}: source ${o.source_repertoire_id} absente de sources.json`);
});

test("criteres.json: trois critères dont l'id correspond à l'icône", () => {
  assert.equal(criteres.donnees.length, 3);
  for (const c of criteres.donnees) assert.equal(ID_PAR_ICONE[c.icon], c.id);
});

test("outils.json: les critères sont ceux que classify.ts déduit de la description et du score, un par étoile", () => {
  const ids = new Set(Object.values(ID_PAR_ICONE));
  for (const o of outils.donnees) {
    assert.deepEqual(classer(o.description, o.score).criteres, o.criteres, o.nom);
    assert.equal(o.criteres.length, o.score, o.nom);
    for (const c of o.criteres) assert.ok(ids.has(c), `${o.nom}: ${c}`);
  }
});

test("tags.json: ids uniques, en kebab-case, avec description française non vide", () => {
  const tags = chargerTags("tags.json");
  assert.equal(new Set(tags.map((t) => t.id)).size, tags.length);
  for (const t of tags) {
    assert.match(t.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(t.description.trim().length > 0, t.id);
  }
});

test("les quatre fichiers portent la licence des données et des dates valides", () => {
  for (const [f, cle] of [["outils.json", "outils"], ["categories.json", "categories"], ["criteres.json", "criteres"], ["tags.json", "tags"], ["sources.json", "sources"]] as const) {
    const lu = lireFichier(f, cle);
    assert.equal(lu.meta.data_license, "CC-BY-SA-4.0", f);
    assert.ok(Date.parse(lu.meta.created_at) <= Date.parse(lu.meta.updated_at), f);
  }
});

test("les quatre fichiers sont valides selon leurs schémas JSON (Ajv)", () => {
  const lire = (chemin: string) => JSON.parse(readFileSync(chemin, "utf8"));
  for (const nom of ["outils", "categories", "criteres", "tags", "sources"]) {
    const valider = formats.default(new Ajv2020({ strict: true, allErrors: true })).compile(lire(`schemas/${nom}.schema.json`));
    assert.equal(valider(lire(`${nom}.json`)), true, `${nom}.json: ${JSON.stringify(valider.errors)}`);
  }
});
