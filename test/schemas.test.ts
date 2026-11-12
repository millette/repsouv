// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les schémas JSON (schemas/*.schema.json, générés par `nub run schemas`) décrivent bien les fichiers de
// données du dépôt, et refusent les variantes invalides. Validation avec Ajv, indépendant de RunTypes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import formats from "ajv-formats";

const addFormats = formats.default;
const lire = (chemin: string) => JSON.parse(readFileSync(chemin, "utf8"));
const compiler = (nom: string) => addFormats(new Ajv2020({ strict: true, allErrors: true })).compile(lire(`schemas/${nom}.schema.json`));

const outils = compiler("outils");
const criteres = compiler("criteres");
const tags = compiler("tags");

const donnees = { outils: lire("outils.json"), criteres: lire("criteres.json"), tags: lire("tags.json") };
const copie = <T>(x: T): T => structuredClone(x);
/** Un outil complet (enrichi) du fichier réel, comme base des variantes invalides. */
const outilEnrichi = () => {
  const o = donnees.outils.outils.find((x: { evaluation_enrichie?: unknown; tags?: string[] }) => x.evaluation_enrichie && (x.tags?.length ?? 0) > 0);
  assert.ok(o, "au moins un outil enrichi dans outils.json");
  return copie(o);
};
const avec = (modifier: (o: Record<string, unknown>) => void) => {
  const f = copie(donnees.outils);
  const o = outilEnrichi();
  modifier(o);
  f.outils = [o];
  return f;
};

test("les fichiers de données réels sont valides", () => {
  assert.equal(outils(donnees.outils), true, JSON.stringify(outils.errors));
  assert.equal(criteres(donnees.criteres), true, JSON.stringify(criteres.errors));
  assert.equal(tags(donnees.tags), true, JSON.stringify(tags.errors));
});

test("un fichier sans « meta », ou sans le tableau attendu, est refusé", () => {
  assert.equal(outils({ outils: donnees.outils.outils }), false);
  assert.equal(outils({ meta: donnees.outils.meta }), false);
  assert.equal(tags({ meta: donnees.tags.meta, outils: [] }), false);
});

test("« meta » exige des dates ISO 8601 avec décalage et refuse les clés inconnues", () => {
  const f = copie(donnees.outils);
  f.meta.created_at = "2026-11-11 16:43:11";
  assert.equal(outils(f), false);
  const g = copie(donnees.outils);
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
  const c = copie(donnees.criteres);
  delete c.criteres[0].titre;
  assert.equal(criteres(c), false);
  const t = copie(donnees.tags);
  t.tags[0].extra = true;
  assert.equal(tags(t), false);
});
