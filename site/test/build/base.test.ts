// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Le site bâti pour GitHub Pages vit sous le chemin du dépôt (specs/004-deploiement-github-pages): toute adresse
// interne des pages commence par ce chemin et mène à un fichier bâti.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const BASE = "/repsouv/";
const DOSSIER = "dist-base";

function batir(base: string): void {
  rmSync(DOSSIER, { recursive: true, force: true });
  const r = spawnSync("nub", ["exec", "astro", "build", "--outDir", DOSSIER], { encoding: "utf8", env: { ...process.env, SITE_URL: "https://millette.github.io", SITE_BASE: base } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
}

const fichiers = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiers(join(d, e.name)) : [join(d, e.name)]));
const pages = () => fichiers(DOSSIER).filter((f) => f.endsWith(".html"));

/** Adresses internes d'une page: liens, images, feuilles de style, scripts et adresses des îles. */
function adresses(html: string): string[] {
  return [...html.matchAll(/(?:href|src|component-url|renderer-url|before-hydration-url)="(\/[^"/][^"]*|\/)"/g)].map((m) => m[1]!);
}

function verifier(): { pages: number; adresses: number } {
  let n = 0;
  for (const page of pages()) {
    for (const adresse of adresses(readFileSync(page, "utf8"))) {
      n++;
      assert.ok(adresse.startsWith(BASE), `${page}: ${adresse} hors de ${BASE}`);
      const chemin = adresse.slice(BASE.length).split(/[?#]/)[0]!;
      const cible = chemin === "" || chemin.endsWith("/") ? join(DOSSIER, chemin, "index.html") : join(DOSSIER, chemin);
      assert.ok(existsSync(cible), `${page}: ${adresse} ne mène à aucun fichier`);
    }
  }
  return { pages: pages().length, adresses: n };
}

test("bâti sous /repsouv/, toute adresse interne commence par ce chemin et mène à un fichier", () => {
  batir(BASE);
  const { pages: nbPages, adresses: nbAdresses } = verifier();
  assert.ok(nbPages > 150);
  assert.ok(nbAdresses > 1000);
});

test("les fichiers que les îles lisent sont demandés sous le chemin du dépôt", () => {
  const explorer = readFileSync(join(DOSSIER, "explorer", "index.html"), "utf8");
  assert.ok(explorer.includes(`${BASE}explorateur.json`));
  assert.ok(existsSync(join(DOSSIER, "explorateur.json")));
  const statistiques = readFileSync(join(DOSSIER, "statistiques", "index.html"), "utf8");
  assert.ok(statistiques.includes(`${BASE}graphiques/statut-code-source-clair.svg`));
  // Chaque île de graphique reçoit le chemin de base, d'où elle construit l'adresse de sa spécification.
  assert.ok(/props="[^"]*base[^"]*\/repsouv\//.test(statistiques));
  assert.ok(existsSync(join(DOSSIER, "graphiques", "statut-code-source-clair.json")));
});

test("la page introuvable est à la racine du site bâti, et ses liens ramènent sous le chemin du dépôt", () => {
  const page = readFileSync(join(DOSSIER, "404.html"), "utf8");
  assert.ok(page.includes("Page introuvable"));
  assert.ok(page.includes(`href="${BASE}"`));
});

test("le chemin sans barre finale, tel que GitHub le donne, produit les mêmes adresses", () => {
  batir("/repsouv");
  verifier();
  // Le site bâti reste en place pour les tests dans un navigateur (test/e2e/base.spec.ts).
  batir(BASE);
});
