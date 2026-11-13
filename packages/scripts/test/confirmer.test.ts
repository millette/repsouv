// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// confirmer.ts: vérification des critères un par un, avec citation vérifiable (sans réseau, avec de faux modèles).
import assert from "node:assert/strict";
import { test } from "node:test";
import type { OutilClasse } from "../classify.ts";
import {
  abandonneConfirmation, aConfirmer, champConfirmes, confirmerOutils, ensembleConfirme, estimerCoutConfirmation, instructions, normaliserTexte, requeteOutil,
  validerConfirmation, type Confirmateur, type Requete,
} from "../confirmer.ts";
import type { Contenu } from "../enrichir.ts";
import type { Critere } from "../extract.ts";

const PAGE: Contenu = {
  titre: "Matomo, analytique web",
  meta_description: "Mesurez votre site sans abandonner vos données.",
  extrait: "Matomo peut être auto-hébergé sur votre propre serveur. Les données restent chez vous. Édité par une équipe internationale. Le tableau de bord présente les visites, les pages vues, les sources de trafic et les objectifs de conversion, avec des rapports exportables et une interface en plusieurs langues pour les équipes.",
  liens_depot: [],
};
const CRITERES: Critere[] = [
  { id: "donnees", icon: "📍", titre: "Où peuvent rester les données ?", description: "Au Canada ?" },
  { id: "controle", icon: "🏢", titre: "Qui contrôle l'outil ?", description: "Canadien ?" },
  { id: "dependance", icon: "🔗", titre: "De qui dépend-il ?", description: "Étranger ?" },
];
const DESCRIPTION = "Alternative à Google Analytics, l'outil permet de mesurer la fréquentation.";
const SOURCES = [DESCRIPTION, PAGE.titre, PAGE.meta_description, PAGE.extrait];
const brut = (donnees: unknown, controle: unknown = { statut: "indetermine", preuve: null }, dependance: unknown = { statut: "indetermine", preuve: null }) => ({ criteres: { donnees, controle, dependance } });
const bon = brut({ statut: "confirme", preuve: "Matomo peut être auto-hébergé sur votre propre serveur" });
const valide = brut({ statut: "confirme", preuve: "Les données restent chez vous" }, { statut: "infirme", preuve: "Édité par une équipe internationale" });

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

test("ensembleConfirme et champConfirmes: critères confirmés dans l'ordre, citations des confirmés et des infirmés, modèle et date", () => {
  const c = validerConfirmation(valide, SOURCES);
  assert.deepEqual(ensembleConfirme(c), ["donnees"]);
  assert.deepEqual(champConfirmes(c, "gpt-6-astra", "2026-11-12T09:00:00-05:00"), {
    criteres: ["donnees"], preuves: { donnees: "Les données restent chez vous" }, infirmes: { controle: "Édité par une équipe internationale" }, modele: "gpt-6-astra", date: "2026-11-12T09:00:00-05:00",
  });
});

