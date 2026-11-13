// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Préparation d'un graphique pour le survol, le clavier et la mise en évidence d'une série.
import assert from "node:assert/strict";
import { test } from "node:test";
import { depuisRacine } from "../src/lib/chemins.ts";
import { chargerDonnees } from "../src/lib/donnees.ts";
import { preparer, seriesDe } from "../src/lib/interaction.ts";
import { compilerVega } from "../src/lib/rendu.ts";
import { statistiquesDuSite } from "../src/lib/statistiques.ts";
import { valeursDe } from "../src/lib/tableaux.ts";

const { graphiques } = statistiquesDuSite(chargerDonnees(depuisRacine("donnees")));
const graphique = (id: string) => graphiques.find((g) => g.id === id)!;

test("séries à isoler: seulement quand la couleur regroupe plusieurs marques", () => {
  assert.deepEqual(seriesDe(graphique("categories-statut").spec)?.champ, "statut");
  assert.deepEqual(seriesDe(graphique("criteres-repertoire-enrichie").spec), { champ: "evaluation", noms: ["Répertoire (déduit)", "Évaluation enrichie"] });
  assert.deepEqual(seriesDe(graphique("criteres-verdicts").spec), { champ: "verdict", noms: ["Confirmé", "Infirmé", "Indéterminé"] });
  assert.equal(seriesDe(graphique("licences").spec)?.champ, "famille");
  for (const id of ["statut-code-source", "forges", "tags", "enrichissement-jours", "criteres-par-statut"]) assert.equal(seriesDe(graphique(id).spec), undefined, id);
});

test("preparer garde les valeurs et leur ajoute leur rang, sans modifier l'original", () => {
  for (const g of graphiques) {
    const avant = JSON.stringify(g.spec);
    const pret = preparer(g.spec, "#000000");
    assert.equal(JSON.stringify(g.spec), avant, g.id);
    const valeurs = valeursDe({ ...g, spec: pret });
    assert.deepEqual(valeurs.map(({ _i, ...reste }) => reste), valeursDe(g), g.id);
    assert.deepEqual(valeurs.map((v) => v._i), valeurs.map((_, i) => i), g.id);
  }
});

test("preparer ajoute les paramètres « courant » et « serie », et chaque graphique se compile encore", () => {
  for (const g of graphiques) {
    const pret = preparer(g.spec, "#000000") as unknown as { params: { name: string; value: unknown }[] };
    assert.deepEqual(pret.params.slice(-2), [{ name: "courant", value: -1 }, { name: "serie", value: null }], g.id);
    const vega = compilerVega(pret as never) as { signals?: { name: string }[] };
    const signaux = (vega.signals ?? []).map((s) => s.name);
    assert.ok(signaux.includes("courant") && signaux.includes("serie"), g.id);
  }
});

test("les barres et les cases reçoivent l'infobulle, l'estompage et le contour", () => {
  const texte = JSON.stringify(preparer(graphique("categories-statut").spec, "#123456"));
  assert.ok(texte.includes('"tooltip":{"content":"data"}'));
  assert.ok(texte.includes("datum._i == courant"));
  assert.ok(texte.includes('datum[\\"statut\\"] != serie'));
  assert.ok(texte.includes("#123456"));
});
