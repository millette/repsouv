// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// État de l'explorateur et adresse de la page (specs/002-explorateur-outils/contracts/adresse.md).
import assert from "node:assert/strict";
import { test } from "node:test";
import { ecrireEtat, etatParDefaut, filtresActifs, lireEtat } from "../src/lib/etat.ts";
import { connues, etat } from "./explorateur-fixtures.ts";

test("l'état par défaut: aucun filtre, tri par catégorie croissant, vue en cartes, rien à comparer", () => {
  assert.deepEqual(etatParDefaut(), { categories: [], tags: [], statuts: [], pays: [], sources: [], q: "", scoreMin: 0, verdicts: {}, enrichi: "", tri: "categorie", sens: "asc", vue: "cartes", comparer: [] });
});

test("les valeurs connues viennent du fichier de données", () => {
  assert.deepEqual(connues.categories, ["bureautique", "automatisation"]);
  assert.deepEqual(connues.pays, ["DE", "EU"]);
  assert.deepEqual(connues.criteres, ["donnees", "controle", "dependance"]);
  assert.deepEqual(connues.statuts, ["libre", "partiel", "source-disponible", "proprietaire", "non-enrichi"]);
  assert.ok(connues.outils.includes("nuage-complet"));
});

test("lireEtat lit chaque paramètre", () => {
  const lu = lireEtat("categorie=automatisation&tag=chiffrement&statut=libre&statut=partiel&pays=DE&source=facil&q=nuage&score=2&donnees=confirme&dependance=indetermine&enrichi=oui&tri=score&sens=desc&vue=tableau&comparer=automate&comparer=nuage-complet", connues);
  assert.deepEqual(lu, {
    categories: ["automatisation"], tags: ["chiffrement"], statuts: ["libre", "partiel"], pays: ["DE"], sources: ["facil"], q: "nuage", scoreMin: 2,
    verdicts: { donnees: "confirme", dependance: "indetermine" }, enrichi: "oui", tri: "score", sens: "desc", vue: "tableau", comparer: ["automate", "nuage-complet"],
  });
});

test("lireEtat ignore les valeurs inconnues et applique les défauts", () => {
  assert.deepEqual(lireEtat("categorie=inconnue&tri=bidon&sens=x&vue=y&enrichi=peut-etre&comparer=absent&score=9&donnees=oui&pays=ZZ&q=%20", connues), etatParDefaut());
  assert.equal(lireEtat("score=0", connues).scoreMin, 0);
  assert.equal(lireEtat("score=abc", connues).scoreMin, 0);
});

test("comparer: doublons ignorés, quatre outils au plus, dans l'ordre de l'adresse", () => {
  assert.deepEqual(lireEtat("comparer=mystere&comparer=automate&comparer=mystere&comparer=nuage-facile&comparer=elodia-notes&comparer=nuage-complet", connues).comparer, ["mystere", "automate", "nuage-facile", "elodia-notes"]);
});

test("ecrireEtat n'écrit que ce qui diffère du défaut, dans l'ordre fixe du contrat", () => {
  assert.equal(ecrireEtat(etat(), connues), "");
  const e = etat({ comparer: ["mystere", "automate"], vue: "tableau", sens: "desc", tri: "score", enrichi: "non", verdicts: { dependance: "infirme", donnees: "confirme" }, scoreMin: 1, q: " Nuage ", sources: ["facil", "praxis"], pays: ["EU", "DE"], statuts: ["partiel", "libre"], tags: ["auto-hebergement", "chiffrement"], categories: ["automatisation", "bureautique"] });
  assert.equal(ecrireEtat(e, connues), "categorie=bureautique&categorie=automatisation&tag=chiffrement&tag=auto-hebergement&statut=libre&statut=partiel&pays=DE&pays=EU&source=praxis&source=facil&q=Nuage&score=1&donnees=confirme&dependance=infirme&enrichi=non&tri=score&sens=desc&vue=tableau&comparer=mystere&comparer=automate");
});

test("ecrireEtat conserve les paramètres qui ne sont pas les siens", () => {
  assert.equal(ecrireEtat(etat({ tri: "nom" }), connues, "?utm=x&tag=chiffrement&vue=tableau"), "utm=x&tri=nom");
});

test("lire ce qu'on a écrit rend le même état", () => {
  const e = etat({ categories: ["bureautique"], pays: ["DE", "EU"], q: "élo d", scoreMin: 3, verdicts: { controle: "infirme" }, enrichi: "oui", tri: "nom", sens: "desc", vue: "tableau", comparer: ["automate", "mystere", "nuage-complet"] });
  assert.deepEqual(lireEtat(ecrireEtat(e, connues), connues), e);
});

test("filtresActifs: le tri, la vue et la comparaison ne sont pas des filtres", () => {
  assert.equal(filtresActifs(etat()), false);
  assert.equal(filtresActifs(etat({ tri: "nom", sens: "desc", vue: "tableau", comparer: ["automate"] })), false);
  assert.equal(filtresActifs(etat({ q: "  " })), false);
  for (const choix of [{ q: "a" }, { scoreMin: 1 }, { verdicts: { donnees: "confirme" as const } }, { enrichi: "non" as const }, { pays: ["DE"] }, { sources: ["facil"] }, { tags: ["chiffrement"] }]) assert.equal(filtresActifs(etat(choix)), true, JSON.stringify(choix));
});