test("instructions: toujours la règle A pour « controle » (la nationalité mentionnée suffit), et rien d'autre", () => {
  const texte = instructions(CRITERES);
  assert.match(texte, /Précision pour controle: .*québécois.*filiale.*indetermine/);
  assert.doesNotMatch(texte, /Précision pour donnees|Précision pour dependance/);
  assert.match(texte, /Qui contrôle l'outil \?/);
});

const outil = (nom: string, extra: Partial<OutilClasse> = {}): OutilClasse =>
  ({ categorie: "c", nom, score: 2, lien: `https://${nom}`, description: DESCRIPTION, derniere_modification: "2026-11-05T09:53:00-05:00", changement: null, criteres: ["donnees", "dependance"], confiance: "élevée", description_longue: "Longue.", ...extra }) as OutilClasse;

const nonEnrichi = (nom: string): OutilClasse => { const { description_longue: _d, ...o } = outil(nom); return o as OutilClasse; };

test("requeteOutil: la requête n'indique ni le score, ni les critères du répertoire, ni l'évaluation enrichie; le rappel s'ajoute", () => {
  const r = requeteOutil(outil("A", { evaluation_enrichie: { score: 2, criteres: ["donnees", "controle"], confiance: "élevée" } }), PAGE, CRITERES, "preuve introuvable");
  assert.doesNotMatch(r.messages[0]!, /"score"|confiance|"criteres"/);
  assert.match(r.messages[0]!, /Matomo peut être auto-hébergé/);
  assert.match(r.messages[1]!, /rejetée: preuve introuvable/);
  assert.equal(r.nom, "confirmation_criteres");
});

test("aConfirmer et abandonneConfirmation", () => {
  assert.equal(aConfirmer(outil("A")), true);
  assert.equal(aConfirmer(outil("A", { criteres_confirmes: champConfirmes(validerConfirmation(valide, SOURCES), "m", "d") })), false);
  assert.equal(aConfirmer(nonEnrichi("A")), false, "pas enrichi: rien à vérifier");
  assert.equal(aConfirmer(outil("A", { removed: true })), false);
  assert.equal(abandonneConfirmation(outil("A", { echecs_confirmation: 3 })), true);
  assert.equal(abandonneConfirmation(outil("A", { echecs_confirmation: 2 })), false);
  assert.equal(abandonneConfirmation(outil("A", { echecs_confirmation: 2 }), 2), true);
});

const faux = (reponses: unknown[], requetes: Requete[] = []): Confirmateur => async (r) => { requetes.push(r); return reponses.length ? reponses.shift() : valide; };
const lire = async () => PAGE;
const options = (confirmer: Confirmateur, extra: Partial<Parameters<typeof confirmerOutils>[1]> = {}) => ({ confirmer, criteres: CRITERES, modele: "gpt-6-astra", lire, horloge: () => "2026-11-12T09:00:00-05:00", ...extra });

test("instance_de: la page lue est celle du logiciel, la requête le dit, et les instructions expliquent le cas", async () => {
  const requetes: Requete[] = [];
  const urls: string[] = [];
  const outils = [outil("Jasette FACiLe", { instance_de: { nom: "Mastodon", url: "https://github.com/mastodon/mastodon/releases/tag/v4.7.1" } })];
  await confirmerOutils(outils, options(faux([], requetes), { lire: async (url) => (urls.push(url), PAGE) }));
  assert.deepEqual(urls, ["https://github.com/mastodon/mastodon"]);
  assert.match(requetes[0]!.messages[0]!, /"instance_de":\{"nom":"Mastodon"/);
  assert.match(requetes[0]!.messages[0]!, /"page_lue":"https:\/\/github\.com\/mastodon\/mastodon"/);
  assert.doesNotMatch(requeteOutil(outil("A"), PAGE, CRITERES).messages[0]!, /instance_de/);
  assert.match(instructions(CRITERES), /instance_de.*service hébergé.*logiciel/);
});
test("confirmerOutils: un verdict par outil à vérifier, inscrit en place avec le modèle et la date, et sauvegardé", async () => {
  const outils = [outil("A"), outil("B", { criteres_confirmes: champConfirmes(validerConfirmation(valide, SOURCES), "m", "d") }), nonEnrichi("C")];
  let sauvegardes = 0;
  const r = await confirmerOutils(outils, options(faux([]), { apresChaque: () => sauvegardes++ }));
  assert.deepEqual(r.confirmes, ["A"]);
  assert.deepEqual(outils[0]!.criteres_confirmes, { criteres: ["donnees"], preuves: { donnees: "Les données restent chez vous" }, infirmes: { controle: "Édité par une équipe internationale" }, modele: "gpt-6-astra", date: "2026-11-12T09:00:00-05:00" });
  assert.equal(outils[1]!.criteres_confirmes!.modele, "m", "un outil déjà vérifié n'est jamais refait");
  assert.equal(sauvegardes, 1);
});

test("confirmerOutils: une réponse invalide est redemandée une fois avec la raison; deux réponses invalides comptent un échec", async () => {
  const requetes: Requete[] = [];
  const outils = [outil("A")];
  const r = await confirmerOutils(outils, options(faux([brut({ statut: "confirme", preuve: "inventé" })], requetes)));
  assert.equal(requetes.length, 2);
  assert.match(requetes[1]!.messages.at(-1)!, /rejetée.*introuvable/);
  assert.deepEqual(r.confirmes, ["A"]);
  const mauvaise = brut({ statut: "confirme", preuve: "inventé" });
  const deux = [outil("B")];
  const s = await confirmerOutils(deux, options(faux([mauvaise, mauvaise])));
  assert.deepEqual(s.confirmes, []);
  assert.match(s.erreurs[0]!.message, /introuvable/);
  assert.equal(deux[0]!.echecs_confirmation, 1);
  assert.equal(deux[0]!.criteres_confirmes, undefined);
});

test("confirmerOutils: page inaccessible ou presque vide: aucun appel, échec compté; après 3 échecs l'outil est abandonné; un succès retire le compteur", async () => {
  const requetes: Requete[] = [];
  const outils = [outil("A"), outil("B", { echecs_confirmation: 3 }), outil("C", { echecs_confirmation: 2 })];
  const r = await confirmerOutils(outils, options(faux([], requetes), { lire: async (url) => (url === "https://A" ? null : PAGE) }));
  assert.deepEqual(r.abandonnes, ["B"]);
  assert.match(r.erreurs[0]!.message, /page inaccessible/);
  assert.equal(outils[0]!.echecs_confirmation, 1);
  assert.deepEqual(r.confirmes, ["C"]);
  assert.equal(outils[2]!.echecs_confirmation, undefined);
  assert.equal(requetes.length, 1, "seul C a été envoyé au modèle");
  const vide = [outil("D")];
  const s = await confirmerOutils(vide, options(faux([], requetes), { lire: async () => ({ ...PAGE, extrait: "court" }) }));
  assert.match(s.erreurs[0]!.message, /presque vide/);
});

test("estimerCoutConfirmation: un appel par outil, proportionnel, coût nul pour un modèle sans prix", () => {
  const un = estimerCoutConfirmation([outil("A")], CRITERES, "gpt-6-astra");
  const deux = estimerCoutConfirmation([outil("A"), outil("B")], CRITERES, "gpt-6-astra");
  assert.equal(un.outils, 1);
  assert.ok(un.usage.entree > 2000 && un.usage.sortie === 500, JSON.stringify(un.usage));
  assert.equal(deux.usage.entree, 2 * un.usage.entree);
  assert.ok(un.cout! > 0);
  assert.equal(estimerCoutConfirmation([outil("A")], CRITERES, "inconnu").cout, null);
});

test("confirmerOutils: avec confirmerRepli et modeleRepli, une réponse rejetée est reprise par le repli, dont le nom est inscrit dans le verdict", async () => {
  const requetes: Requete[] = [];
  const outils = [outil("A")];
  const journal: string[] = [];
  const r = await confirmerOutils(outils, options(faux([brut({ statut: "confirme", preuve: "inventé" }), brut({ statut: "confirme", preuve: "inventé" })]), {
    confirmerRepli: faux([], requetes), modeleRepli: "gpt-repli", journal: (m) => journal.push(m),
  }));
  assert.deepEqual(r.confirmes, ["A"]);
  assert.equal(requetes.length, 1);
  assert.match(requetes[0]!.messages.at(-1)!, /rejetée.*introuvable/);
  assert.equal(outils[0]!.criteres_confirmes!.modele, "gpt-repli");
  assert.equal(outils[0]!.echecs_confirmation, undefined);
  assert.ok(journal.some((m) => /nouvel essai avec le modèle de repli/.test(m)));
  const mauvaise = brut({ statut: "confirme", preuve: "inventé" });
  const deux = [outil("B")];
  const s = await confirmerOutils(deux, options(faux([mauvaise]), { confirmerRepli: faux([mauvaise]), modeleRepli: "gpt-repli" }));
  assert.deepEqual(s.confirmes, []);
  assert.equal(deux[0]!.echecs_confirmation, 1);
});

test("pays: la requête le transmet quand l'outil en a un, et les instructions le présentent comme une affirmation à confronter", () => {
  assert.match(requeteOutil(outil("P", { pays: "CH" }), PAGE, CRITERES).messages[0]!, /"pays":"CH"/);
  assert.doesNotMatch(requeteOutil(outil("A"), PAGE, CRITERES).messages[0]!, /"pays"/);
  assert.match(instructions(CRITERES), /« pays » est présent/);
});
