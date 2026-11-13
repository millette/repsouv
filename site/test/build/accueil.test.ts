// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Accueil du site bâti (specs/002-explorateur-outils/contracts/pages.md): une présentation du projet, sans liste
// d'outils ni filtre, dont les nombres viennent des données.
import assert from "node:assert/strict";
import { test } from "node:test";
import { LOGICIELS } from "../../src/lib/presentation.ts";
import { batirAuBesoin, donneesReelles, lirePage, texte } from "./outils.ts";

batirAuBesoin();
const d = donneesReelles();
const actifs = d.outils.filter((o) => !o.removed);
const page = lirePage("index.html");
const principal = page.querySelector("main")!;
const t = texte(principal);

test("l'accueil a ses quatre sections", () => {
  assert.deepEqual([...principal.querySelectorAll("h2")].map((h) => texte(h)), ["Le répertoire", "Genèse", "Crédits", "Logiciels utilisés"]);
});

test("les nombres d'outils, de catégories et de sources viennent des données", () => {
  const categories = new Set(actifs.map((o) => o.categorie)).size;
  assert.ok(t.includes(`${actifs.length} outils et services numériques, en ${categories} catégories, tirés de ${d.sources.length} sources`));
  for (const s of d.sources) assert.ok(t.includes(`(${actifs.filter((o) => o.source_repertoire_id === s.id).length} outils)`), s.id);
});

test("les trois critères, les auteur·trices du répertoire d'origine et chaque source sont nommés", () => {
  for (const c of d.criteres) assert.ok(t.includes(c.titre), c.id);
  for (const nom of ["Sven Buridans", "François Delnooz", "Marie-Renee Duguay", "Robin Millette", "La bande numérique"]) assert.ok(t.includes(nom), nom);
  const liens = [...principal.querySelectorAll("a")].map((a) => a.getAttribute("href"));
  for (const s of d.sources) {
    assert.ok(t.includes(s.nom), s.id);
    assert.ok(liens.includes(s.url), s.id);
  }
});

test("chaque logiciel utilisé est nommé, lié et décrit", () => {
  for (const l of LOGICIELS.flatMap((g) => g.logiciels)) {
    const lien = [...principal.querySelectorAll("dt a")].find((a) => texte(a) === l.nom);
    assert.equal(lien?.getAttribute("href"), l.url, l.nom);
    assert.ok(t.includes(l.role), l.nom);
  }
});

test("l'accueil mène à la page « Explorer », et ne porte ni carte d'outil, ni formulaire, ni île", () => {
  const liens = [...principal.querySelectorAll("a")].map((a) => a.getAttribute("href"));
  assert.ok(!liens.includes("/outils/"));
  assert.ok(liens.includes("/explorer/"));
  assert.equal(principal.querySelectorAll("[data-outil], form, astro-island").length, 0);
});
