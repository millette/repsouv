// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Règles de style du site (skill solidjs): le greffon PostCSS retire du CSS les variantes réactives de daisyUI,
// et le balisage n'en emploie aucune (la mise en page réactive est dans src/styles/global.css).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import postcss from "postcss";
import sansVariantes from "../postcss/sans-variantes.mjs";

const traiter = (css: string) => postcss([sansVariantes()]).process(css, { from: undefined }).css;

test("sansVariantes retire les règles à préfixe réactif et garde les autres", () => {
  const css = ".btn{color:red}.sm\\:btn{color:blue}.md\\:card,.lg\\:card{margin:0}.xl\\:x{a:b}.\\32xl\\:y{a:b}.max-sm\\:z{a:b}.badge{c:d}";
  assert.equal(traiter(css), ".btn{color:red}.badge{c:d}");
});

test("sansVariantes garde les sélecteurs sans préfixe d'une règle qui en mélange", () => {
  assert.equal(traiter(".btn,.sm\\:btn{color:red}"), ".btn{color:red}");
});

test("sansVariantes retire une requête média devenue vide", () => {
  assert.equal(traiter("@media (width>=40rem){.sm\\:btn{color:red}}.a{b:c}"), ".a{b:c}");
});

function fichiers(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiers(join(dossier, e.name)) : [join(dossier, e.name)]));
}

test("le balisage du site n'emploie aucune variante réactive (sm:, md:, lg:, xl:, 2xl:)", () => {
  const fautifs = fichiers("src")
    .filter((f) => f.endsWith(".astro") || f.endsWith(".tsx"))
    .filter((f) => /class(List)?=[^>]*?\b(max-)?(sm|md|lg|xl|2xl):/.test(readFileSync(f, "utf8")));
  assert.deepEqual(fautifs, []);
});

import themeSombre from "../postcss/theme-sombre.mjs";

const avecTheme = (css: string) => postcss([themeSombre()]).process(css, { from: undefined }).css;

test("themeSombre applique le thème sombre de daisyUI selon la préférence du système", () => {
  const css = ":root,[data-theme=light]{color-scheme:light;--c:1}:root:has(input.x[value=dark]:checked),[data-theme=dark]{color-scheme:dark;--c:2}";
  // Le thème du système cède à un choix explicite: data-theme posé sur la page par l'interrupteur de l'en-tête.
  assert.equal(avecTheme(css), `${css}@media (prefers-color-scheme: dark){:root:not([data-theme]){color-scheme:dark;--c:2}}`);
});

test("themeSombre ne touche pas une feuille sans thème sombre", () => {
  assert.equal(avecTheme(".a{b:c}"), ".a{b:c}");
});
