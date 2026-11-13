// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Fiches du site bâti (contracts/pages.md, « Fiche »): une par outil actif, les sections que ses données justifient et
// aucune autre, la provenance en texte, les citations reproduites telles quelles, et aucun champ vide.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { identifiant } from "../../src/lib/adresses.ts";
import type { OutilClasse } from "../../src/lib/donnees.ts";
import { LIBELLES_PROVENANCE } from "../../src/lib/provenance.ts";
import { batirAuBesoin, DIST, donneesReelles, lirePage, pages, texte } from "./outils.ts";

batirAuBesoin();
const d = donneesReelles();
const actifs = d.outils.filter((o) => !o.removed);
const nomsActifs = new Set(actifs.map((o) => o.nom));
const fiche = (o: OutilClasse) => lirePage(`outils/${identifiant(o.nom)}/index.html`);
const compact = (s: string) => s.replace(/\s+/g, " ").trim();
const IA = LIBELLES_PROVENANCE.ia;

/** Sections attendues d'après les champs de l'outil, dans l'ordre du contrat. */
function sectionsAttendues(o: OutilClasse): string[] {
  return [
    "description",
    o.description_longue ? "description-longue" : null,
    "criteres",
    o.licence || o.custom_license || o.repo ? "code" : null,
    o.tags?.length ? "tags" : null,
    o.pays || o.instance_de ? "logiciel" : null,
    o.openhub ? "openhub" : null,
    o.alternative_a?.length ? "remplace" : null,
    o.voir_aussi?.length ? "voir-aussi" : null,
    "source",
  ].filter((s): s is string => s !== null);
}

test("chaque outil actif a sa fiche, avec son nom en h1 et un lien vers son site", () => {
  for (const o of actifs) {
    const page = fiche(o);
    assert.equal(texte(page.querySelector("h1")), o.nom);
    assert.ok([...page.querySelectorAll("main a")].some((a) => a.getAttribute("href") === o.lien), o.nom);
  }
});

test("chaque fiche a exactement les sections que ses données justifient, dans l'ordre du contrat", () => {
  for (const o of actifs) {
    const sections = [...fiche(o).querySelectorAll("main [data-section]")].map((s) => s.getAttribute("data-section"));
    assert.deepEqual(sections, sectionsAttendues(o), o.nom);
  }
});

test("aucun titre, paragraphe, élément de liste, terme, citation ou lien vide", () => {
  for (const o of actifs) {
    for (const e of fiche(o).querySelectorAll("main h2, main h3, main h4, main p, main li, main dt, main dd, main blockquote, main a, main span, main section")) {
      assert.ok(texte(e).length > 0, `${o.nom}: <${e.tagName.toLowerCase()} class="${e.getAttribute("class")}"> vide`);
    }
    assert.ok(!/\b(undefined|null|NaN)\b/.test(texte(fiche(o).querySelector("main"))), `${o.nom}: valeur brute affichée`);
  }
});

test("chaque section d'un champ produit par IA porte le signalement en texte", () => {
  for (const o of actifs) {
    const page = fiche(o);
    for (const nom of ["description-longue", "code", "tags"]) {
      const section = page.querySelector(`main [data-section="${nom}"]`);
      if (section) assert.ok(texte(section).includes(IA), `${o.nom}: ${nom}`);
    }
    if (o.source) assert.ok(texte(page.querySelector("main [data-section-entete]")).includes(IA), `${o.nom}: statut`);
  }
});

test("la fiche d'un outil non enrichi ne porte aucun signalement d'IA et n'a que les critères déduits", () => {
  const nonEnrichis = actifs.filter((o) => !o.enrichi_le);
  assert.ok(nonEnrichis.length > 0);
  for (const o of nonEnrichis) {
    const page = fiche(o);
    assert.ok(!texte(page.querySelector("main")).includes(IA), o.nom);
    assert.deepEqual([...page.querySelectorAll("main [data-lecture]")].map((l) => l.getAttribute("data-lecture")), ["deduits"], o.nom);
  }
});

