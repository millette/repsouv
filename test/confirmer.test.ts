// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// confirmer.ts: confirmation des critères un par un, avec citation vérifiable (sans réseau, avec de faux fournisseurs).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accordEnsembles, coutOpenAI, confirmerOutils, ensembleConfirme, lireSortieClaude, normaliserTexte, PRIX, validerConfirmation,
  totauxDe, type Appel, type Confirmation, type Fournisseur, type Requete, type Usage,
} from "../confirmer.ts";
import type { Contenu } from "../enrichir.ts";
import type { OutilClasse } from "../classify.ts";

const PAGE: Contenu = {
  titre: "Matomo, analytique web",
  meta_description: "Mesurez votre site sans abandonner vos données.",
  extrait: "Matomo peut être auto-hébergé sur votre propre serveur. Les données restent chez vous. Édité par une équipe internationale. Le tableau de bord présente les visites, les pages vues, les sources de trafic et les objectifs de conversion, avec des rapports exportables et une interface en plusieurs langues pour les équipes.",
  liens_depot: [],
};
const SOURCES = ["Alternative à Google Analytics, l'outil permet de mesurer la fréquentation.", PAGE.titre, PAGE.meta_description, PAGE.extrait];
const brut = (donnees: unknown, controle: unknown = { statut: "indetermine", preuve: null }, dependance: unknown = { statut: "indetermine", preuve: null }) => ({ criteres: { donnees, controle, dependance } });
const bon = brut({ statut: "confirme", preuve: "Matomo peut être auto-hébergé sur votre propre serveur" });

test("normaliserTexte: casse, espaces, apostrophes et guillemets typographiques", () => {
  assert.equal(normaliserTexte("  L’outil   « Données » chez\nvous "), "l'outil « données » chez vous");
});

test("validerConfirmation accepte un verdict avec citation exacte, aux différences de casse et d'espaces près", () => {
  const c = validerConfirmation(brut({ statut: "confirme", preuve: "les DONNÉES   restent chez vous" }), SOURCES);
  assert.equal(c.donnees.statut, "confirme");
  assert.equal(c.controle.preuve, null);
  assert.deepEqual(Object.keys(c), ["donnees", "controle", "dependance"]);
});

test("validerConfirmation refuse: critère manquant ou en trop, statut inconnu", () => {
  assert.throws(() => validerConfirmation({ criteres: { donnees: bon.criteres.donnees, controle: { statut: "indetermine", preuve: null } } }, SOURCES), /dependance/);
  assert.throws(() => validerConfirmation({ criteres: { ...bon.criteres, extra: { statut: "indetermine", preuve: null } } }, SOURCES), /extra/);
  assert.throws(() => validerConfirmation(brut({ statut: "peut-être", preuve: null }), SOURCES), /statut/);
  assert.throws(() => validerConfirmation("pas un objet", SOURCES), /criteres/);
});

test("validerConfirmation refuse: citation absente, introuvable ou trop longue; citation pour un verdict indéterminé", () => {
  assert.throws(() => validerConfirmation(brut({ statut: "confirme", preuve: null }), SOURCES), /preuve/);
  assert.throws(() => validerConfirmation(brut({ statut: "infirme", preuve: "" }), SOURCES), /preuve/);
  assert.throws(() => validerConfirmation(brut({ statut: "confirme", preuve: "Hébergé exclusivement au Canada" }), SOURCES), /introuvable/);
  assert.throws(() => validerConfirmation(brut({ statut: "confirme", preuve: SOURCES[3]!.repeat(3) }), [SOURCES[3]!.repeat(3)]), /trop longue/);
  assert.throws(() => validerConfirmation(brut({ statut: "indetermine", preuve: "Matomo peut être auto-hébergé" }), SOURCES), /indetermine/);
});

