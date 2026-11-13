// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Forme du flux de publication sur GitHub Pages (specs/004-deploiement-github-pages/contracts/publication.md). Le flux
// ne s'exécute que sur GitHub: ici, on vérifie ce qu'il déclare, lu comme du texte.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { depuisRacine } from "../src/lib/chemins.ts";

const flux = readFileSync(depuisRacine(".github", "workflows", "pages.yml"), "utf8");
// Sans les commentaires, pour ne pas confondre une explication avec une commande.
const code = flux.replace(/^\s*#.*$/gm, "");
const position = (texte: string) => {
  const i = code.indexOf(texte);
  assert.ok(i >= 0, `absent du flux: ${texte}`);
  return i;
};

// Les étiquettes de licence sont écrites en deux morceaux: écrites d'un trait, l'outil REUSE les lirait comme
// les déclarations de licence de ce fichier de test.
test("le fichier porte ses en-têtes de licence", () => {
  assert.ok(flux.includes("SPDX-" + "License-Identifier: AGPL-3.0-or-later"));
  assert.ok(flux.includes("SPDX-" + "FileCopyrightText: "));
});

test("déclencheurs: un push sur main, ou à la main; rien d'autre", () => {
  assert.match(code, /on:\s*\n\s+push:\s*\n\s+branches:\s*\[\s*main\s*\]\s*\n\s+workflow_dispatch:/);
  assert.doesNotMatch(code, /pull_request|schedule:/);
});

test("droits minimaux, sans écriture dans le dépôt, et aucun secret", () => {
  assert.match(code, /permissions:\s*\n\s+contents: read\s*\n\s+pages: write\s*\n\s+id-token: write/);
  assert.doesNotMatch(code, /contents: write/);
  assert.doesNotMatch(code, /secrets\./);
});

test("une publication en cours n'est pas annulée par la suivante", () => {
  assert.match(code, /concurrency:\s*\n\s+group: pages\s*\n\s+cancel-in-progress: false/);
});

test("tous les contrôles précèdent le build de publication, lui-même avant le dépôt du site", () => {
  const controles = ["nub run test\n", "nub run typecheck", "nub run licences", "nub run check", "nub run test:e2e"].map(position);
  const build = position("nub run build");
  const depot = position("actions/upload-pages-artifact");
  for (const c of controles) assert.ok(c < build, "un contrôle vient après le build de publication");
  assert.ok(build < depot);
  // Les tests du site (unitaires et site bâti) sont lancés dans packages/site/, en plus de ceux de la racine.
  assert.ok((code.match(/nub run test\n/g) ?? []).length >= 2);
});

test("une seule installation, à la racine des espaces de travail; les commandes du site se lancent dans packages/site", () => {
  assert.equal((code.match(/nub install/g) ?? []).length, 1);
  assert.ok(position("nub install") < position("nub run test\n"));
  const dossiers = [...code.matchAll(/working-directory: (\S+)/g)].map((m) => m[1]);
  assert.ok(dossiers.length >= 4);
  for (const d of dossiers) assert.equal(d, "packages/site");
});

test("le build de publication reçoit l'adresse et le chemin que GitHub Pages donne", () => {
  assert.match(code, /id: pages\s*\n\s+uses: actions\/configure-pages@/);
  assert.match(code, /SITE_URL: \$\{\{ steps\.pages\.outputs\.origin \}\}/);
  assert.match(code, /SITE_BASE: \$\{\{ steps\.pages\.outputs\.base_path \}\}/);
  assert.match(code, /path: packages\/site\/dist/);
});

test("la mise en ligne dépend de la construction et se fait dans l'environnement github-pages", () => {
  assert.match(code, /publier:[\s\S]*needs: construire[\s\S]*name: github-pages[\s\S]*actions\/deploy-pages@/);
});

test("chaque action est épinglée à une version", () => {
  const actions = [...code.matchAll(/uses: (\S+)/g)].map((m) => m[1]!);
  assert.ok(actions.length >= 6);
  for (const a of actions) assert.match(a, /@v\d+/, a);
});

test("la publication ne lance aucun script payant et n'écrit pas dans le dépôt", () => {
  assert.doesNotMatch(code, /update\.ts|sommaire\.ts|extract|ajouter\.ts|git push|git commit|OPENAI|OPENHUB/);
});
