// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Page « Statistiques » du site bâti (specs/003-page-statistiques/contracts): chiffres clés, un bloc par graphique
// de la racine, images des deux thèmes, tableaux fidèles, provenance, liens, fichiers de graphiques.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { connuesDe, lireEtat } from "../../src/lib/etat.ts";
import type { DonneesExplorateur } from "../../src/lib/explorateur.ts";
import { formaterDate } from "../../src/lib/libelles.ts";
import { nombre, part } from "../../src/lib/nombres.ts";
import { retenu } from "../../src/lib/selection.ts";
import { chiffresCles, statistiquesDuSite } from "../../src/lib/statistiques.ts";
import { baseDe, provenanceDe, valeursDe } from "../../src/lib/tableaux.ts";
import { batirAuBesoin, DIST, donneesReelles, lirePage, texte } from "./outils.ts";

batirAuBesoin();
const donnees = donneesReelles();
const { stats, graphiques } = await statistiquesDuSite(donnees);
const page = lirePage("statistiques/index.html");
const principal = page.querySelector("main")!;
const figures = [...principal.querySelectorAll("figure[data-graphique]")];
const figure = (id: string) => figures.find((f) => f.getAttribute("data-graphique") === id)!;
const explorateur = JSON.parse(readFileSync(join(DIST, "explorateur.json"), "utf8")) as DonneesExplorateur;

test("la page a son titre, la date des données et la licence des graphiques", () => {
  assert.equal(texte(page.querySelector("h1")), "Statistiques");
  const intro = texte(principal.querySelector(".introduction"));
  assert.ok(intro.includes(formaterDate(donnees.meta.updated_at)));
  assert.ok(intro.includes("dérivés des données"));
  assert.ok(intro.includes("CC BY-SA 4.0"));
});

test("les chiffres clés sont ceux que les fonctions de la racine calculent, avec leur base", () => {
  const c = chiffresCles(stats, donnees);
  const t = texte(principal.querySelector(".chiffres-cles"));
  const sur = `sur ${nombre(c.outils)} outils`;
  assert.ok(t.includes(`${nombre(c.outils)} outils, en ${c.categories} catégories`));
  for (const e of c.etoiles) assert.ok(t.includes(`${nombre(e.outils)} à ${e.etoiles} étoile`), `${e.etoiles} étoiles`);
  assert.ok(t.includes(`${nombre(c.enrichis)} (${part(c.enrichis, c.outils)}), ${sur}`));
  for (const p of c.provenance) assert.ok(t.includes(`${p.nom} : ${nombre(p.outils)} outils (${part(p.outils, c.outils)}, ${sur})`), p.id);
  for (const p of c.pays) assert.ok(t.includes(`${p.nom} ${nombre(p.outils)}`), p.code);
  assert.ok(t.includes(`sur ${nombre(c.avecPays)} outils dont la source donne le pays`));
  // Chaque rubrique qui donne un pourcentage dit sur combien d'outils il porte.
  for (const dd of principal.querySelectorAll(".chiffres-cles dd")) if (texte(dd).includes("%")) assert.match(texte(dd), /sur \d[\d ]* outils/, texte(dd).slice(0, 60));
});

test("un bloc par graphique de la racine, dans l'ordre, avec son titre", () => {
  assert.equal(graphiques.length, 9);
  assert.deepEqual(figures.map((f) => f.getAttribute("data-graphique")), graphiques.map((g) => g.id));
  for (const g of graphiques) assert.equal(texte(figure(g.id).querySelector("h2")), g.titre, g.id);
});

test("chaque graphique a une image par thème, au même texte de remplacement, avec ses dimensions", () => {
  for (const g of graphiques) {
    const images = [...figure(g.id).querySelectorAll("img")];
    assert.deepEqual(images.map((i) => i.getAttribute("src")), [`/graphiques/${g.id}-clair.svg`, `/graphiques/${g.id}-sombre.svg`], g.id);
    for (const i of images) {
      assert.equal(i.getAttribute("alt"), g.description, g.id);
      assert.ok(Number(i.getAttribute("width")) > 0 && Number(i.getAttribute("height")) > 0, g.id);
    }
  }
});

