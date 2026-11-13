// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Filtres de l'accueil (contracts/filtres.md): état, adresse et règle de sélection, sans navigateur.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ecrireEtat, estVide, type Etat, lireEtat, normaliser, retenu } from "../src/lib/filtres.ts";

const connues = { categories: ["bureautique", "messagerie", "stockage"], tags: ["chiffrement", "sans-publicite", "vpn"], statuts: ["libre", "partiel", "source-disponible", "proprietaire", "non-enrichi"] };
const vide: Etat = { categories: [], tags: [], statuts: [], q: "" };
const outil = { categorie: "bureautique", tags: ["chiffrement"], statut: "libre", nom: normaliser("Élodia Notes") };

test("normaliser: minuscules, sans accents, sans espaces aux extrémités", () => {
  assert.equal(normaliser("ÉLODIA "), "elodia");
  assert.equal(normaliser("  Bouclier canadien"), "bouclier canadien");
});

test("lireEtat lit les paramètres répétés et la recherche", () => {
  assert.deepEqual(lireEtat("?categorie=bureautique&categorie=stockage&tag=vpn&statut=libre&statut=partiel&q=next", connues), {
    categories: ["bureautique", "stockage"],
    tags: ["vpn"],
    statuts: ["libre", "partiel"],
    q: "next",
  });
});

test("lireEtat ignore les valeurs inconnues et les doublons, et garde les autres", () => {
  assert.deepEqual(lireEtat("categorie=inconnue&statut=libre&statut=libre&tag=nope", connues), { ...vide, statuts: ["libre"] });
});

test("lireEtat traite une recherche vide ou faite d'espaces comme absente", () => {
  assert.deepEqual(lireEtat("q=%20%20", connues), vide);
  assert.deepEqual(lireEtat("", connues), vide);
});

test("ecrireEtat n'écrit que les choix actifs, dans l'ordre des données", () => {
  assert.equal(ecrireEtat({ categories: ["stockage", "bureautique"], tags: ["vpn"], statuts: ["partiel", "libre"], q: " Next " }, connues), "categorie=bureautique&categorie=stockage&tag=vpn&statut=libre&statut=partiel&q=Next");
  assert.equal(ecrireEtat(vide, connues), "");
});

test("ecrireEtat conserve les paramètres qui ne sont pas des filtres", () => {
  assert.equal(ecrireEtat({ ...vide, tags: ["vpn"] }, connues, "?utm=x&tag=chiffrement&q=a"), "utm=x&tag=vpn");
});

test("lire ce qu'on a écrit rend le même état", () => {
  const etat: Etat = { categories: ["bureautique", "stockage"], tags: ["chiffrement", "vpn"], statuts: ["non-enrichi"], q: "élo d" };
  assert.deepEqual(lireEtat(ecrireEtat(etat, connues), connues), etat);
});

test("estVide", () => {
  assert.equal(estVide(vide), true);
  assert.equal(estVide({ ...vide, q: "  " }), true);
  assert.equal(estVide({ ...vide, tags: ["vpn"] }), false);
});

test("retenu: sans aucun choix, tout outil est retenu", () => {
  assert.equal(retenu(outil, vide), true);
});

test("retenu: « ou » à l'intérieur d'un type", () => {
  assert.equal(retenu(outil, { ...vide, categories: ["stockage", "bureautique"] }), true);
  assert.equal(retenu(outil, { ...vide, categories: ["stockage"] }), false);
  assert.equal(retenu(outil, { ...vide, tags: ["vpn", "chiffrement"] }), true);
  assert.equal(retenu(outil, { ...vide, statuts: ["partiel", "libre"] }), true);
  assert.equal(retenu(outil, { ...vide, statuts: ["proprietaire"] }), false);
});

test("retenu: « et » entre les types et avec la recherche", () => {
  assert.equal(retenu(outil, { categories: ["bureautique"], tags: ["chiffrement"], statuts: ["libre"], q: "elod" }), true);
  assert.equal(retenu(outil, { categories: ["bureautique"], tags: ["vpn"], statuts: ["libre"], q: "" }), false);
  assert.equal(retenu(outil, { categories: ["bureautique"], tags: [], statuts: ["libre"], q: "autre" }), false);
});

test("retenu: la recherche ignore la casse et les accents, et cherche une partie du nom", () => {
  assert.equal(retenu(outil, { ...vide, q: "ÉLOD" }), true);
  assert.equal(retenu(outil, { ...vide, q: "notes" }), true);
  assert.equal(retenu(outil, { ...vide, q: "xyz" }), false);
});

test("retenu: un tag choisi exclut un outil non enrichi; « non-enrichi » le retient", () => {
  const nonEnrichi = { categorie: "bureautique", tags: [], statut: "non-enrichi", nom: "mystere" };
  assert.equal(retenu(nonEnrichi, { ...vide, tags: ["vpn"] }), false);
  assert.equal(retenu(nonEnrichi, { ...vide, statuts: ["non-enrichi"] }), true);
  assert.equal(retenu(nonEnrichi, { ...vide, statuts: ["libre"] }), false);
});
