// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Page « Outils » du site bâti (specs/002-explorateur-outils/contracts/pages.md): tous les outils actifs, par catégorie,
// lisibles sans script, sans filtre ni île.
import assert from "node:assert/strict";
import { test } from "node:test";
import { identifiant } from "../../src/lib/adresses.ts";
import { LIBELLES_PROVENANCE } from "../../src/lib/provenance.ts";
import { LIBELLES_STATUT, texteEtoiles } from "../../src/lib/libelles.ts";
import { batirAuBesoin, donneesReelles, lirePage, texte } from "./outils.ts";

batirAuBesoin();
const d = donneesReelles();
const actifs = d.outils.filter((o) => !o.removed);
const page = lirePage("outils/index.html");
const sections = [...page.querySelectorAll("section[data-categorie]")];
const cartes = [...page.querySelectorAll("[data-outil]")];
const carteDe = (nom: string) => cartes.find((c) => c.getAttribute("data-outil") === identifiant(nom))!;

test("une section par catégorie ayant un outil actif, dans l'ordre des données, avec son titre", () => {
  const attendues = d.categories.filter((c) => actifs.some((o) => o.categorie === c.id));
  assert.deepEqual(sections.map((s) => s.getAttribute("data-categorie")), attendues.map((c) => c.id));
  sections.forEach((s, i) => assert.ok(texte(s.querySelector("h2")).includes(attendues[i]!.nom), attendues[i]!.id));
});

test("la description d'une catégorie est signalée comme produite par IA", () => {
  for (const s of sections) {
    const categorie = d.categories.find((c) => c.id === s.getAttribute("data-categorie"))!;
    if (!categorie.description) continue;
    assert.ok(texte(s).includes(categorie.description), categorie.id);
    assert.ok(texte(s.querySelector(".categorie-description")).includes(LIBELLES_PROVENANCE.ia), categorie.id);
  }
});

test("une carte par outil actif, une seule fois, dans la section de sa catégorie", () => {
  assert.deepEqual(cartes.map((c) => c.getAttribute("data-outil")).sort(), actifs.map((o) => identifiant(o.nom)).sort());
  for (const o of actifs) assert.equal(carteDe(o.nom).closest("section")?.getAttribute("data-categorie"), o.categorie, o.nom);
});

test("chaque carte lie la fiche et montre le nom, le score en texte et la description", () => {
  for (const o of actifs) {
    const carte = carteDe(o.nom);
    const lien = carte.querySelector("a");
    assert.equal(lien?.getAttribute("href"), `/outils/${identifiant(o.nom)}/`, o.nom);
    assert.equal(texte(lien), o.nom);
    assert.ok(texte(carte).includes(texteEtoiles(o.score)), o.nom);
    assert.ok(texte(carte).includes(o.description.replace(/\s+/g, " ").trim()), o.nom);
  }
});

test("« score estimé » apparaît si et seulement si le score ne vient pas de la source", () => {
  for (const o of actifs) assert.equal(texte(carteDe(o.nom)).includes("score estimé"), o.score_estime === true, o.nom);
});

test("le statut du code source et son signalement d'IA apparaissent si et seulement si l'outil est enrichi", () => {
  for (const o of actifs) {
    const t = texte(carteDe(o.nom));
    if (o.source) {
      assert.ok(t.includes(LIBELLES_STATUT[o.source]), o.nom);
      assert.ok(t.includes(LIBELLES_PROVENANCE.ia), o.nom);
    } else {
      assert.equal(carteDe(o.nom).querySelector(".statut"), null, o.nom);
      assert.ok(!t.includes(LIBELLES_PROVENANCE.ia), o.nom);
    }
  }
});

test("aucun élément vide dans une carte", () => {
  for (const carte of cartes) {
    for (const e of carte.querySelectorAll("p, span, li, h3, a, div")) assert.ok(texte(e).length > 0, `${carte.getAttribute("data-outil")}: <${e.tagName.toLowerCase()} class="${e.getAttribute("class")}"> vide`);
  }
});

test("la page n'a ni formulaire ni île: tout filtrage passe par l'explorateur, auquel elle renvoie", () => {
  assert.equal(page.querySelectorAll("main form, main astro-island").length, 0);
  assert.ok([...page.querySelectorAll("main a")].some((a) => a.getAttribute("href") === "/explorer/"));
});

test("la page annonce le nombre total d'outils", () => {
  assert.ok(texte(page.querySelector("main .compteur")).includes(`${actifs.length} outils`));
});
