// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// L'écriture des SVG; les spécifications elles-mêmes sont testées dans packages/commun/test/graphiques.test.ts.
// Un faux convertisseur remplace vl-convert; deux tests appellent le vrai programme (ignorés s'il n'est pas installé).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { construireGraphiques, convertirAvecVlConvert, ecrireGraphiques, verifierVlConvert } from "../graphiques.ts";
import { calculerStatistiques } from "../../commun/statistiques.ts";
import { entree, outil } from "../../commun/test/donnees-fictives.ts";

const stats = () => calculerStatistiques(entree());

const faux = (appels: string[]) => (_spec: unknown, svg: string) => {
  appels.push(svg);
  writeFileSync(svg, "<svg/>");
};
test("ecrireGraphiques: un SVG par graphique, chemin relatif au sommaire", () => {
  const dossier = join(mkdtempSync(join(tmpdir(), "graph-")), "graphiques");
  const appels: string[] = [];
  const gs = construireGraphiques(stats());
  const ecrits = ecrireGraphiques(gs, dossier, faux(appels));
  assert.equal(ecrits.length, gs.length);
  assert.equal(ecrits[0]!.svg, "graphiques/statut-code-source.svg");
  assert.equal("png" in ecrits[0]!, false);
  assert.equal(readdirSync(dossier).length, gs.length);
  assert.equal(appels.length, gs.length);
});
test("ecrireGraphiques: le SVG d'un graphique qui n'est plus produit et les anciens PNG sont supprimés, les autres fichiers restent", () => {
  const dossier = join(mkdtempSync(join(tmpdir(), "graph-")), "graphiques");
  mkdirSync(dossier);
  writeFileSync(join(dossier, "forges.svg"), "vieux");
  writeFileSync(join(dossier, "forges.png"), "vieux");
  writeFileSync(join(dossier, "statut-code-source.png"), "ancien format");
  writeFileSync(join(dossier, "mes-notes.png"), "à moi");
  ecrireGraphiques(construireGraphiques(calculerStatistiques(entree([outil("X")]))), dossier, faux([]));
  assert.equal(existsSync(join(dossier, "forges.svg")), false);
  assert.equal(existsSync(join(dossier, "forges.png")), false);
  assert.equal(existsSync(join(dossier, "statut-code-source.png")), false);
  assert.equal(readFileSync(join(dossier, "mes-notes.png"), "utf8"), "à moi");
});
test("ecrireGraphiques: une erreur du convertisseur remonte", () => {
  const dossier = join(mkdtempSync(join(tmpdir(), "graph-")), "graphiques");
  assert.throws(() => ecrireGraphiques(construireGraphiques(stats()), dossier, () => { throw new Error("boum"); }), /boum/);
});
test("vl-convert absent: message clair avec la façon de l'installer ou de s'en passer", () => {
  assert.throws(() => verifierVlConvert("vl-convert-qui-n-existe-pas"), /introuvable.*cargo install vl-convert.*--sans-graphiques/s);
  assert.throws(() => convertirAvecVlConvert({} as never, "a.svg", "vl-convert-qui-n-existe-pas"), /introuvable/);
});

const vlConvertInstalle = spawnSync("vl-convert", ["--version"]).status === 0;
test("vl-convert réel: les graphiques sont convertis en vrais SVG, autonomes (sans script ni ressource externe) pour être affichés par GitHub", { skip: !vlConvertInstalle && "vl-convert n'est pas installé" }, () => {
  const dossier = join(mkdtempSync(join(tmpdir(), "graph-")), "graphiques");
  const [premier] = construireGraphiques(stats());
  const [ecrit] = ecrireGraphiques([premier!], dossier);
  assert.deepEqual(readdirSync(dossier), ["statut-code-source.svg"]);
  const svg = readFileSync(join(dossier, "statut-code-source.svg"), "utf8");
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]* width="\d+" height="\d+" viewBox=/);
  assert.match(svg, /Statut du code source/);
  assert.ok(svg.length > 5_000);
  assert.doesNotMatch(svg, /<script|<style|<image|<foreignObject|href="http/);
  assert.equal(ecrit!.svg, "graphiques/statut-code-source.svg");
  assert.match(verifierVlConvert(), /^vl-convert \d/);
});
test("vl-convert réel: une spécification invalide est une erreur avec le message de vl-convert", { skip: !vlConvertInstalle && "vl-convert n'est pas installé" }, () => {
  const dossier = mkdtempSync(join(tmpdir(), "graph-"));
  assert.throws(() => convertirAvecVlConvert({ mark: "inexistant" } as never, join(dossier, "a.svg")), /vl-convert vl2svg/);
});

test("ecrireGraphiques: le suivi est prévenu avant chaque graphique (titre) et après (nombre écrit)", () => {
  const dossier = join(mkdtempSync(join(tmpdir(), "graph-")), "graphiques");
  const gs = construireGraphiques(stats());
  const debuts: string[] = [];
  const faits: number[] = [];
  ecrireGraphiques(gs, dossier, faux([]), { debut: (g) => debuts.push(g.titre), fin: (n) => faits.push(n) });
  assert.deepEqual(debuts, gs.map((g) => g.titre));
  assert.deepEqual(faits, gs.map((_, i) => i + 1));
});
