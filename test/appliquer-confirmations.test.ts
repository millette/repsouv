// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// appliquer-confirmations.ts: inscrit dans outils.json le champ criteres_confirmes (critères vérifiés par une IA, citation à l'appui).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { appliquerConfirmations, type FichierConfirmations } from "../appliquer-confirmations.ts";
import { CHAMPS_ENRICHIS, type Outil } from "../extract.ts";
import { lireFichier } from "../fichiers.ts";

const outil = (nom: string): Outil => ({ categorie: "c", icone: "i", nom, score: 2, lien: "https://x", description: "d", derniere_modification: "2026-11-05T09:53:00-05:00", changement: null });
const fichier: FichierConfirmations = {
  meta: { fournisseur: "claude", modele: "claude-fable-5-2", regle: null, date: "2026-11-12T12:41:55.000Z" },
  resultats: [
    { nom: "A", confirmation: { donnees: { statut: "confirme", preuve: "hébergé au Canada" }, controle: { statut: "infirme", preuve: "d'origine internationale" }, dependance: { statut: "indetermine", preuve: null } } },
    { nom: "B", echec: "page inaccessible (HTTP 403)" },
  ],
};

test("appliquerConfirmations: critères confirmés dans l'ordre des critères, citations des confirmés et des infirmés, modèle, règle et date de Toronto", () => {
  const [a, b, c] = appliquerConfirmations([outil("A"), outil("B"), outil("C")], fichier);
  assert.deepEqual(a!.criteres_confirmes, {
    criteres: ["donnees"],
    preuves: { donnees: "hébergé au Canada" },
    infirmes: { controle: "d'origine internationale" },
    modele: "claude-fable-5-2",
    regle: null,
    date: "2026-11-12T07:41:55-05:00",
  });
  assert.equal(b!.criteres_confirmes, undefined, "outil en échec: pas de champ");
  assert.equal(c!.criteres_confirmes, undefined, "outil absent du fichier: pas de champ");
  assert.deepEqual({ ...a, criteres_confirmes: undefined }, { ...outil("A"), criteres_confirmes: undefined }, "les autres champs sont intacts");
});

test("appliquerConfirmations ne modifie pas ses entrées et remplace un criteres_confirmes existant", () => {
  const avant = { ...outil("A"), criteres_confirmes: { criteres: [], preuves: {}, infirmes: {}, modele: "vieux", regle: null, date: "2026-01-01T00:00:00-05:00" } } as Outil;
  const copie = structuredClone(avant);
  const [apres] = appliquerConfirmations([avant], fichier);
  assert.deepEqual(avant, copie);
  assert.equal(apres!.criteres_confirmes!.modele, "claude-fable-5-2");
});

test("criteres_confirmes fait partie des champs d'enrichissement (protégé par extract, conservé par update)", () => {
  assert.ok((CHAMPS_ENRICHIS as readonly string[]).includes("criteres_confirmes"));
});

const script = resolve("appliquer-confirmations.ts");
test("CLI: écrit le champ dans le fichier de sortie sans toucher la source; la source réelle du dépôt porte le champ pour les 57 outils enrichis", () => {
  const d = mkdtempSync(join(tmpdir(), "confirmes-"));
  const src = join(d, "outils.json"), conf = join(d, "conf.json"), dst = join(d, "sortie.json");
  copyFileSync("outils.json", src);
  writeFileSync(conf, JSON.stringify(fichier));
  const avant = readFileSync(src, "utf8");
  const r = spawnSync("nub", [script, conf, src, dst], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(src, "utf8"), avant);
  assert.match(r.stdout, /0 outil\(s\) avec criteres_confirmes/);
  const reel = lireFichier<Outil>("outils.json", "outils").donnees;
  assert.equal(reel.filter((o) => o.criteres_confirmes).length, reel.filter((o) => o.evaluation_enrichie).length);
  for (const o of reel.filter((o) => o.criteres_confirmes)) {
    assert.ok(o.criteres_confirmes!.criteres.every((c) => o.criteres_confirmes!.preuves[c]), o.nom);
    assert.ok(o.criteres_confirmes!.criteres.length <= o.score, `${o.nom}: pas plus de critères confirmés que d'étoiles`);
  }
});

test("CLI: une option inconnue est refusée", () => {
  const r = spawnSync("nub", [script, "--bogus"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Option inconnue: --bogus/);
});
