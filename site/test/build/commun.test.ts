// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Ce que toute page du site bâti doit porter (contracts/pages.md, « Toutes les pages »): langue, structure,
// attribution CC BY-SA 4.0 aux auteur·trices de Praxis et lien vers le répertoire d'origine.
import assert from "node:assert/strict";
import { test } from "node:test";
import { batirAuBesoin, donneesReelles, lirePage, pages, texte } from "./outils.ts";

batirAuBesoin();
const toutes = pages();
const praxis = donneesReelles().sources.find((s) => s.id === "praxis")!;

test("le site bâti contient l'accueil, la page 404 et une page par outil actif", () => {
  const actifs = donneesReelles().outils.filter((o) => !o.removed).length;
  assert.ok(toutes.includes("index.html"));
  assert.ok(toutes.includes("404.html"));
  assert.equal(toutes.filter((p) => p.startsWith("outils/")).length, actifs);
});

test("chaque page déclare le français, a un titre, un seul h1, un contenu principal et un lien d'évitement", () => {
  for (const chemin of toutes) {
    const d = lirePage(chemin);
    assert.equal(d.documentElement.getAttribute("lang"), "fr-CA", chemin);
    assert.ok(texte(d.querySelector("title")).length > 0, chemin);
    assert.equal(d.querySelectorAll("h1").length, 1, chemin);
    assert.ok(d.querySelector("main#contenu"), chemin);
    assert.ok(d.querySelector("header"), chemin);
    assert.equal(d.querySelector("a")?.getAttribute("href"), "#contenu", chemin);
  }
});

test("chaque page a dans son en-tête l'interrupteur de thème, masqué tant que le script ne l'a pas révélé", () => {
  for (const chemin of toutes) {
    const etiquette = lirePage(chemin).querySelector("header label.swap");
    assert.ok(etiquette, chemin);
    assert.ok(etiquette.hasAttribute("hidden"), chemin);
    const caseTheme = etiquette.querySelector('input[type="checkbox"].theme-controller');
    assert.equal(caseTheme?.getAttribute("value"), "dark", chemin);
    assert.equal(caseTheme?.getAttribute("aria-label"), "Thème sombre", chemin);
    assert.equal(etiquette.querySelectorAll("svg[aria-hidden=true]").length, 2, chemin);
  }
});

test("chaque page porte dans son pied l'attribution à Praxis, la licence CC BY-SA 4.0 et le lien vers le répertoire d'origine", () => {
  for (const chemin of toutes) {
    const pied = lirePage(chemin).querySelector("footer");
    assert.ok(pied, chemin);
    const t = texte(pied);
    for (const nom of ["Sven Buridans", "François Delnooz", "Marie-Renee Duguay"]) assert.ok(t.includes(nom), `${chemin}: ${nom}`);
    const liens = [...pied!.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    assert.ok(liens.includes("https://creativecommons.org/licenses/by-sa/4.0/deed.fr"), chemin);
    assert.ok(t.includes("CC BY-SA 4.0"), chemin);
    assert.ok(liens.includes(praxis.url), chemin);
  }
});
