// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import type { Outil } from "../extract.ts";
import { lireFichier } from "../fichiers.ts";
import { CONTROLE, DEPENDANCE, DONNEES, classer } from "../classify.ts";

const outils = new Map(
  lireFichier<Outil>("outils.json", "outils").donnees.map((o) => [o.nom, o]),
);
const criteres = (nom: string) => {
  const o = outils.get(nom)!;
  return classer(o.description, o.score).criteres;
};

test("trois étoiles donnent les trois critères", () => {
  assert.deepEqual(criteres("Obsidian"), [DONNEES, CONTROLE, DEPENDANCE]);
});
test("outil non canadien auto-hébergeable: données + dépendance", () => {
  assert.deepEqual(criteres("Nextcloud"), [DONNEES, DEPENDANCE]);
});
test("outil canadien avec sauvegardes au Canada mais dépendant", () => {
  assert.deepEqual(criteres("La Réserve"), [DONNEES, CONTROLE]);
});
test("un serveur canadien n'est pas un contrôle canadien", () => {
  assert.deepEqual(criteres("Framapad"), [DONNEES, DEPENDANCE]);
});
test("sans score, on retient les indices forts", () => {
  assert.deepEqual(classer(outils.get("Firefox")!.description).criteres, [DONNEES, DEPENDANCE]);
});
test("le nombre de critères égale le score pour tous les outils", () => {
  for (const [nom, o] of outils) assert.equal(criteres(nom).length, o.score, nom);
});

const classifyTs = resolve("classify.ts");
const copie = () => {
  const f = join(mkdtempSync(join(tmpdir(), "classify-")), "outils.json");
  copyFileSync("outils.json", f);
  return f;
};
test("CLI: --force est refusée comme toute option inconnue (il n'y a plus de build qui la transmettrait)", () => {
  const f = copie();
  const r = spawnSync("nub", [classifyTs, f, "--force"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Option inconnue: --force/);
});
test("CLI: une autre option est refusée et le fichier reste intact", () => {
  const f = copie();
  const avant = readFileSync(f, "utf8");
  const r = spawnSync("nub", [classifyTs, f, "--bogus"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.equal(readFileSync(f, "utf8"), avant);
});
test("CLI: un fichier inchangé garde ses métadonnées (dates comprises), la licence reste CC-BY-SA-4.0", () => {
  const f = copie();
  const avant = JSON.parse(readFileSync(f, "utf8"));
  spawnSync("nub", [classifyTs, f], { encoding: "utf8" });
  const apres = JSON.parse(readFileSync(f, "utf8"));
  assert.deepEqual(apres.meta, avant.meta);
});
test("CLI: un fichier au mauvais format (simple tableau) est refusé avec un message clair et reste intact", () => {
  const f = copie();
  writeFileSync(f, JSON.stringify([{ nom: "a" }]));
  const r = spawnSync("nub", [classifyTs, f], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^Erreur: .*format invalide/);
  assert.equal(readFileSync(f, "utf8"), JSON.stringify([{ nom: "a" }]));
});
test("CLI: « Erreur: » est en rouge dans un terminal forcé (FORCE_COLOR), et reste sans code avec NO_COLOR ou hors terminal", () => {
  const f = copie();
  const lancer = (env: Record<string, string>) =>
    spawnSync("nub", [classifyTs, f, "--bogus"], { encoding: "utf8", env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...env } });
  assert.match(lancer({ FORCE_COLOR: "1" }).stderr, /^\x1b\[1m\x1b\[31mErreur:\x1b\[39m\x1b\[22m Option inconnue/);
  assert.match(lancer({ FORCE_COLOR: "1", NO_COLOR: "1" }).stderr, /^Erreur: Option inconnue/);
  assert.match(lancer({}).stderr, /^Erreur: Option inconnue/);
  const sans = spawnSync("nub", [classifyTs, f, "--sans-couleur"], { encoding: "utf8", env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", FORCE_COLOR: "1" } });
  assert.match(sans.stderr, /^Erreur: Option inconnue: --sans-couleur/); // --sans-couleur désactive aussi la couleur de « Erreur: »
});
