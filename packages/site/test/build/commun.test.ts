// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Ce que toute page du site bâti doit porter (contracts/pages.md, « Toutes les pages »): langue, structure,
// attribution CC BY-SA 4.0 aux auteur·trices de Praxis et lien vers le répertoire d'origine.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { depuisRacine, racineDepot } from "../../src/lib/chemins.ts";
import { adresseDepot } from "../../src/lib/depot.ts";
import { batirAuBesoin, donneesReelles, lirePage, pages, texte } from "./outils.ts";

batirAuBesoin();
const toutes = pages();
const praxis = donneesReelles().sources.find((s) => s.id === "praxis")!;

test("le site bâti contient l'accueil, la page 404 et une page par outil actif", () => {
  const actifs = donneesReelles().outils.filter((o) => !o.removed).length;
  assert.ok(toutes.includes("index.html"));
  assert.ok(toutes.includes("404.html"));
  assert.ok(!toutes.includes("outils/index.html"));
  assert.ok(toutes.includes("explorer/index.html"));
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

test("chaque page a la navigation principale, avec la page en cours indiquée", () => {
  for (const chemin of toutes) {
    const nav = lirePage(chemin).querySelector('header nav[aria-label="Navigation principale"]');
    assert.ok(nav, chemin);
    const liens = [...nav.querySelectorAll("a")];
    assert.deepEqual(liens.map((a) => [texte(a), a.getAttribute("href")]), [["Accueil", "/"], ["Explorer", "/explorer/"], ["Statistiques", "/statistiques/"]], chemin);
    const attendue = chemin === "index.html" ? "Accueil" : chemin.startsWith("outils/") || chemin.startsWith("explorer/") ? "Explorer" : chemin.startsWith("statistiques/") ? "Statistiques" : null;
    assert.deepEqual(liens.filter((a) => a.getAttribute("aria-current") === "page").map((a) => texte(a)), attendue ? [attendue] : [], chemin);
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

test("chaque page lie le dépôt et dit de quelle version et quand le site a été bâti", () => {
  const depot = adresseDepot(JSON.parse(readFileSync(depuisRacine("package.json"), "utf8")));
  assert.equal(depot, "https://github.com/millette/repsouv");
  const hashes = new Set<string>();
  for (const chemin of toutes) {
    const pied = lirePage(chemin).querySelector("footer")!;
    const liens = [...pied.querySelectorAll("a")];
    assert.equal(liens.find((a) => texte(a) === "Code source et données")?.getAttribute("href"), depot, chemin);
    const version = liens.find((a) => /^[0-9a-f]{7}$/.test(texte(a)));
    assert.ok(version, `${chemin}: hash du build absent`);
    const cible = version.getAttribute("href") ?? "";
    assert.match(cible, new RegExp(`^${depot}/commit/[0-9a-f]{40}$`), chemin);
    assert.ok(cible.endsWith("/" + texte(version)) || cible.split("/").at(-1)!.startsWith(texte(version)), chemin);
    hashes.add(cible.split("/").at(-1)!);
    const date = pied.querySelector("time")?.getAttribute("datetime") ?? "";
    const age = Date.now() - new Date(date).getTime();
    assert.ok(age >= 0 && age < 24 * 3600 * 1000, `${chemin}: date du build « ${date} »`);
    assert.ok(texte(pied.querySelector("time")).length > 0, chemin);
  }
  // Un seul build, donc un seul hash; et c'est un commit qui existe dans le dépôt.
  assert.equal(hashes.size, 1);
  assert.equal(spawnSync("git", ["cat-file", "-e", `${[...hashes][0]}^{commit}`], { cwd: racineDepot() }).status, 0);
});
