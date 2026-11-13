// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les fichiers Markdown rédigés à la main (README, implementation.md, historique.md) suivent les conventions de
// implementation.md (section « Documentation ») : liens et ancres qui existent, ligne « Documentation », pas de
// tiret cadratin, aucune balise HTML sauf l'image du README. Les liens vers donnees/sommaire.md, généré, sont vérifiés
// par test/donnees/documentation.test.ts, qui exige les données.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { ancre, FICHIERS_GENERES, FICHIERS_REDIGES, problemesConventions, problemesLiens } from "./markdown.ts";
import { depuisRacine } from "./racine.ts";

test("ancre: casse, accents, accents graves et ponctuation, comme GitHub", () => {
  assert.equal(ancre("Scripts npm (`package.json`)"), "scripts-npm-packagejson");
  assert.equal(ancre("D'où viennent les champs"), "doù-viennent-les-champs");
  assert.equal(ancre("`outils.json`"), "outilsjson");
});

test("problemesLiens: ancre du même fichier, ancre d'un autre fichier, fichier et ancre introuvables; les liens dans le code sont ignorés", () => {
  const autres: Record<string, string> = { "b.md": "# B\n\n## Section b\n" };
  const lire = (f: string) => autres[f] ?? null;
  const md = "# A\n\n## Ici\n\n[x](#ici) [y](b.md#section-b) [z](b.md) [w](https://exemple.org/#rien) `[q](#absent)`\n";
  assert.deepEqual(problemesLiens("a.md", md, lire), []);
  assert.deepEqual(problemesLiens("a.md", "[p](#absent) [r](c.md) [s](b.md#rien)", lire), ["ancre introuvable: #absent", "fichier introuvable: c.md", "ancre introuvable: b.md#rien"]);
});

test("problemesConventions: ligne Documentation, tiret cadratin, balises HTML, image du README seulement", () => {
  const entete = "# T\n\n*Documentation : [README](README.md) · [Implémentation](implementation.md) · [Historique](historique.md) · [Sommaire statistique](sommaire.md)*\n";
  assert.deepEqual(problemesConventions("x.md", entete), []);
  assert.deepEqual(problemesConventions("x.md", "# T\n\ntexte"), ["titre de niveau 1 ou ligne « Documentation » manquants"]);
  assert.deepEqual(problemesConventions("x.md", `${entete}a — b <b>c</b> \`<i>\``), ["tiret cadratin", "balises HTML: <b>"]);
  assert.deepEqual(problemesConventions("x.md", `${entete}<img src="a.svg">`), ["balise <img>: 1"]);
  assert.deepEqual(problemesConventions("README.md", `${entete}<img src="a.svg">`), []);
  assert.deepEqual(problemesConventions("README.md", entete), ["balise <img>: 0"]);
});

const lire = (f: string) => (existsSync(depuisRacine(f)) ? readFileSync(depuisRacine(f), "utf8") : null);
// Le lien d'un fichier rédigé vers un fichier généré: « donnees/sommaire.md » à la racine, « ../donnees/sommaire.md » d'un sous-dossier.
const versGenere = (p: string) => FICHIERS_GENERES.some((g) => p.startsWith("fichier introuvable: ") && p.endsWith(g));

test("les fichiers Markdown rédigés existent et leurs liens relatifs et ancres sont valides (hors fichiers générés)", () => {
  for (const f of FICHIERS_REDIGES) {
    const md = lire(f);
    assert.ok(md !== null, f);
    assert.deepEqual(problemesLiens(f, md!, lire).filter((p) => !versGenere(p)), [], f);
  }
});

test("les fichiers Markdown rédigés respectent les conventions (titre, ligne Documentation, pas de tiret cadratin, HTML limité à l'image du README)", () => {
  for (const f of FICHIERS_REDIGES) assert.deepEqual(problemesConventions(f, lire(f)!), [], f);
});
