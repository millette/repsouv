// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Le fichier de données de l'explorateur dans le site bâti: tous les outils actifs, rien de trop, léger.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { identifiant } from "../../src/lib/adresses.ts";
import type { DonneesExplorateur } from "../../src/lib/explorateur.ts";
import { batirAuBesoin, DIST, donneesReelles } from "./outils.ts";

batirAuBesoin();
const fichier = join(DIST, "explorateur.json");
const brut = readFileSync(fichier, "utf8");
const e = JSON.parse(brut) as DonneesExplorateur;
const actifs = donneesReelles().outils.filter((o) => !o.removed);

test("explorateur.json contient exactement les outils actifs, dans l'ordre des données", () => {
  assert.deepEqual(e.outils.map((o) => o.id), actifs.map((o) => identifiant(o.nom)));
});

test("chaque renvoi d'un outil existe dans les référentiels du fichier", () => {
  const categories = new Set(e.categories.map((c) => c.id));
  const tags = new Set(e.tags);
  const sources = new Set(e.sources.map((s) => s.id));
  const pays = new Set(e.pays.map((p) => p.code));
  const criteres = new Set(e.criteres.map((c) => c.id));
  for (const o of e.outils) {
    assert.ok(categories.has(o.categorie), o.nom);
    assert.ok(sources.has(o.source), o.nom);
    for (const t of o.tags) assert.ok(tags.has(t), `${o.nom}: ${t}`);
    if (o.pays) assert.ok(pays.has(o.pays), o.nom);
    for (const c of [...Object.keys(o.verdicts ?? {}), ...o.deduits]) assert.ok(criteres.has(c), `${o.nom}: ${c}`);
  }
});

test("le fichier ne contient ni description longue, ni citation, ni valeur null, et déclare la licence des données", () => {
  assert.ok(!brut.includes("description_longue"));
  assert.ok(!/:null[,}\]]/.test(brut));
  // Les citations des critères vérifiés restent sur les fiches: le fichier n'a pas leurs champs.
  for (const cle of ["preuves", "infirmes", "evaluation_enrichie", "openhub"]) assert.ok(!brut.includes(`"${cle}"`), cle);
  assert.equal(e.meta.data_license, "CC-BY-SA-4.0");
});

test("le fichier pèse moins de 150 ko (les descriptions courtes de 154 outils en font l'essentiel)", () => {
  assert.ok(statSync(fichier).size < 150_000, `${statSync(fichier).size} octets`);
});
