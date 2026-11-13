// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Le build échoue avec un message clair plutôt que de publier un site partiel (FR-024), et ne fait aucun appel réseau (FR-025).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * Bâtit le site avec un jeu de fixtures, dans un dossier temporaire pour ne pas toucher à dist/. Le dossier est sous
 * site/ (test-results/, ignoré par Git): Astro y déplace ses fichiers par renommage, impossible vers un autre disque.
 */
function batirAvec(donnees: string): { code: number | null; sortie: string; fiches: boolean } {
  mkdirSync("test-results", { recursive: true });
  const dossier = mkdtempSync(join("test-results", "echec-"));
  try {
    const r = spawnSync("nub", ["exec", "astro", "build", "--outDir", dossier], { encoding: "utf8", env: { ...process.env, DONNEES: donnees } });
    return { code: r.status, sortie: r.stdout + r.stderr, fiches: existsSync(join(dossier, "outils")) };
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

test("des données valides bâtissent un site (témoin)", () => {
  const r = batirAvec("test/fixtures/valide");
  assert.equal(r.code, 0, r.sortie);
  assert.ok(r.fiches);
});

test("un fichier de données invalide arrête le build en nommant le fichier, sans fiche écrite", () => {
  const r = batirAvec("test/fixtures/invalide");
  assert.notEqual(r.code, 0);
  assert.match(r.sortie, /outils\.json/);
  assert.match(r.sortie, /meta/);
  assert.equal(r.fiches, false);
});

test("deux outils de même adresse arrêtent le build en nommant les deux", () => {
  const r = batirAvec("test/fixtures/collision");
  assert.notEqual(r.code, 0);
  assert.match(r.sortie, /Nuage Complet/);
  assert.match(r.sortie, /nuage-complet/);
  assert.equal(r.fiches, false);
});

function fichiersDe(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiersDe(join(dossier, e.name)) : [join(dossier, e.name)]));
}

test("le code du site ne fait aucun appel réseau, sauf la lecture de son propre fichier de données par l'explorateur", () => {
  // Seul src/lib/chargement.ts appelle fetch, vers l'adresse qu'on lui passe: explorateur.json, fichier statique du site.
  const fautifs = fichiersDe("src")
    .filter((f) => f !== join("src", "lib", "chargement.ts"))
    .filter((f) => /\bfetch\s*\(|node:https?|node:net|XMLHttpRequest|WebSocket/.test(readFileSync(f, "utf8")));
  assert.deepEqual(fautifs, []);
  // Hors commentaires (l'en-tête de licence porte une adresse), le chargeur ne nomme aucun hôte.
  const code = readFileSync(join("src", "lib", "chargement.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /https?:\/\//);
});
