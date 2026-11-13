// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les vrais fichiers de données du dépôt (donnees/: outils.json, categories.json, criteres.json, tags.json, sources.json) sont cohérents
// entre eux, conformes aux règles de classification et aux schémas JSON. Exige un `nub run update` terminé.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import formats from "ajv-formats";
import type { Categorie } from "../../categories.ts";
import { classer, type OutilClasse } from "../../classify.ts";
import { chargerTags } from "../../enrichir.ts";
import type { Critere } from "../../extract.ts";
import { DOSSIER_DONNEES, lireFichier } from "../../fichiers.ts";
import { problemesSource, type Source } from "../../sources.ts";
import { ID_PAR_ICONE } from "../../ids.ts";
import { lierVoirAussi, nomLogiciel } from "../../logiciel.ts";
import { exigerFichiers, FICHIERS_DONNEES } from "./garde.ts";

exigerFichiers(FICHIERS_DONNEES);

/** Chemin d'un fichier de donnees/. */
const donnee = (fichier: string) => join(DOSSIER_DONNEES, fichier);

const outils = lireFichier<OutilClasse>(donnee("outils.json"), "outils");
const categories = lireFichier<Categorie>(donnee("categories.json"), "categories");
const criteres = lireFichier<Critere>(donnee("criteres.json"), "criteres");

test("outils.json: 60 outils de Praxis (et d'autres sources), chacun dans une catégorie de categories.json, et chaque catégorie a au moins un outil", () => {
  assert.equal(outils.donnees.filter((o) => o.source_repertoire_id === "praxis").length, 60);
  assert.ok(outils.donnees.length >= 60);
  const ids = new Set(categories.donnees.map((c) => c.id));
  for (const o of outils.donnees) assert.ok(ids.has(o.categorie), `${o.nom}: catégorie ${o.categorie} absente de categories.json`);
  const utilisees = new Set(outils.donnees.map((o) => o.categorie));
  for (const id of ids) assert.ok(utilisees.has(id), `catégorie ${id} sans outil`);
});

test("outils.json: voir_aussi renvoie, de façon symétrique, à des outils existants non retirés qui reposent sur le même logiciel", () => {
  const actifs = outils.donnees.filter((o) => !o.removed);
  const parNom = new Map(actifs.map((o) => [o.nom, o]));
  const { outils: attendus } = lierVoirAussi(outils.donnees);
  for (const [i, o] of outils.donnees.entries()) {
    assert.deepEqual(o.voir_aussi, attendus[i]!.voir_aussi, `${o.nom}: voir_aussi à recalculer (node update.ts)`);
    for (const nom of o.voir_aussi ?? []) {
      const autre = parNom.get(nom);
      assert.ok(autre, `${o.nom}: voir_aussi « ${nom} » absent ou retiré`);
      assert.ok(autre!.voir_aussi?.includes(o.nom), `${nom} ne renvoie pas à ${o.nom}`);
      assert.equal(nomLogiciel(autre!).toLowerCase(), nomLogiciel(o).toLowerCase());
    }
  }
  assert.ok(actifs.filter((o) => o.voir_aussi).length >= 16, "au moins les huit logiciels communs à Praxis et FACiL");
});
test("sources.json: sources valides, Praxis présente, et chaque outil renvoie à une source existante", () => {
  const sources = lireFichier<Source>(donnee("sources.json"), "sources").donnees;
  for (const s of sources) assert.deepEqual(problemesSource(s), [], s.id);
  assert.ok(sources.some((s) => s.id === "praxis"));
  const ids = new Set(sources.map((s) => s.id));
  for (const o of outils.donnees) assert.ok(ids.has(o.source_repertoire_id), `${o.nom}: source ${o.source_repertoire_id} absente de sources.json`);
});

test("criteres.json: trois critères dont l'id correspond à l'icône", () => {
  assert.equal(criteres.donnees.length, 3);
  for (const c of criteres.donnees) assert.equal(ID_PAR_ICONE[c.icon], c.id);
});

test("outils.json: les critères sont ceux que classify.ts déduit de la description et du score, un par étoile (un score estimé non enrichi: classification par seuil)", () => {
  const ids = new Set(Object.values(ID_PAR_ICONE));
  for (const o of outils.donnees) {
    if (o.score_estime) {
      if (!o.evaluation_enrichie) assert.deepEqual(classer(o.description).criteres, o.criteres, o.nom);
    } else assert.deepEqual(classer(o.description, o.score).criteres, o.criteres, o.nom);
    assert.equal(o.criteres.length, o.score, o.nom);
    for (const c of o.criteres) assert.ok(ids.has(c), `${o.nom}: ${c}`);
  }
});

test("tags.json: ids uniques, en kebab-case, avec description française non vide", () => {
  const tags = chargerTags(donnee("tags.json"));
  assert.equal(new Set(tags.map((t) => t.id)).size, tags.length);
  for (const t of tags) {
    assert.match(t.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(t.description.trim().length > 0, t.id);
  }
});

test("les cinq fichiers portent la licence des données et des dates valides", () => {
  for (const [f, cle] of [["outils.json", "outils"], ["categories.json", "categories"], ["criteres.json", "criteres"], ["tags.json", "tags"], ["sources.json", "sources"]] as const) {
    const lu = lireFichier(donnee(f), cle);
    assert.equal(lu.meta.data_license, "CC-BY-SA-4.0", f);
    assert.ok(Date.parse(lu.meta.created_at) <= Date.parse(lu.meta.updated_at), f);
  }
});

test("les cinq fichiers sont valides selon leurs schémas JSON (Ajv)", () => {
  const lire = (fichier: string) => JSON.parse(readFileSync(donnee(fichier), "utf8"));
  for (const nom of ["outils", "categories", "criteres", "tags", "sources"]) {
    const valider = formats.default(new Ajv2020({ strict: true, allErrors: true })).compile(lire(`schemas/${nom}.schema.json`));
    assert.equal(valider(lire(`${nom}.json`)), true, `${nom}.json: ${JSON.stringify(valider.errors)}`);
  }
});
