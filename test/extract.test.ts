import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { dateIso, extraire, travailAPerdre } from "../extract.ts";
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

test("travailAPerdre: un import brut ou classifié n'a rien à perdre", () => {
  assert.deepEqual(travailAPerdre([{ nom: "a", changement: null }, { nom: "b", criteres: ["donnees"] } as never]), []);
});
test("travailAPerdre: l'enrichissement et l'historique sont signalés", () => {
  const perte = travailAPerdre([
    { nom: "a", description_longue: "Longue." },
    { nom: "b", licence: null },
    { nom: "c", changement: "modification" },
    { nom: "d", removed: true },
  ]);
  assert.equal(perte.length, 2);
  assert.match(perte[0]!, /2 outil\(s\) enrichi/);
  assert.match(perte[1]!, /2 outil\(s\) avec un historique/);
});

// Page minimale: une date de modification et un seul outil.
const PAGE = `<html><body>
<p class="overline-col">Modification</p><p class="text-col">5 novembre 2026 09:53</p>
<blockquote><h3>🧪 Test</h3><p><strong><a href="https://x.example/">X</a> ★★☆</strong></p><p>Une description.</p></blockquote>
</body></html>`;
const extractTs = resolve("extract.ts");
const lancer = (dossier: string, ...args: string[]) =>
  spawnSync("nub", [extractTs, ...args, dossier, join(dossier, "outils.json")], { encoding: "utf8" });

test("CLI: refuse d'écraser un outils.json enrichi sans --force, puis l'écrase avec --force", () => {
  const dossier = mkdtempSync(join(tmpdir(), "extract-"));
  writeFileSync(join(dossier, "page.html"), PAGE);
  const sortie = join(dossier, "outils.json");
  const enrichi = JSON.stringify([{ nom: "X", description_longue: "Précieuse." }]);
  writeFileSync(sortie, enrichi);

  const refus = lancer(dossier);
  assert.equal(refus.status, 1);
  assert.match(refus.stderr, /Refus d'écraser/);
  assert.match(refus.stderr, /--force/);
  assert.equal(readFileSync(sortie, "utf8"), enrichi);

  const force = lancer(dossier, "--force");
  assert.equal(force.status, 0, force.stderr);
  const outils = JSON.parse(readFileSync(sortie, "utf8"));
  assert.equal(outils[0].nom, "X");
  assert.equal(outils[0].description_longue, undefined);
});
test("CLI: sans travail à perdre (ou sans fichier), l'import se fait sans --force", () => {
  const dossier = mkdtempSync(join(tmpdir(), "extract-"));
  writeFileSync(join(dossier, "page.html"), PAGE);
  assert.equal(lancer(dossier).status, 0);
  assert.equal(lancer(dossier).status, 0); // le fichier produit n'a rien de précieux
});
test("CLI: une option inconnue est refusée", () => {
  const dossier = mkdtempSync(join(tmpdir(), "extract-"));
  writeFileSync(join(dossier, "page.html"), PAGE);
  assert.notEqual(lancer(dossier, "--forse").status, 0);
});
