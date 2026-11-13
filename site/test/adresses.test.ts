// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Adresse des fiches: identifiant lisible et stable tiré du nom, unique parmi les outils actifs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { slug } from "../../categories.ts";
import { adresseAccueil, adresseFiche, identifiant, verifierUnicite } from "../src/lib/adresses.ts";

test("identifiant: minuscules, sans accents, tirets, sans caractère à encoder", () => {
  assert.equal(identifiant("CIRA Canadian Shield / Bouclier canadien"), "cira-canadian-shield-bouclier-canadien");
  assert.equal(identifiant("Élodia"), "elodia");
  assert.equal(identifiant("La Suite (Infomaniak)"), "la-suite-infomaniak");
});

test("identifiant: un nom sans lettre ni chiffre est refusé", () => {
  assert.throws(() => identifiant("—"), /identifiant/);
});

test("identifiant suit la règle de slug() du dépôt sur tous les noms réels", () => {
  const noms: string[] = JSON.parse(readFileSync("../outils.json", "utf8")).outils.map((o: { nom: string }) => o.nom);
  for (const nom of noms) assert.equal(identifiant(nom), slug(nom), nom);
});

test("verifierUnicite accepte des noms distincts et nomme les deux outils en collision", () => {
  verifierUnicite([{ nom: "Nuage Complet" }, { nom: "Élodia" }]);
  assert.throws(() => verifierUnicite([{ nom: "Nuage Complet" }, { nom: "nuage-complet" }]), /Nuage Complet.*nuage-complet.*nuage-complet/s);
});

test("adresseFiche et adresseAccueil appliquent le chemin de base", () => {
  assert.equal(adresseFiche("elodia", "/"), "/outils/elodia/");
  assert.equal(adresseFiche("elodia", "/repertoire"), "/repertoire/outils/elodia/");
  assert.equal(adresseFiche("elodia", "/repertoire/"), "/repertoire/outils/elodia/");
  assert.equal(adresseAccueil("/"), "/");
  assert.equal(adresseAccueil("/repertoire"), "/repertoire/");
  assert.equal(adresseAccueil("/repertoire/", "tag=chiffrement"), "/repertoire/?tag=chiffrement");
});
