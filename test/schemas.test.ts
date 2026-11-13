// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les schémas JSON (schemas/*.schema.json, générés par `nub run schemas`) acceptent des données fictives complètes
// et refusent les variantes invalides. Validation avec Ajv, indépendant de RunTypes. La validité des fichiers réels
// du dépôt est vérifiée par test/donnees/outils.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import formats from "ajv-formats";
import { CATEGORIES, CRITERES, enrichi, META, OUTILS, SOURCES, TAGS } from "./donnees-fictives.ts";

const addFormats = formats.default;
const lire = (chemin: string) => JSON.parse(readFileSync(chemin, "utf8"));
const compiler = (nom: string) => addFormats(new Ajv2020({ strict: true, allErrors: true })).compile(lire(`schemas/${nom}.schema.json`));

const outils = compiler("outils");
const criteres = compiler("criteres");
const tags = compiler("tags");
const categories = compiler("categories");
const sources = compiler("sources");

const copie = <T>(x: T): T => structuredClone(x);
/** Fichiers fictifs complets (« Maison » reçoit un tag: le schéma en exige de 1 à 5). */
const donnees = {
  outils: { meta: META, outils: OUTILS.map((o) => (o.tags?.length === 0 ? { ...o, tags: ["gratuit"] } : o)) },
  criteres: { meta: META, criteres: CRITERES },
  tags: { meta: META, tags: TAGS },
  categories: { meta: META, categories: CATEGORIES },
  sources: { meta: META, sources: SOURCES },
};
/** Un outil complet (enrichi), comme base des variantes invalides. */
const avec = (modifier: (o: Record<string, unknown>) => void) => {
  const f = copie(donnees.outils);
  const o = enrichi("X") as unknown as Record<string, unknown>;
  modifier(o);
  f.outils = [o as never];
  return f;
};

test("les données fictives complètes sont valides", () => {
  assert.equal(outils(donnees.outils), true, JSON.stringify(outils.errors));
  assert.equal(criteres(donnees.criteres), true, JSON.stringify(criteres.errors));
  assert.equal(tags(donnees.tags), true, JSON.stringify(tags.errors));
  assert.equal(categories(donnees.categories), true, JSON.stringify(categories.errors));
  assert.equal(sources(donnees.sources), true, JSON.stringify(sources.errors));
});

test("un fichier sans « meta », ou sans le tableau attendu, est refusé", () => {
  assert.equal(outils({ outils: donnees.outils.outils }), false);
  assert.equal(outils({ meta: donnees.outils.meta }), false);
  assert.equal(tags({ meta: donnees.tags.meta, outils: [] }), false);
});

test("« meta » exige des dates ISO 8601 avec décalage et refuse les clés inconnues", () => {
  const f = copie(donnees.outils) as { meta: Record<string, unknown> };
  f.meta.created_at = "2026-11-11 16:43:11";
  assert.equal(outils(f), false);
  const g = copie(donnees.outils) as { meta: Record<string, unknown> };
  g.meta.extra = 1;
  assert.equal(outils(g), false);
});

test("un outil: clé inconnue, score hors de 0 à 3 et source inconnue sont refusés", () => {
  assert.equal(outils(avec(() => {})), true, JSON.stringify(outils.errors));
  assert.equal(outils(avec((o) => { o.extra = 1; })), false);
  assert.equal(outils(avec((o) => { o.score = 4; })), false);
  assert.equal(outils(avec((o) => { o.score = 1.5; })), false);
  assert.equal(outils(avec((o) => { o.source = "ouvert"; })), false);
});

test("un outil: tags (1 à 5, sans doublon), date ISO et changement valides seulement", () => {
  assert.equal(outils(avec((o) => { o.tags = []; })), false);
  assert.equal(outils(avec((o) => { o.tags = ["a", "b", "c", "d", "e", "f"]; })), false);
  assert.equal(outils(avec((o) => { o.tags = ["a", "a"]; })), false);
  assert.equal(outils(avec((o) => { o.derniere_modification = "5 novembre 2026"; })), false);
  assert.equal(outils(avec((o) => { o.changement = "supprimé"; })), false);
});

test("un outil: licence, dépôt et évaluation enrichie respectent leurs types", () => {
  assert.equal(outils(avec((o) => { o.licence = null; })), true, JSON.stringify(outils.errors));
  assert.equal(outils(avec((o) => { o.licence = 5; })), false);
  assert.equal(outils(avec((o) => { o.removed = false; })), false);
  assert.equal(outils(avec((o) => { (o.evaluation_enrichie as Record<string, unknown>).confiance = "certaine"; })), false);
  assert.equal(outils(avec((o) => { (o.evaluation_enrichie as Record<string, unknown>).score = 9; })), false);
});

test("critères et tags: champs obligatoires et clés inconnues", () => {
  const c = copie(donnees.criteres) as unknown as { criteres: Record<string, unknown>[] };
  delete c.criteres[0]!.titre;
  assert.equal(criteres(c), false);
  const t = copie(donnees.tags) as unknown as { tags: Record<string, unknown>[] };
  t.tags[0]!.extra = true;
  assert.equal(tags(t), false);
});

test("un outil: echecs_enrichissement est un entier d'au moins 1", () => {
  assert.equal(outils(avec((o) => { o.echecs_enrichissement = 2; })), true, JSON.stringify(outils.errors));
  assert.equal(outils(avec((o) => { o.echecs_enrichissement = 0; })), false);
  assert.equal(outils(avec((o) => { o.echecs_enrichissement = 1.5; })), false);
  assert.equal(outils(avec((o) => { o.echecs_confirmation = 1; })), true, JSON.stringify(outils.errors));
  assert.equal(outils(avec((o) => { o.echecs_confirmation = 0; })), false);
});

test("catégories: un id qui n'est pas un slug, une clé inconnue ou un nom manquant sont refusés", () => {
  const c = copie(donnees.categories) as unknown as { categories: Record<string, unknown>[] };
  c.categories[0]!.id = "Analyse et mesure";
  assert.equal(categories(c), false);
  const d = copie(donnees.categories) as unknown as { categories: Record<string, unknown>[] };
  d.categories[0]!.extra = 1;
  assert.equal(categories(d), false);
  const e = copie(donnees.categories) as unknown as { categories: Record<string, unknown>[] };
  delete e.categories[0]!.nom;
  assert.equal(categories(e), false);
  const f = copie(donnees.categories) as unknown as { categories: Record<string, unknown>[] };
  f.categories[0]!.source_repertoire_id = "charles";
  assert.equal(categories(f), true, "une catégorie déclarée par un extracteur porte sa source");
  f.categories[0]!.source_repertoire_id = "Charles!";
  assert.equal(categories(f), false, "source_repertoire_id est un slug");
});

test("relation entre les deux fichiers: outils[].categorie est un slug annoté comme renvoi à categories[].id", () => {
  const schema = lire("schemas/outils.schema.json");
  const champ = schema.properties.outils.items.properties.categorie;
  assert.match(champ.$comment, /categories\[\]\.id de categories\.json/);
  assert.equal(champ.pattern, lire("schemas/categories.schema.json").properties.categories.items.properties.id.pattern);
  assert.equal(outils(avec((o) => { o.categorie = "Analyse et mesure"; })), false);
});
