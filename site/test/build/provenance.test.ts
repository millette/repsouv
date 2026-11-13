// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Provenance et attribution sur tout le site bâti (US4): autres sources créditées, source réelle de chaque outil,
// signalement d'IA en texte visible, et mise en garde sur les verdicts des critères vérifiés.
import assert from "node:assert/strict";
import { test } from "node:test";
import { identifiant } from "../../src/lib/adresses.ts";
import { formaterDate } from "../../src/lib/libelles.ts";
import { LIBELLES_PROVENANCE } from "../../src/lib/provenance.ts";
import { batirAuBesoin, donneesReelles, lirePage, pages, texte } from "./outils.ts";

batirAuBesoin();
const d = donneesReelles();
const actifs = d.outils.filter((o) => !o.removed);
const praxis = d.sources.find((s) => s.id === "praxis")!;
const autres = d.sources.filter((s) => s.id !== "praxis");
const IA = LIBELLES_PROVENANCE.ia;

test("chaque page crédite les autres sources, met en garde sur les champs d'IA et date les données", () => {
  for (const chemin of pages()) {
    const pied = lirePage(chemin).querySelector("footer")!;
    const liens = [...pied.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    for (const s of autres) {
      assert.ok(texte(pied).includes(s.nom), `${chemin}: ${s.nom}`);
      assert.ok(liens.includes(s.url), `${chemin}: ${s.url}`);
    }
    assert.ok(texte(pied).includes(IA), chemin);
    assert.ok(texte(pied).includes(formaterDate(d.meta.updated_at)), chemin);
  }
});

test("la fiche d'un outil qui ne vient pas de Praxis nomme sa source réelle, pas Praxis", () => {
  const dAilleurs = actifs.filter((o) => o.source_repertoire_id !== "praxis");
  assert.ok(dAilleurs.length > 0);
  for (const o of dAilleurs) {
    const section = lirePage(`outils/${identifiant(o.nom)}/index.html`).querySelector('main [data-section="source"]')!;
    assert.ok(!texte(section).includes(praxis.nom), o.nom);
    assert.ok(![...section.querySelectorAll("a")].some((a) => a.getAttribute("href") === praxis.url), o.nom);
  }
});

test("le signalement d'IA est du texte visible, jamais un attribut title ni un texte réservé aux lecteurs d'écran", () => {
  for (const chemin of pages()) {
    const page = lirePage(chemin);
    for (const e of page.querySelectorAll("[title]")) assert.ok(!(e.getAttribute("title") ?? "").includes("IA"), chemin);
    for (const e of page.querySelectorAll(".provenance")) {
      assert.ok(texte(e).length > 0, chemin);
      // Le formulaire de filtres est masqué en entier tant que le script ne l'a pas révélé: son signalement apparaît avec lui.
      if (e.closest("form[data-filtres]")) continue;
      assert.ok(e.closest(".sr-seul, [hidden], [aria-hidden=true]") === null, chemin);
    }
  }
});

test("les critères vérifiés disent que le verdict est celui d'un modèle d'IA et que la citation permet de le contrôler", () => {
  for (const o of actifs) {
    if (!o.criteres_confirmes) continue;
    const lecture = lirePage(`outils/${identifiant(o.nom)}/index.html`).querySelector('main [data-lecture="verifies"]')!;
    const t = texte(lecture);
    assert.ok(t.includes("modèle d'IA"), o.nom);
    assert.ok(t.includes("citation"), o.nom);
    assert.ok(t.includes(o.criteres_confirmes.modele), o.nom);
  }
});

test("un score estimé est dit estimé sur la fiche comme dans la liste", () => {
  for (const o of actifs) {
    const entete = lirePage(`outils/${identifiant(o.nom)}/index.html`).querySelector("main [data-section-entete]")!;
    assert.equal(texte(entete).includes("score estimé"), o.score_estime === true, o.nom);
  }
});
