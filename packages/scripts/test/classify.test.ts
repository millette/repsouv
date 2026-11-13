// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Règles de classification sur des descriptions connues (copiées du répertoire, figées ici) et ligne de commande
// de classify.ts sur un fichier fictif. La cohérence des 60 outils réels est dans test/donnees/outils.test.ts.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { CONTROLE, DEPENDANCE, DONNEES, classer } from "../classify.ts";
import { ecrireFichier } from "../fichiers.ts";
import { META, OUTILS } from "./donnees-fictives.ts";

/** Descriptions telles qu'affichées par le répertoire, avec leur nombre d'étoiles. */
const DESCRIPTIONS: Record<string, { score: number; description: string }> = {
  Obsidian: { score: 3, description: "Outil canadien de prise de notes et d’organisation des connaissances permettant de relier documents, idées et ressources dans une base personnelle ou partagée. Les notes sont conservées sous forme de fichiers Markdown directement sur l’appareil." },
  Nextcloud: { score: 2, description: "Suite collaborative non canadienne permettant de stocker et partager des fichiers, gérer calendriers, contacts et tâches, communiquer en équipe et collaborer sur des documents grâce à des suites bureautiques intégrées. Peut être auto-hébergée sur l’infrastructure choisie." },
  "La Réserve": { score: 2, description: "Service canadien de sauvegarde automatisée des données de Google Workspace et Microsoft 365, permettant de conserver des copies chiffrées au Canada et de récupérer des documents perdus ou supprimés. Il renforce la maîtrise des sauvegardes sans supprimer la dépendance aux plateformes d'origine." },
  Framapad: { score: 2, description: "Éditeur de texte collaboratif en ligne permettant à plusieurs personnes de rédiger simultanément un document, avec identification des contributions par couleur, historique des modifications et export des contenus. Bien que français, il s'agit d'un logiciel libre qui peut être installé sur un serveur canadien." },
  Firefox: { score: 2, description: "Navigateur Internet non canadien axé sur la protection de la vie privée permettant de consulter des sites, gérer onglets, favoris et mots de passe, traduire des pages et limiter le pistage. Les données de navigation peuvent rester entièrement sur l’appareil." },
};
const criteres = (nom: string) => {
  const o = DESCRIPTIONS[nom]!;
  return classer(o.description, o.score).criteres;
};

test("trois étoiles donnent les trois critères", () => {
  assert.deepEqual(criteres("Obsidian"), [DONNEES, CONTROLE, DEPENDANCE]);
});
test("outil non canadien auto-hébergeable: données + dépendance", () => {
  assert.deepEqual(criteres("Nextcloud"), [DONNEES, DEPENDANCE]);
});
test("outil canadien avec sauvegardes au Canada mais dépendant", () => {
  assert.deepEqual(criteres("La Réserve"), [DONNEES, CONTROLE]);
});
test("un serveur canadien n'est pas un contrôle canadien", () => {
  assert.deepEqual(criteres("Framapad"), [DONNEES, DEPENDANCE]);
});
test("sans score, on retient les indices forts", () => {
  assert.deepEqual(classer(DESCRIPTIONS.Firefox!.description).criteres, [DONNEES, DEPENDANCE]);
});
test("le nombre de critères égale le score", () => {
  for (const [nom, o] of Object.entries(DESCRIPTIONS)) assert.equal(criteres(nom).length, o.score, nom);
});

const classifyTs = resolve("classify.ts");
/** Un outils.json fictif, déjà classé par les règles courantes (le relancer ne change donc rien). */
const fichierFictif = () => {
  const f = join(mkdtempSync(join(tmpdir(), "classify-")), "outils.json");
  ecrireFichier(f, "outils", OUTILS.map((o) => ({ ...o, ...classer(o.description, o.score) })), { donnees: [], meta: META }, META.updated_at);
  return f;
};
test("CLI: --force est refusée comme toute option inconnue (il n'y a plus de build qui la transmettrait)", () => {
  const f = fichierFictif();
  const r = spawnSync("nub", [classifyTs, f, "--force"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Option inconnue: --force/);
});
test("CLI: une autre option est refusée et le fichier reste intact", () => {
  const f = fichierFictif();
  const avant = readFileSync(f, "utf8");
  const r = spawnSync("nub", [classifyTs, f, "--bogus"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.equal(readFileSync(f, "utf8"), avant);
});
test("CLI: un fichier inchangé garde ses métadonnées (dates comprises), la licence reste CC-BY-SA-4.0", () => {
  const f = fichierFictif();
  const avant = JSON.parse(readFileSync(f, "utf8"));
  const r = spawnSync("nub", [classifyTs, f], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const apres = JSON.parse(readFileSync(f, "utf8"));
  assert.deepEqual(apres.meta, avant.meta);
  assert.equal(apres.meta.data_license, "CC-BY-SA-4.0");
});
test("CLI: un fichier au mauvais format (simple tableau) est refusé avec un message clair et reste intact", () => {
  const f = fichierFictif();
  writeFileSync(f, JSON.stringify([{ nom: "a" }]));
  const r = spawnSync("nub", [classifyTs, f], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^Erreur: .*format invalide/);
  assert.equal(readFileSync(f, "utf8"), JSON.stringify([{ nom: "a" }]));
});
test("CLI: « Erreur: » est en rouge dans un terminal forcé (FORCE_COLOR), et reste sans code avec NO_COLOR ou hors terminal", () => {
  const f = fichierFictif();
  const lancer = (env: Record<string, string>) =>
    spawnSync("nub", [classifyTs, f, "--bogus"], { encoding: "utf8", env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...env } });
  assert.match(lancer({ FORCE_COLOR: "1" }).stderr, /^\x1b\[1m\x1b\[31mErreur:\x1b\[39m\x1b\[22m Option inconnue/);
  assert.match(lancer({ FORCE_COLOR: "1", NO_COLOR: "1" }).stderr, /^Erreur: Option inconnue/);
  assert.match(lancer({}).stderr, /^Erreur: Option inconnue/);
  const sans = spawnSync("nub", [classifyTs, f, "--sans-couleur"], { encoding: "utf8", env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", FORCE_COLOR: "1" } });
  assert.match(sans.stderr, /^Erreur: Option inconnue: --sans-couleur/); // --sans-couleur désactive aussi la couleur de « Erreur: »
});
