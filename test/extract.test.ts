import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dateIso, extraire } from "../extract.ts";
import { ID_PAR_ICONE } from "../ids.ts";

test("dateIso convertit la date française", () => {
  assert.equal(dateIso("5 novembre 2026 09:53"), "2026-11-05T09:53");
});
test("criteres.json: chaque critère a un id correspondant à son icône", () => {
  const criteres: { id: string; icon: string }[] = JSON.parse(readFileSync("criteres.json", "utf8"));
  assert.equal(criteres.length, 3);
  for (const c of criteres) assert.equal(ID_PAR_ICONE[c.icon], c.id);
});
test("outils.json: critères désignés par id, un par étoile", () => {
  const ids = new Set(Object.values(ID_PAR_ICONE));
  const outils: { nom: string; score: number; criteres: string[] }[] = JSON.parse(readFileSync("outils.json", "utf8"));
  assert.equal(outils.length, 60);
  for (const o of outils) {
    assert.equal(o.criteres.length, o.score, o.nom);
    for (const c of o.criteres) assert.ok(ids.has(c as never), `${o.nom}: ${c}`);
  }
});
test("extraire rejette une page sans date de modification", () => {
  assert.throws(() => extraire("<html></html>"), /introuvable/);
});