test("les images et les spécifications des deux thèmes existent pour chaque graphique", () => {
  for (const g of graphiques) {
    for (const theme of ["clair", "sombre"]) {
      const svg = readFileSync(join(DIST, "graphiques", `${g.id}-${theme}.svg`), "utf8");
      assert.ok(svg.startsWith("<svg"), `${g.id}-${theme}.svg`);
      const vega = JSON.parse(readFileSync(join(DIST, "graphiques", `${g.id}-${theme}.json`), "utf8")) as { marks?: unknown[]; signals?: { name: string }[]; data?: { values?: { _i?: number }[] }[] };
      assert.ok(Array.isArray(vega.marks), g.id);
      const signaux = (vega.signals ?? []).map((s) => s.name);
      assert.ok(signaux.includes("courant") && signaux.includes("serie"), g.id);
      const valeurs = (vega.data ?? []).flatMap((d) => d.values ?? []);
      assert.deepEqual(valeurs.filter((v) => typeof v._i === "number").map((v) => v._i).slice(0, valeursDe(g).length), valeursDe(g).map((_, i) => i), g.id);
    }
  }
  assert.ok(readFileSync(join(DIST, "graphiques", `${graphiques[0]!.id}-sombre.svg`), "utf8").toLowerCase().includes("#1d232a"));
});

test("sous chaque graphique, un tableau replié « Voir les chiffres », avec légende, en-têtes et une ligne par valeur", () => {
  for (const g of graphiques) {
    const details = figure(g.id).querySelector("details")!;
    assert.ok(!details.hasAttribute("open"), g.id);
    assert.equal(texte(details.querySelector("summary")), "Voir les chiffres", g.id);
    const table = details.querySelector("table")!;
    assert.equal(texte(table.querySelector("caption")), g.titre, g.id);
    assert.ok(table.querySelectorAll('thead th[scope="col"]').length >= 2, g.id);
    assert.equal(table.querySelectorAll("tbody tr").length, valeursDe(g).length, g.id);
  }
});

test("les chiffres d'un tableau sont ceux que son graphique dessine", () => {
  for (const g of graphiques) {
    const lignes = [...figure(g.id).querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => texte(td)));
    valeursDe(g).forEach((valeur, i) => {
      const n = valeur.n;
      if (typeof n === "number") assert.ok(lignes[i]!.includes(nombre(n)) || lignes[i]!.some((c) => c.startsWith(`${nombre(n)} `)), `${g.id}: ligne ${i}, ${n}`);
      if (typeof valeur.etiquette === "string") assert.ok(lignes[i]!.includes(valeur.etiquette), `${g.id}: ${valeur.etiquette}`);
    });
  }
});

test("chaque graphique dit en texte d'où viennent ses chiffres et sur combien d'outils ils portent", () => {
  for (const g of graphiques) {
    const t = texte(figure(g.id).querySelector(".graphique-provenance"));
    for (const libelle of provenanceDe(g.id).libelles) assert.ok(t.includes(libelle), `${g.id}: ${libelle}`);
    assert.ok(t.includes(provenanceDe(g.id).note), g.id);
    assert.ok(t.includes(baseDe(g.id, stats)), g.id);
  }
  assert.ok(texte(figure("criteres-repertoire-enrichie")).includes("déduits des étoiles"));
  assert.ok(texte(figure("criteres-repertoire-enrichie")).includes("évaluation par IA"));
  assert.match(texte(figure("criteres-verdicts")), /vérifiés par un modèle d'IA.*citation/);
});

test("chaque lien d'un tableau mène à l'explorateur et y retient autant d'outils que le chiffre de sa ligne", () => {
  const connues = connuesDe(explorateur);
  let liens = 0;
  for (const g of graphiques) {
    const lignes = [...figure(g.id).querySelectorAll("tbody tr")];
    lignes.forEach((tr, i) => {
      const lien = tr.querySelector("a");
      if (!lien) return;
      liens++;
      const href = lien.getAttribute("href")!;
      assert.ok(href.startsWith("/explorer/?"), href);
      const etat = lireEtat(href.split("?")[1]!, connues);
      assert.equal(explorateur.outils.filter((o) => retenu(o, etat)).length, valeursDe(g)[i]!.n, `${g.id}: ${texte(lien)}`);
    });
    if (!["statut-code-source", "categories-statut", "tags"].includes(g.id)) assert.equal(figure(g.id).querySelectorAll("tbody a").length, 0, g.id);
  }
  assert.ok(liens > 20);
});

test("la page n'affiche pas le résumé du sommaire, et aucun nombre n'a de point décimal", () => {
  assert.equal(principal.querySelectorAll("figure").length, graphiques.length);
  const sommaire = existsSync("../sommaire.md") ? readFileSync("../sommaire.md", "utf8") : "";
  const resume = sommaire.split("\n").find((l) => l.startsWith("Ce répertoire rassemble"));
  if (resume) assert.ok(!texte(principal).includes(resume.slice(0, 60)));
  for (const cellule of principal.querySelectorAll("td, dd")) assert.doesNotMatch(texte(cellule), /(^| )\d+\.\d+( %|$| )/, texte(cellule).slice(0, 60));
});