test("ensembleConfirme ne garde que les critères confirmés, dans l'ordre des critères", () => {
  const c = validerConfirmation(brut({ statut: "confirme", preuve: "Les données restent chez vous" }, { statut: "infirme", preuve: "Édité par une équipe internationale" }), SOURCES);
  assert.deepEqual(ensembleConfirme(c), ["donnees"]);
});

test("accordEnsembles: accord exact et Jaccard moyen, à l'ordre près", () => {
  const r = accordEnsembles([[["donnees", "controle"], ["controle", "donnees"]], [["donnees"], ["donnees", "controle"]], [[], []]]);
  assert.equal(r.exact, 2);
  assert.equal(r.total, 3);
  assert.equal(Math.round(r.jaccard * 1000), Math.round(((1 + 0.5 + 1) / 3) * 1000));
});

test("coutOpenAI: entrées non mises en cache, entrées en cache et sorties, au prix du modèle", () => {
  const usage = { entree: 1000, cache_lecture: 400, cache_ecriture: 0, sortie: 500 }; // entree comprend le cache
  const cout = coutOpenAI(usage, PRIX["gpt-6-astra"]!);
  assert.equal(Math.round(cout * 1e6), Math.round((600 * 10 + 400 * 1 + 500 * 50)));
});

test("lireSortieClaude: verdict structuré, jetons et coût de la CLI", () => {
  const sortie = JSON.stringify({
    is_error: false, total_cost_usd: 0.0002808, structured_output: { statut: "ok", n: 1 }, result: '{"statut":"ok","n":1}',
    modelUsage: { "claude-haiku-5-5": { inputTokens: 2, outputTokens: 74, cacheReadInputTokens: 100, cacheCreationInputTokens: 1218, costUSD: 0.0002808 } },
  });
  const a = lireSortieClaude(sortie);
  assert.deepEqual(a.contenu, { statut: "ok", n: 1 });
  assert.deepEqual(a.usage, { entree: 1320, sortie: 74, cache_lecture: 100, cache_ecriture: 1218 });
  assert.equal(a.cout_usd, 0.0002808);
  assert.throws(() => lireSortieClaude(JSON.stringify({ is_error: true, errors: ["Reached maximum budget ($0.5)"] })), /maximum budget/);
});

// ---------- boucle de confirmation ----------

const outil = (nom: string, lien: string): OutilClasse =>
  ({ categorie: "c", icone: "i", nom, score: 2, lien, description: "Alternative à Google Analytics, l'outil permet de mesurer la fréquentation.", derniere_modification: "2026-11-05T09:53:00-05:00", changement: null, criteres: ["donnees", "dependance"], confiance: "élevée" }) as OutilClasse;
const valide = brut({ statut: "confirme", preuve: "Les données restent chez vous" });
const usage = { entree: 1000, sortie: 200, cache_lecture: 0, cache_ecriture: 0 };
const fournisseur = (reponses: unknown[], cout = 0.01, requetes: Requete[] = []): Fournisseur => ({
  nom: "faux", modele: "faux-1",
  appeler: async (r): Promise<Appel> => { requetes.push(r); const contenu = reponses.shift() ?? valide; return { contenu, usage, cout_usd: cout }; },
});
const lirePage = async () => PAGE;

test("confirmerOutils: un verdict par outil, jetons et coût cumulés", async () => {
  const r = await confirmerOutils([outil("A", "https://a"), outil("B", "https://b")], { fournisseur: fournisseur([]), lirePage });
  assert.equal(r.resultats.length, 2);
  assert.equal(r.resultats[0]!.confirmation?.donnees.statut, "confirme");
  assert.deepEqual(r.totaux, { appels: 2, entree: 2000, sortie: 400, cache_lecture: 0, cache_ecriture: 0, cout_usd: 0.02, echecs: 0 });
  assert.equal(r.arret, null);
});

