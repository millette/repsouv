// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// description_longue (Markdown produit par IA) rendue en HTML sûr: titres décalés sous ceux de la fiche, HTML brut neutralisé.
import assert from "node:assert/strict";
import { test } from "node:test";
import { rendreDescription } from "../src/lib/markdown.ts";

test("paragraphes, listes, gras et italique", () => {
  const html = rendreDescription("Un **nuage** *libre*.\n\n- fichiers\n- agenda");
  assert.match(html, /<p>Un <strong>nuage<\/strong> <em>libre<\/em>\.<\/p>/);
  assert.match(html, /<ul>\s*<li>fichiers<\/li>\s*<li>agenda<\/li>\s*<\/ul>/);
});

test("les titres sont décalés de deux niveaux, plafonnés à h6", () => {
  const html = rendreDescription("# Un\n\n## Deux\n\n### Trois\n\n#### Quatre\n\n##### Cinq\n\n###### Six");
  assert.deepEqual([...html.matchAll(/<h(\d)>/g)].map((m) => m[1]), ["3", "4", "5", "6", "6", "6"]);
  assert.match(html, /<h3>Un<\/h3>/);
});

test("le HTML brut des données n'est jamais inséré tel quel", () => {
  const html = rendreDescription("Texte <script>alert(1)</script> et <img src=x onerror=y>\n\n<div onclick=\"z()\">bloc</div>");
  assert.doesNotMatch(html, /<script|<img|<div/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /bloc/);
});

test("les liens gardent leur adresse", () => {
  assert.match(rendreDescription("[site](https://exemple.org/a?b=1)"), /<a href="https:\/\/exemple\.org\/a\?b=1">site<\/a>/);
});

test("un lien javascript: est neutralisé", () => {
  assert.doesNotMatch(rendreDescription("[piège](javascript:alert(1))"), /href="javascript:/i);
});