test("les trois lectures des critères: présentes selon les données, nommées, avec leur provenance", () => {
  for (const o of actifs) {
    const page = fiche(o);
    const attendues = [o.criteres_confirmes ? "verifies" : null, "deduits", o.evaluation_enrichie ? "second-avis" : null].filter(Boolean);
    const lectures = [...page.querySelectorAll("main [data-lecture]")];
    assert.deepEqual(lectures.map((l) => l.getAttribute("data-lecture")), attendues, o.nom);
    for (const l of lectures) {
      assert.ok(texte(l.querySelector("h3")).length > 0, o.nom);
      const attendu = l.getAttribute("data-lecture") === "deduits" ? LIBELLES_PROVENANCE.heuristique : IA;
      assert.ok(texte(l).includes(attendu), `${o.nom}: ${l.getAttribute("data-lecture")}`);
    }
  }
});

test("chaque citation des critères vérifiés est reproduite telle quelle dans un blockquote", () => {
  for (const o of actifs) {
    if (!o.criteres_confirmes) continue;
    const citations = [...fiche(o).querySelectorAll('main [data-lecture="verifies"] blockquote')].map((b) => compact(b.textContent ?? ""));
    const attendues = [...Object.values(o.criteres_confirmes.preuves), ...Object.values(o.criteres_confirmes.infirmes)].map((c) => compact(c!));
    assert.deepEqual([...citations].sort(), [...attendues].sort(), o.nom);
  }
});

test("la source de l'outil est nommée et liée", () => {
  for (const o of actifs) {
    const source = d.sources.find((s) => s.id === o.source_repertoire_id)!;
    const section = fiche(o).querySelector('main [data-section="source"]');
    assert.ok(texte(section).includes(source.nom), o.nom);
    assert.ok([...section!.querySelectorAll("a")].some((a) => a.getAttribute("href") === source.url), o.nom);
  }
});

test("un outil apparenté qui a une fiche y renvoie; les autres sont du texte", () => {
  for (const o of actifs) {
    if (!o.voir_aussi?.length) continue;
    const section = fiche(o).querySelector('main [data-section="voir-aussi"]')!;
    for (const nom of o.voir_aussi) {
      const lien = [...section.querySelectorAll("a")].find((a) => texte(a) === nom);
      if (nomsActifs.has(nom)) assert.equal(lien?.getAttribute("href"), `/outils/${identifiant(nom)}/`, `${o.nom} → ${nom}`);
      else {
        assert.equal(lien, undefined, `${o.nom} → ${nom}`);
        assert.ok(texte(section).includes(nom), `${o.nom} → ${nom}`);
      }
    }
  }
});

test("services remplacés, logiciel sous-jacent, pays et Open Hub s'affichent quand les données les portent", () => {
  for (const o of actifs) {
    const page = fiche(o);
    for (const url of o.alternative_a ?? []) assert.ok([...page.querySelectorAll('main [data-section="remplace"] a')].some((a) => a.getAttribute("href") === url), `${o.nom}: ${url}`);
    if (o.instance_de) assert.ok([...page.querySelectorAll('main [data-section="logiciel"] a')].some((a) => a.getAttribute("href") === o.instance_de!.url), o.nom);
    if (o.openhub) {
      const section = page.querySelector('main [data-section="openhub"]')!;
      assert.ok(texte(section).includes(LIBELLES_PROVENANCE.openhub), o.nom);
      assert.ok([...section.querySelectorAll("a")].some((a) => a.getAttribute("href") === `https://www.openhub.net/p/${o.openhub_id}`), o.nom);
    }
  }
});

test("la description détaillée n'insère aucun HTML venu des données", () => {
  for (const o of actifs) {
    const section = fiche(o).querySelector('main [data-section="description-longue"]');
    if (section) assert.equal(section.querySelectorAll("script, img, iframe, style, object, embed, form, input").length, 0, o.nom);
  }
});

test("tous les liens internes du site mènent à une page bâtie", () => {
  for (const chemin of pages()) {
    for (const a of lirePage(chemin).querySelectorAll("a[href]")) {
      const href = a.getAttribute("href")!;
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const cible = href.split(/[?#]/)[0]!;
      const fichier = cible.endsWith("/") ? join(DIST, cible, "index.html") : join(DIST, cible);
      assert.ok(existsSync(fichier), `${chemin}: lien mort ${href}`);
    }
  }
});
