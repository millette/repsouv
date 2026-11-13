// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Chargement des cinq fichiers de données: lus tels quels, refusés avec un message qui nomme le fichier fautif.
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { chargerDonnees } from "../src/lib/donnees.ts";

const VALIDE = "test/fixtures/valide";

/** Copie des fixtures valides dans un dossier temporaire, modifiée par `changer`, puis chargée. */
function avec(changer: (dossier: string) => void): () => unknown {
  return () => {
    const dossier = mkdtempSync(join(tmpdir(), "site-donnees-"));
    try {
      cpSync(VALIDE, dossier, { recursive: true });
      changer(dossier);
      return chargerDonnees(dossier);
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  };
}

function modifier(dossier: string, fichier: string, f: (contenu: any) => void): void {
  const chemin = join(dossier, fichier);
  const contenu = JSON.parse(readFileSync(chemin, "utf8"));
  f(contenu);
  writeFileSync(chemin, JSON.stringify(contenu));
}

test("chargerDonnees rend les cinq tableaux et les métadonnées de outils.json", () => {
  const d = chargerDonnees(VALIDE);
  assert.equal(d.outils.length, 6);
  assert.equal(d.categories.length, 3);
  assert.equal(d.criteres.length, 3);
  assert.equal(d.tags.length, 2);
  assert.equal(d.sources.length, 3);
  assert.equal(d.meta.updated_at, "2026-11-13T10:28:10-05:00");
});

test("un fichier absent est refusé en le nommant", () => {
  assert.throws(avec((d) => rmSync(join(d, "tags.json"))), /tags\.json/);
});

test("un JSON invalide est refusé en nommant le fichier", () => {
  assert.throws(avec((d) => writeFileSync(join(d, "criteres.json"), "{ pas du json")), /criteres\.json/);
});

test("un fichier sans meta est refusé en nommant le fichier et le champ", () => {
  assert.throws(() => chargerDonnees("test/fixtures/invalide"), /outils\.json.*meta/s);
});

test("un fichier sans son tableau est refusé en nommant le fichier et le tableau", () => {
  assert.throws(avec((d) => modifier(d, "sources.json", (c) => delete c.sources)), /sources\.json.*sources/s);
});

test("un tableau vide est refusé", () => {
  assert.throws(avec((d) => modifier(d, "outils.json", (c) => (c.outils = []))), /outils\.json/);
});

for (const champ of ["nom", "categorie", "score", "lien", "description", "source_repertoire_id"]) {
  test(`un outil sans « ${champ} » est refusé en nommant le champ`, () => {
    assert.throws(avec((d) => modifier(d, "outils.json", (c) => delete c.outils[1][champ])), new RegExp(`outils\\.json.*${champ}`, "s"));
  });
}

test("une catégorie inconnue est refusée en nommant l'outil et l'identifiant", () => {
  assert.throws(avec((d) => modifier(d, "outils.json", (c) => (c.outils[0].categorie = "nulle-part"))), /Nuage Complet.*nulle-part/s);
});

test("une source inconnue est refusée en nommant l'outil et l'identifiant", () => {
  assert.throws(avec((d) => modifier(d, "outils.json", (c) => (c.outils[0].source_repertoire_id = "ailleurs"))), /Nuage Complet.*ailleurs/s);
});

test("un tag inconnu est refusé en nommant l'outil et l'identifiant", () => {
  assert.throws(avec((d) => modifier(d, "outils.json", (c) => c.outils[0].tags.push("inexistant"))), /Nuage Complet.*inexistant/s);
});
