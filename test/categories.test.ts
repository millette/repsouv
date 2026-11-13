// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// categories.ts: identifiants des catégories (slug), liste tirée de la page, descriptions générées par IA (sans réseau).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aDecrire, categoriesAvec, categoriesDepuis, decrireCategories, estimerCoutDescriptions, nomCategorie, requeteCategorie, slug, validerDescriptionCategorie, type Categorie,
} from "../categories.ts";

test("slug: minuscules, sans accents ni ponctuation, mots séparés par un tiret", () => {
  assert.equal(slug("Analyse et mesure"), "analyse-et-mesure");
  assert.equal(slug("Gestion d’événements et billetterie"), "gestion-d-evenements-et-billetterie");
  assert.equal(slug("Communautés, réseaux et partage des connaissances"), "communautes-reseaux-et-partage-des-connaissances");
  assert.equal(slug("  Sécurité & accès (2026)  "), "securite-acces-2026");
  assert.throws(() => slug("!!!"), /vide/);
});

test("categoriesDepuis: une catégorie par nom, dans l'ordre d'apparition, avec son id; les descriptions existantes sont conservées", () => {
  const existantes: Categorie[] = [{ id: "b", nom: "B", icone: "2", description: "Déjà décrite." }, { id: "z", nom: "Z", icone: "9", description: "Disparue." }];
  const r = categoriesDepuis([{ nom: "A", icone: "1" }, { nom: "B", icone: "2" }, { nom: "A", icone: "1" }], existantes);
  assert.deepEqual(r, [{ id: "a", nom: "A", icone: "1" }, { id: "b", nom: "B", icone: "2", description: "Déjà décrite." }]);
  assert.throws(() => categoriesDepuis([{ nom: "A B", icone: "1" }, { nom: "A-B", icone: "2" }], []), /même identifiant/);
});

test("categoriesDepuis: les catégories déclarées par un extracteur (source_repertoire_id) sont conservées après celles de la page, dans leur ordre; un identifiant pris par la page est une erreur", () => {
  const declaree: Categorie = { id: "paiement", nom: "Paiement", icone: "💳", source_repertoire_id: "charles", description: "Décrite." };
  const autre: Categorie = { id: "ia", nom: "IA", icone: "🤖", source_repertoire_id: "charles" };
  const existantes: Categorie[] = [autre, { id: "a", nom: "A", icone: "1" }, declaree];
  const r = categoriesDepuis([{ nom: "A", icone: "1" }], existantes);
  assert.deepEqual(r, [{ id: "a", nom: "A", icone: "1" }, autre, declaree]);
  assert.throws(() => categoriesDepuis([{ nom: "Paiement", icone: "1" }], existantes), /« paiement » de la source charles/);
});

test("categoriesAvec: ajoute à la fin, met à jour sans perdre la description, exige source_repertoire_id et un slug", () => {
  const existantes: Categorie[] = [{ id: "a", nom: "A", icone: "1" }, { id: "b", nom: "B", icone: "2", description: "Décrite.", source_repertoire_id: "charles" }];
  const r = categoriesAvec(existantes, [{ id: "c", nom: "C", icone: "3", source_repertoire_id: "charles" }, { id: "b", nom: "B2", icone: "22", source_repertoire_id: "charles" }]);
  assert.deepEqual(r, [{ id: "a", nom: "A", icone: "1" }, { id: "b", nom: "B2", icone: "22", source_repertoire_id: "charles", description: "Décrite." }, { id: "c", nom: "C", icone: "3", source_repertoire_id: "charles" }]);
  assert.deepEqual(existantes.length, 2, "la liste d'origine n'est pas modifiée");
  assert.throws(() => categoriesAvec([], [{ id: "c", nom: "C", icone: "3" }]), /sans source_repertoire_id/);
  assert.throws(() => categoriesAvec([], [{ id: "C x", nom: "C", icone: "3", source_repertoire_id: "charles" }]), /minuscules/);
});

test("nomCategorie et aDecrire", () => {
  const cats: Categorie[] = [{ id: "a", nom: "Analyse", icone: "📊" }];
  assert.equal(nomCategorie(cats, "a"), "Analyse");
  assert.equal(nomCategorie(cats, "inconnue"), "inconnue");
  assert.equal(aDecrire(cats[0]!), true);
  assert.equal(aDecrire({ ...cats[0]!, description: "x" }), false);
});

