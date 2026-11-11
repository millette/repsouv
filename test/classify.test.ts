import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Outil } from "../extract.ts";
import { CONTROLE, DEPENDANCE, DONNEES, classer } from "../classify.ts";

const outils = new Map(
  (JSON.parse(readFileSync("outils.json", "utf8")) as Outil[]).map((o) => [o.nom, o]),
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
