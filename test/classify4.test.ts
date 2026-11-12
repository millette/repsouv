// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// classify4.ts: critères de classify.ts, puis retrait des critères que l'enrichissement et les confirmations d'IA contredisent.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { CONTROLE, DEPENDANCE, DONNEES, classer, type OutilClasse } from "../classify.ts";
import { chargerConfirmations, classer4, type Confirmations } from "../classify4.ts";
import { lireFichier } from "../fichiers.ts";

const base = (extra: Partial<OutilClasse>): OutilClasse =>
  ({ categorie: "c", icone: "i", nom: "X", score: 2, lien: "https://x", description: "Outil québécois de gestion.", derniere_modification: "2026-11-05T09:53:00-05:00", changement: null, criteres: [], confiance: "élevée", ...extra }) as OutilClasse;
const canadienProprietaire = base({ source: "proprietaire", tags: ["gestion-contacts-membres"] });
const confirmations = (donnees: "confirme" | "indetermine"): Confirmations => new Map([["X", { donnees, controle: "confirme", dependance: "indetermine" }]]);

test("sans enrichissement ni confirmation: exactement les critères et la confiance de classify.ts", () => {
  const o = base({});
  assert.deepEqual(classer4(o), classer(o.description, o.score));
});

test("R1: « dependance » est retiré pour un outil propriétaire sans auto-hébergement ni hors-ligne, gardé sinon", () => {
  const description = "Outil libre et auto-hébergé";
  assert.deepEqual(classer(description, 2).criteres, [DONNEES, DEPENDANCE]);
  assert.deepEqual(classer4(base({ description, source: "proprietaire", tags: ["api-integrations"] })).criteres, [DONNEES]);
  assert.deepEqual(classer4(base({ description, source: "proprietaire", tags: ["auto-hebergeable"] })).criteres, [DONNEES, DEPENDANCE]);
  assert.deepEqual(classer4(base({ description, source: "proprietaire", tags: ["hors-ligne"] })).criteres, [DONNEES, DEPENDANCE]);
  assert.deepEqual(classer4(base({ description, source: "libre", tags: ["api-integrations"] })).criteres, [DONNEES, DEPENDANCE]);
});

test("R2: « donnees » retenu par le seul a priori « fournisseur canadien » est retiré quand l'IA ne le confirme pas", () => {
  assert.deepEqual(classer(canadienProprietaire.description, 2).criteres, [DONNEES, CONTROLE]);
  assert.deepEqual(classer4(canadienProprietaire, confirmations("indetermine")).criteres, [CONTROLE]);
  assert.deepEqual(classer4(canadienProprietaire, confirmations("confirme")).criteres, [DONNEES, CONTROLE]);
  assert.deepEqual(classer4(canadienProprietaire).criteres, [DONNEES, CONTROLE], "sans confirmation, rien n'est retiré");
  assert.deepEqual(classer4(canadienProprietaire, new Map()).criteres, [DONNEES, CONTROLE], "outil absent des confirmations");
});

test("R2 ne touche pas un « donnees » établi par la description (hébergement au Canada, auto-hébergement)", () => {
  const o = base({ description: "Outil québécois hébergé au Canada.", source: "proprietaire", tags: [] });
  assert.deepEqual(classer4(o, confirmations("indetermine")).criteres, [DONNEES, CONTROLE]);
});

test("classify4 ne retire que des critères: le résultat est toujours un sous-ensemble ordonné de celui de classify.ts", () => {
  const donnees = lireFichier<OutilClasse>("outils.json", "outils").donnees;
  const conf = chargerConfirmations("analyses/classification/confirmations-claude.json");
  for (const o of donnees) {
    const v1 = classer(o.description, o.score).criteres;
    const v4 = classer4(o, conf).criteres;
    assert.deepEqual(v4, v1.filter((c) => v4.includes(c)), o.nom);
  }
});

test("la confiance est celle de classify2.ts (recalibrée), calculée sur les critères de classify.ts", () => {
  const o = base({ description: "Outil de comptabilité", source: "proprietaire", tags: [] });
  assert.equal(classer4(o).confiance, "faible");
});

test("évaluation enrichie: classify4 avec les confirmations commitées concorde mieux que classify.ts (47 contre 39 sur 57)", () => {
  const enrichis = lireFichier<OutilClasse>("outils.json", "outils").donnees.filter((o) => o.evaluation_enrichie);
  const conf = chargerConfirmations("analyses/classification/confirmations-claude.json");
  const eq = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const v1 = enrichis.filter((o) => eq(classer(o.description, o.score).criteres, o.evaluation_enrichie!.criteres)).length;
  const v4 = enrichis.filter((o) => eq(classer4(o, conf).criteres, o.evaluation_enrichie!.criteres)).length;
  assert.ok(v4 > v1, `v4 ${v4} <= v1 ${v1}`);
  assert.equal(v1, 39);
  assert.equal(v4, 47);
});

test("chargerConfirmations: statut par critère et par outil, sans les outils en échec", () => {
  const conf = chargerConfirmations("analyses/classification/confirmations-claude.json");
  assert.ok(conf.size >= 50);
  assert.equal(conf.get("Matomo")?.donnees, "confirme");
});

const classify4Ts = resolve("classify4.ts");
const copie = () => { const d = mkdtempSync(join(tmpdir(), "classify4-")); const f = join(d, "outils.json"); copyFileSync("outils.json", f); return { d, f }; };

test("CLI: sur une copie, écrit la sortie sans toucher la source; seuls criteres et confiance changent, score intact", () => {
  const { d, f } = copie();
  const avant = readFileSync(f, "utf8");
  const sortie = join(d, "v4.json");
  const r = spawnSync("nub", [classify4Ts, "--confirmations=analyses/classification/confirmations-claude.json", f, sortie], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(f, "utf8"), avant);
  const v1 = lireFichier<OutilClasse>(f, "outils").donnees, v4 = lireFichier<OutilClasse>(sortie, "outils").donnees;
  v1.forEach((o, i) => { assert.deepEqual({ ...v4[i], criteres: o.criteres, confiance: o.confiance }, o, o.nom); assert.equal(v4[i]!.score, o.score); });
  assert.ok(v4.some((o, i) => o.criteres.length < v1[i]!.criteres.length), "au moins un outil a moins de critères que d'étoiles");
});

test("CLI: une option inconnue est refusée", () => {
  const { f } = copie();
  const r = spawnSync("nub", [classify4Ts, f, "--bogus"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Option inconnue: --bogus/);
});