test("validerDescriptionCategorie: une à trois phrases en texte continu, sans Markdown interdit", () => {
  assert.equal(validerDescriptionCategorie({ description: "  Outils qui mesurent la fréquentation d'un site. Ils servent aux équipes web.  " }), "Outils qui mesurent la fréquentation d'un site. Ils servent aux équipes web.");
  assert.throws(() => validerDescriptionCategorie({ description: "Court." }), /courte/);
  assert.throws(() => validerDescriptionCategorie({ description: "x".repeat(500) }), /longue/);
  assert.throws(() => validerDescriptionCategorie({ description: "Une phrase avec <b>HTML</b> dedans qui est assez longue pour passer." }), /HTML/);
  assert.throws(() => validerDescriptionCategorie({ description: "Une phrase avec un tiret — cadratin dedans qui est assez longue pour passer." }), /cadratin/);
  assert.throws(() => validerDescriptionCategorie({}), /description/);
});

test("requeteCategorie: le modèle reçoit le nom, l'icône et les outils de la catégorie (nom et description), et le rappel", () => {
  const r = requeteCategorie({ id: "a", nom: "Analyse", icone: "📊" }, [{ nom: "Matomo", description: "Mesure la fréquentation." }], "trop courte");
  assert.match(r.messages[0]!, /Analyse/);
  assert.match(r.messages[0]!, /Matomo/);
  assert.match(r.messages[0]!, /Mesure la fréquentation/);
  assert.match(r.messages[1]!, /rejetée: trop courte/);
  assert.match(r.instructions, /une à trois phrases/);
});

test("decrireCategories: décrit seulement les catégories sans description, en place, avec nouvel essai sur réponse invalide et échec consigné", async () => {
  const cats: Categorie[] = [{ id: "a", nom: "A", icone: "1" }, { id: "b", nom: "B", icone: "2", description: "Déjà." }, { id: "c", nom: "C", icone: "3" }];
  const outils = [{ categorie: "a", nom: "X", description: "Un outil pour a." }, { categorie: "c", nom: "Y", description: "Un outil pour c." }];
  const reponses: Record<string, unknown[]> = { a: [{ description: "Court." }, { description: "Des outils qui font a, pour les organismes culturels." }], c: [{ description: "Court." }, { description: "Court." }] };
  let appels = 0;
  const generer = async (r: { messages: string[] }) => { appels++; const id = /"id":"([a-z])"/.exec(r.messages[0]!)![1]!; return reponses[id]!.shift(); };
  const journal: string[] = [];
  let sauvegardes = 0;
  const debuts: string[] = [];
  const progression: number[] = [];
  const r = await decrireCategories(cats, outils, { generer, journal: (m) => journal.push(m), apresChaque: () => sauvegardes++, debut: (nom) => debuts.push(nom), progression: (n) => progression.push(n) });
  assert.deepEqual(r.decrites, ["a"]);
  assert.equal(cats[0]!.description, "Des outils qui font a, pour les organismes culturels.");
  assert.equal(cats[1]!.description, "Déjà.");
  assert.equal(cats[2]!.description, undefined);
  assert.equal(r.erreurs[0]!.nom, "C");
  assert.equal(appels, 4);
  assert.equal(sauvegardes, 1);
  assert.deepEqual(debuts, ["A", "C"]);
  assert.deepEqual(progression, [1, 2]);
  assert.ok(journal.some((m) => /nouvel essai/.test(m)));
});

test("estimerCoutDescriptions: un appel par catégorie sans description, proportionnel", () => {
  const cats: Categorie[] = [{ id: "a", nom: "A", icone: "1" }, { id: "b", nom: "B", icone: "2", description: "x" }, { id: "c", nom: "C", icone: "3" }];
  const outils = [{ categorie: "a", nom: "X", description: "d" }];
  const e = estimerCoutDescriptions(cats, outils, "gpt-6-astra");
  assert.equal(e.categories, 2);
  assert.ok(e.usage.entree > 0 && e.usage.sortie > 0 && e.cout! > 0);
  assert.equal(estimerCoutDescriptions(cats, outils, "inconnu").cout, null);
  assert.deepEqual(estimerCoutDescriptions([cats[1]!], outils, "gpt-6-astra").usage, { entree: 0, sortie: 0, cache_lecture: 0, cache_ecriture: 0, raisonnement: 0 });
});

test("decrireCategories: avec genererRepli, une réponse rejetée est reprise par le repli, et la catégorie est décrite", async () => {
  const cats: Categorie[] = [{ id: "a", nom: "A", icone: "1" }];
  const outils = [{ categorie: "a", nom: "X", description: "Un outil pour a." }];
  let repli = 0;
  const r = await decrireCategories(cats, outils, {
    generer: async () => ({ description: "Court." }),
    genererRepli: async (req) => (repli++, assert.match(req.messages.at(-1)!, /rejetée/), { description: "Des outils qui font a, pour les organismes culturels." }),
  });
  assert.deepEqual(r.decrites, ["a"]);
  assert.equal(repli, 1);
  assert.equal(cats[0]!.description, "Des outils qui font a, pour les organismes culturels.");
});
