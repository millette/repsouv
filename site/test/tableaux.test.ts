// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Tableaux des graphiques, leur provenance, leur base et leurs liens (specs/003-page-statistiques/data-model.md).
import assert from "node:assert/strict";
import { test } from "node:test";
import { chargerDonnees } from "../src/lib/donnees.ts";
import { connuesDe, lireEtat } from "../src/lib/etat.ts";
import { donneesExplorateur } from "../src/lib/explorateur.ts";
import { retenu } from "../src/lib/selection.ts";
import { statistiquesDuSite } from "../src/lib/statistiques.ts";
import { baseDe, provenanceDe, tableauDe, valeursDe } from "../src/lib/tableaux.ts";

// Les vraies données: les neuf graphiques n'existent tous qu'avec elles.
const donnees = chargerDonnees("..");
const { stats, graphiques } = await statistiquesDuSite(donnees);
const explorateur = donneesExplorateur(donnees);
const contexte = { base: "/", categories: explorateur.categories, tags: explorateur.tags };
const tableau = (id: string) => tableauDe(graphiques.find((g) => g.id === id)!, contexte);

const COLONNES: Record<string, string[]> = {
  "statut-code-source": ["Statut du code source", "Outils", "Outils et part"],
  "categories-statut": ["Catégorie", "Statut du code source", "Outils"],
  "criteres-repertoire-enrichie": ["Critère", "Évaluation", "Part et nombre d'outils"],
  "criteres-par-statut": ["Évaluation", "Statut du code source", "Critère", "Outils", "Part"],
  "criteres-verdicts": ["Statut du code source", "Critère", "Verdict", "Outils", "Outils vérifiés du statut", "Part"],
  licences: ["Licence", "Famille", "Outils"],
  forges: ["Forge", "Outils"],
  tags: ["Tag", "Outils"],
  "enrichissement-jours": ["Jour", "Outils enrichis"],
};

const PREMIER_CHAMP: Record<string, string> = { "statut-code-source": "statut", "categories-statut": "categorie", "criteres-repertoire-enrichie": "critere", "criteres-par-statut": "evaluation", "criteres-verdicts": "statut", licences: "licence", forges: "forge", tags: "tag" };

test("les neuf graphiques du sommaire existent avec les vraies données", () => {
  assert.deepEqual(graphiques.map((g) => g.id).sort(), Object.keys(COLONNES).sort());
});

test("chaque tableau a les colonnes du modèle et une ligne par valeur du graphique, dans le même ordre", () => {
  for (const g of graphiques) {
    const t = tableauDe(g, contexte);
    assert.equal(t.legende, g.titre);
    assert.deepEqual(t.colonnes, COLONNES[g.id], g.id);
    assert.equal(t.lignes.length, valeursDe(g).length, g.id);
    for (const ligne of t.lignes) for (const c of ligne) assert.ok(c.texte.length > 0, g.id);
    if (g.id !== "enrichissement-jours") assert.deepEqual(t.lignes.map((l) => l[0]!.texte), valeursDe(g).map((v) => String(v[PREMIER_CHAMP[g.id]!])), g.id);
  }
});

test("les nombres sont écrits à la française et les jours en clair", () => {
  for (const g of graphiques) for (const ligne of tableauDe(g, contexte).lignes) for (const c of ligne) assert.doesNotMatch(c.texte, /^[\d ]+\.\d+( %)?$/, `${g.id}: ${c.texte}`);
  assert.match(tableau("criteres-verdicts").lignes[0]![5]!.texte, /^\d+(,\d)? %$/);
  assert.match(tableau("enrichissement-jours").lignes[0]![0]!.texte, /^\d+(er)? \p{L}+ \d{4}$/u);
});

test("un graphique inconnu garde un tableau générique", () => {
  const t = tableauDe({ id: "nouveau", titre: "Nouveau", description: "", spec: { data: { values: [{ a: "x", n: 2 }] } } as never }, contexte);
  assert.deepEqual(t.colonnes, ["a", "n"]);
  assert.deepEqual(t.lignes, [[{ texte: "x" }, { texte: "2" }]]);
});

test("seuls les tableaux par statut, par catégorie et statut, et par tag ont des liens, sur leur première colonne", () => {
  for (const g of graphiques) {
    const liens = tableauDe(g, contexte).lignes.flatMap((l) => l.map((c, i) => (c.lien ? i : -1)).filter((i) => i >= 0));
    if (["statut-code-source", "categories-statut", "tags"].includes(g.id)) assert.ok(liens.length > 0 && liens.every((i) => i === 0), g.id);
    else assert.deepEqual(liens, [], g.id);
  }
  assert.equal(tableau("statut-code-source").lignes.find((l) => l[0]!.texte === "Pas encore enrichi")![0]!.lien, "/explorer/?statut=non-enrichi");
  assert.match(tableau("categories-statut").lignes[0]![0]!.lien!, /^\/explorer\/\?categorie=[a-z0-9-]+&statut=[a-z-]+$/);
  assert.match(tableau("tags").lignes[0]![0]!.lien!, /^\/explorer\/\?tag=[a-z0-9-]+$/);
});

test("chaque lien retient dans l'explorateur autant d'outils que le chiffre de sa ligne", () => {
  const connues = connuesDe(explorateur);
  for (const id of ["statut-code-source", "categories-statut", "tags"]) {
    const g = graphiques.find((x) => x.id === id)!;
    const valeurs = valeursDe(g);
    tableauDe(g, contexte).lignes.forEach((ligne, i) => {
      const lien = ligne[0]!.lien;
      assert.ok(lien, `${id}: ligne ${i} sans lien`);
      const etat = lireEtat(lien.split("?")[1]!, connues);
      assert.equal(explorateur.outils.filter((o) => retenu(o, etat)).length, valeurs[i]!.n, `${id}: ${ligne[0]!.texte}`);
    });
  }
});

test("une valeur sans identifiant connu reste du texte", () => {
  const g = { id: "tags", titre: "Tags", description: "", spec: { data: { values: [{ tag: "inconnu", n: 1 }] } } as never };
  assert.equal(tableauDe(g, contexte).lignes[0]![0]!.lien, undefined);
});

test("provenance: les libellés et ce que le graphique compte", () => {
  const IA = "Produit par IA, à vérifier";
  for (const id of ["statut-code-source", "categories-statut", "licences", "forges", "tags", "criteres-verdicts"]) assert.deepEqual(provenanceDe(id).libelles, [IA], id);
  for (const id of ["criteres-repertoire-enrichie", "criteres-par-statut"]) {
    assert.deepEqual(provenanceDe(id).libelles, ["Déduit par ce dépôt", IA], id);
    assert.match(provenanceDe(id).note, /déduits des étoiles/);
    assert.match(provenanceDe(id).note, /évaluation par IA/);
  }
  assert.match(provenanceDe("criteres-verdicts").note, /vérifiés par un modèle d'IA.*citation/);
  assert.deepEqual(provenanceDe("enrichissement-jours").libelles, []);
  for (const g of graphiques) assert.ok(provenanceDe(g.id).note.length > 0, g.id);
});

test("base: sur combien d'outils portent les chiffres", () => {
  assert.equal(baseDe("statut-code-source", stats), `Sur ${stats.total} outils.`);
  assert.ok(baseDe("criteres-verdicts", stats).includes(`${stats.criteres.confirmes.outils} outils vérifiés`));
  assert.ok(baseDe("criteres-repertoire-enrichie", stats).includes(`${stats.enrichissement.enrichis} outils enrichis`));
  for (const g of graphiques) assert.match(baseDe(g.id, stats), /\d+ outils/, g.id);
});
