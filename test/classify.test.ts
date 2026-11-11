// SPDX-License-Identifier: AGPL-3.0-only
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
test("CLI: --force est accepté sans effet (nub run build --force le transmet à classify)", () => {
  const f = copie();
  const r = spawnSync("nub", [classifyTs, f, "--force"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(readFileSync(f, "utf8")).outils.length, 60);
});
test("CLI: une autre option est refusée et le fichier reste intact", () => {
  const f = copie();
  const avant = readFileSync(f, "utf8");
  const r = spawnSync("nub", [classifyTs, f, "--bogus"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.equal(readFileSync(f, "utf8"), avant);
});
test("CLI: un fichier inchangé garde ses métadonnées, un ancien tableau est converti avec la licence des données", () => {
  const f = copie();
  const avant = JSON.parse(readFileSync(f, "utf8"));
  spawnSync("nub", [classifyTs, f], { encoding: "utf8" });
  const apres = JSON.parse(readFileSync(f, "utf8"));
  assert.equal(apres.meta.updated_at, avant.meta.updated_at);
  assert.equal(apres.meta.created_at, avant.meta.created_at);
  assert.equal(apres.meta.data_license, "CC-BY-SA-4.0");

  writeFileSync(f, JSON.stringify(avant.outils));
  spawnSync("nub", [classifyTs, f], { encoding: "utf8" });
  const converti = JSON.parse(readFileSync(f, "utf8"));
  assert.equal(converti.meta.data_license, "CC-BY-SA-4.0");
  assert.equal(converti.outils.length, 60);
  assert.match(converti.meta.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[45]:00$/);
});