test("confirmerOutils: une réponse invalide est redemandée une fois avec la raison, et les deux appels sont comptés", async () => {
  const requetes: Requete[] = [];
  const r = await confirmerOutils([outil("A", "https://a")], { fournisseur: fournisseur([brut({ statut: "confirme", preuve: "inventé" })], 0.01, requetes), lirePage });
  assert.equal(requetes.length, 2);
  assert.match(requetes[1]!.messages.at(-1)!, /rejetée.*introuvable/);
  assert.equal(r.resultats[0]!.tentatives, 2);
  assert.equal(r.resultats[0]!.confirmation?.donnees.statut, "confirme");
  assert.equal(r.totaux.appels, 2);
  assert.equal(r.totaux.cout_usd, 0.02);
});

test("confirmerOutils: deux réponses invalides consignent un échec sans verdict", async () => {
  const mauvaise = brut({ statut: "confirme", preuve: "inventé" });
  const r = await confirmerOutils([outil("A", "https://a")], { fournisseur: fournisseur([mauvaise, mauvaise]), lirePage });
  assert.equal(r.resultats[0]!.confirmation, undefined);
  assert.match(r.resultats[0]!.echec!, /introuvable/);
  assert.equal(r.totaux.echecs, 1);
});

test("confirmerOutils: une page inaccessible ou presque vide n'appelle pas l'IA", async () => {
  const requetes: Requete[] = [];
  const r = await confirmerOutils([outil("A", "https://a"), outil("B", "https://b")], {
    fournisseur: fournisseur([], 0.01, requetes),
    lirePage: async (url) => { if (url === "https://a") throw new Error("HTTP 403"); return { ...PAGE, extrait: "court" }; },
  });
  assert.equal(requetes.length, 0);
  assert.match(r.resultats[0]!.echec!, /page inaccessible.*403/);
  assert.match(r.resultats[1]!.echec!, /page presque vide/);
  assert.equal(r.totaux.appels, 0);
});

test("confirmerOutils: s'arrête avant l'appel suivant quand le budget est atteint, et respecte la limite", async () => {
  const outils = [outil("A", "https://a"), outil("B", "https://b"), outil("C", "https://c")];
  const budget = await confirmerOutils(outils, { fournisseur: fournisseur([], 0.02), lirePage, budgetUsd: 0.02 });
  assert.equal(budget.resultats.length, 1);
  assert.equal(budget.arret, "budget");
  const limite = await confirmerOutils(outils, { fournisseur: fournisseur([]), lirePage, limite: 2 });
  assert.equal(limite.resultats.length, 2);
  assert.equal(limite.arret, null);
});

test("confirmerOutils: la requête n'indique ni le score ni les critères du répertoire", async () => {
  const requetes: Requete[] = [];
  await confirmerOutils([outil("A", "https://a")], { fournisseur: fournisseur([], 0.01, requetes), lirePage });
  const texte = JSON.stringify(requetes[0]);
  assert.doesNotMatch(texte, /"score"|confiance|"criteres":\s*\[/);
  assert.match(requetes[0]!.messages[0]!, /Matomo peut être auto-hébergé/);
});

const _types: Confirmation | undefined = undefined;
void _types;

test("totauxDe: somme les jetons, les coûts, les appels (tentatives) et les échecs de tous les résultats d'un fichier", () => {
  const u = (entree: number): Usage => ({ entree, sortie: 10, cache_lecture: 1, cache_ecriture: 0 });
  const t = totauxDe([
    { nom: "A", lien: "a", tentatives: 1, usage: u(100), cout_usd: 0.01 },
    { nom: "B", lien: "b", tentatives: 2, usage: u(200), cout_usd: 0.03 },
    { nom: "C", lien: "c", tentatives: 0, echec: "page inaccessible (HTTP 403)" },
  ]);
  assert.deepEqual(t, { appels: 3, entree: 300, sortie: 20, cache_lecture: 2, cache_ecriture: 0, cout_usd: 0.04, echecs: 1 });
});
