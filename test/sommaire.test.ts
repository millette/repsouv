// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Ces tests n'utilisent que des données fictives: ni outils.json, ni réseau, ni ligne de commande.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { OutilClasse } from "../classify.ts";
import type { Tag } from "../enrichir.ts";
import type { Critere } from "../extract.ts";
import {
  calculerStatistiques, chargeResume, familleLicence, forgeDe, produireResume, rendreMarkdown, validerResume,
  type Entree, type GenerateurResume,
} from "../sommaire.ts";

const META = { data_license: "CC-BY-SA-4.0", created_at: "2026-11-11T16:43:11-05:00", updated_at: "2026-11-12T10:00:00-05:00" };
const D0 = "2026-11-05T09:53:00-05:00";
const D1 = "2026-11-20T14:00:00-05:00";

const CRITERES: Critere[] = [
  { id: "donnees", icon: "📍", titre: "Où peuvent rester les données ?", description: "d" },
  { id: "controle", icon: "🏢", titre: "Qui contrôle l'outil ?", description: "d" },
  { id: "dependance", icon: "🔗", titre: "De qui dépend-il pour fonctionner ?", description: "d" },
];
const TAGS: Tag[] = [
  { id: "chiffrement", description: "Chiffre les données." },
  { id: "auto-hebergeable", description: "Installable | chez soi." },
  { id: "gratuit", description: "Gratuit." },
  { id: "inutilise", description: "Jamais utilisé." },
  { id: "nouveau-tag", description: "Ajouté.", justification: "Aucun tag existant ne convient.", propose_pour: "Maison" },
];

const outil = (nom: string, extra: Partial<OutilClasse> = {}): OutilClasse => ({
  categorie: "Cat1", icone: "🧪", nom, score: 2, lien: `https://${nom}.example/`, description: `Description de ${nom}.`,
  derniere_modification: D0, changement: null, criteres: ["donnees", "dependance"], confiance: "moyenne", ...extra,
});
const enrichi = (nom: string, extra: Partial<OutilClasse> = {}) =>
  outil(nom, {
    description_longue: "Longue.", tags: ["chiffrement"], source: "libre", licence: "AGPL-3.0-only", custom_license: null, custom_license_url: null,
    repo: `https://github.com/org/${nom}`, page_lue: true, enrichi_le: "2026-11-12T09:00:00-05:00",
    evaluation_enrichie: { score: 2, criteres: ["donnees", "dependance"], confiance: "élevée" }, ...extra,
  });

/** Un outil enrichi avant que la date d'enrichissement soit enregistrée. */
const sansDate = (o: OutilClasse): OutilClasse => {
  delete o.enrichi_le;
  return o;
};

const OUTILS: OutilClasse[] = [
  enrichi("A", { tags: ["chiffrement", "auto-hebergeable"] }),
  enrichi("B", {
    source: "partiel", licence: "MIT", repo: "https://gitlab.com/org/B", tags: ["chiffrement", "auto-hebergeable", "gratuit"],
    criteres: ["donnees", "controle"], enrichi_le: "2026-11-12T09:00:20-05:00",
    evaluation_enrichie: { score: 1, criteres: ["controle"], confiance: "faible", ecart: "Le répertoire suppose les données au Canada." },
  }),
  enrichi("C", { source: "proprietaire", licence: null, repo: null, score: 3, criteres: ["donnees", "controle", "dependance"], tags: ["gratuit"], categorie: "Cat2", enrichi_le: "2026-11-13T08:00:00-05:00",
    evaluation_enrichie: { score: 3, criteres: ["donnees", "controle", "dependance"], confiance: "élevée" } }),
  outil("D", { categorie: "Cat2", changement: "nouveau", derniere_modification: D1 }),
  enrichi("Maison", { source: "source-disponible", licence: null, custom_license: "Licence maison", custom_license_url: "https://maison.example/licence", repo: "https://git.exemple.org/x/Maison", tags: [] }),
  sansDate(enrichi("G", { licence: "Apache-2.0 OR MIT", page_lue: false, categorie: "Cat2" })),
  outil("Retire", { removed: true, changement: "retrait", derniere_modification: D1 }),
];
const entree = (outils = OUTILS): Entree => ({ outils, tags: TAGS, criteres: CRITERES, meta: META });
const cles = (cs: { cle: string; n: number }[]) => Object.fromEntries(cs.map((c) => [c.cle, c.n]));

test("forgeDe: noms connus, hôtes inconnus, et URL invalide", () => {
  assert.deepEqual(forgeDe("https://github.com/a/b"), { forge: "GitHub", hote: "github.com" });
  assert.equal(forgeDe("https://www.gitlab.com/a/b").forge, "GitLab");
  assert.equal(forgeDe("https://codeberg.org/a/b").forge, "Codeberg");
  assert.equal(forgeDe("https://git.sr.ht/~a/b").forge, "SourceHut");
  assert.deepEqual(forgeDe("https://git.exemple.org/a/b"), { forge: "git.exemple.org", hote: "git.exemple.org" });
  assert.equal(forgeDe("pas une url").forge, "URL invalide");
});
test("familleLicence: copyleft fort, faible, permissive, autre; la plus forte l'emporte", () => {
  assert.match(familleLicence("AGPL-3.0-only"), /fort/);
  assert.match(familleLicence("GPL-2.0-or-later"), /fort/);
  assert.match(familleLicence("LGPL-3.0-or-later"), /faible/);
  assert.match(familleLicence("MPL-2.0"), /faible/);
  assert.match(familleLicence("Apache-2.0"), /Permissive/);
  assert.match(familleLicence("BSD-3-Clause"), /Permissive/);
  assert.match(familleLicence("MIT OR GPL-2.0-only"), /fort/);
  assert.match(familleLicence("BUSL-1.1"), /Autre/);
});

test("statistiques: les outils retirés sont comptés à part et exclus des agrégats", () => {
  const s = calculerStatistiques(entree());
  assert.equal(s.total, 6);
  assert.deepEqual(s.retires, ["Retire"]);
  assert.equal(s.enrichissement.enrichis, 5);
  assert.deepEqual(cles(s.changements), { aucun: 5, nouveau: 1 });
});
test("statistiques: catégories, scores, sources", () => {
  const s = calculerStatistiques(entree());
  assert.deepEqual(s.categories.map((c) => [c.categorie, c.outils, c.enrichis, c.libres]), [["Cat1", 3, 3, 2], ["Cat2", 3, 2, 1]]);
  assert.deepEqual(s.scores, { deux: 5, trois: 1, moyen: 2.17 });
  assert.deepEqual(s.sources.map((c) => [c.cle, c.n]), [["libre", 2], ["partiel", 1], ["source-disponible", 1], ["proprietaire", 1], ["non enrichi", 1]]);
});
test("statistiques: licences, familles, licence maison et outils sans licence", () => {
  const { licences } = calculerStatistiques(entree());
  assert.deepEqual(cles(licences.spdx), { "AGPL-3.0-only": 1, "Apache-2.0 OR MIT": 1, MIT: 1 });
  assert.deepEqual(cles(licences.familles), { "Permissive (MIT, Apache, BSD, ISC)": 2, "Copyleft fort (GPL, AGPL)": 1 });
  assert.deepEqual(licences.maison, [{ nom: "Licence maison", url: "https://maison.example/licence", n: 1 }]);
  assert.deepEqual(cles(licences.sansLicence), { Propriétaire: 1 });
});
test("statistiques: tags utilisés, inutilisés, moyenne, paires, tags ajoutés", () => {
  const { tags } = calculerStatistiques(entree());
  assert.deepEqual(cles(tags.utilisation.filter((t) => t.n)), { chiffrement: 3, gratuit: 2, "auto-hebergeable": 2 });
  assert.deepEqual(tags.inutilises, ["inutilise", "nouveau-tag"]);
  assert.deepEqual(tags.sansTag, ["Maison"]);
  assert.equal(tags.moyenneParOutil, 1.4);
  assert.deepEqual(tags.paires.map((p) => [p.cle, p.n]), [["auto-hebergeable + chiffrement", 2]]);
  assert.deepEqual(tags.ajoutes.map((t) => t.id), ["nouveau-tag"]);
});
test("statistiques: critères par critère et par statut du code source, répertoire et évaluation enrichie", () => {
  const { criteres } = calculerStatistiques(entree());
  assert.deepEqual(cles(criteres.repertoire.parCritere), { donnees: 6, controle: 2, dependance: 5 });
  const libre = criteres.repertoire.parSource.find((l) => l.source === "libre")!;
  assert.deepEqual([libre.outils, libre.total, libre.parCritere.dependance], [2, 4, 2]);
  const ensemble = criteres.repertoire.parSource.at(-1)!;
  assert.deepEqual([ensemble.source, ensemble.outils], ["Ensemble", 6]);
  assert.deepEqual(criteres.repertoire.parSource.map((l) => l.source), ["libre", "partiel", "source-disponible", "proprietaire", "non enrichi", "Ensemble"]);
  assert.equal(criteres.enrichie.parSource.at(-1)!.outils, 5);
  assert.equal(criteres.enrichie.concordants, 4);
  assert.deepEqual(cles(criteres.enrichie.confiance), { élevée: 4, faible: 1 });
});
test("statistiques: forges, et logiciels libres sans dépôt", () => {
  const s = calculerStatistiques(entree([...OUTILS, enrichi("Sans", { repo: null })]));
  assert.deepEqual(s.forges.map((f) => [f.forge, f.outils.length]), [["GitHub", 2], ["git.exemple.org", 1], ["GitLab", 1]]);
  assert.deepEqual(s.forges[0]!.outils, ["A", "G"]);
  assert.deepEqual(s.sansDepot.libresOuPartiels, ["Sans"]);
  assert.equal(s.sansDepot.autres, 1);
});
test("statistiques: dates du répertoire (plus anciennes et plus récentes) et dates d'enrichissement", () => {
  const s = calculerStatistiques(entree());
  assert.deepEqual(s.dates.premieres, { date: D0, outils: ["A", "B", "C", "G", "Maison"] });
  assert.deepEqual(s.dates.dernieres, { date: D1, outils: ["D"] });
  assert.deepEqual(s.dates.parDate.map((c) => c.cle), [D1, D0]);
  const e = s.datesEnrichissement;
  assert.equal(e.premiere!.date, "2026-11-12T09:00:00-05:00");
  assert.deepEqual(e.premiere!.outils, ["A", "Maison"]);
  assert.equal(e.derniere!.date, "2026-11-13T08:00:00-05:00");
  assert.deepEqual(e.derniere!.outils, ["C"]);
  assert.deepEqual(e.parJour, [{ cle: "2026-11-12", n: 3 }, { cle: "2026-11-13", n: 1 }]);
  assert.equal(s.enrichissement.sansDate, 1);
  assert.deepEqual(s.enrichissement.sansPage, ["G"]);
  assert.deepEqual(s.enrichissement.avecEcart, ["B"]);
});
test("statistiques: aucun outil enrichi (début de l'enrichissement), sans erreur", () => {
  const s = calculerStatistiques(entree([outil("X"), outil("Y", { score: 3, criteres: ["donnees", "controle", "dependance"] })]));
  assert.equal(s.enrichissement.enrichis, 0);
  assert.equal(s.datesEnrichissement.premiere, null);
  assert.deepEqual(s.forges, []);
  assert.deepEqual(s.licences.spdx, []);
  assert.equal(s.tags.moyenneParOutil, 0);
  assert.deepEqual(s.criteres.enrichie.parSource, []);
});
test("statistiques: aucun outil du tout", () => {
  const s = calculerStatistiques(entree([]));
  assert.equal(s.total, 0);
  assert.equal(s.dates.premieres, null);
  assert.deepEqual(s.categories, []);
});

const GENERE_LE = "2026-11-21T10:00:00-05:00";
test("rendu: toutes les sections sont présentes, sans valeur manquante", () => {
  const md = rendreMarkdown(calculerStatistiques(entree()), { genereLe: GENERE_LE });
  for (const titre of ["# Sommaire", "## Chiffres clés", "## Dates", "### Dans le répertoire", "### Enrichissement", "## Catégories", "## Statut du code source", "## Licences", "## Critères de souveraineté", "### Nombre d'outils par critère", "### Évaluation enrichie", "## Forges de code", "## Tags", "## Fiabilité et suivi"]) {
    assert.ok(md.includes(titre), titre);
  }
  assert.doesNotMatch(md, /undefined|NaN|\[object|null/);
  assert.ok(md.includes(GENERE_LE) && md.includes(META.updated_at));
  assert.ok(md.endsWith("\n") && !md.endsWith("\n\n"));
});
test("rendu: contenu des tableaux (forges, licences, tags, dates, critères)", () => {
  const md = rendreMarkdown(calculerStatistiques(entree()), { genereLe: GENERE_LE });
  assert.match(md, /\| GitHub \| 2 \|/);
  assert.match(md, /\| AGPL-3\.0-only \| 1 \| 20,0 % \|/);
  assert.match(md, /Copyleft fort/);
  assert.match(md, /Licence maison \| https:\/\/maison\.example\/licence \| 1/);
  assert.match(md, /Premier enrichissement\*\* : 2026-11-12T09:00:00-05:00/);
  assert.match(md, /Dernier enrichissement\*\* : 2026-11-13T08:00:00-05:00/);
  assert.match(md, /1 sans date/);
  assert.match(md, /Outils les plus anciens\*\* : 2026-11-05T09:53:00-05:00, 5 outil/);
  assert.match(md, /Outils les plus récents\*\* : 2026-11-20T14:00:00-05:00, 1 outil/);
  assert.match(md, /Ensemble \| 6 \|/);
  assert.match(md, /Tags ajoutés après le vocabulaire initial/);
  assert.match(md, /Logiciels libres ou partiels sans dépôt connu|Autres outils enrichis sans dépôt/);
});
test("rendu: les barres verticales des cellules sont protégées", () => {
  const md = rendreMarkdown(calculerStatistiques(entree()), { genereLe: GENERE_LE });
  assert.match(md, /Installable \\\| chez soi\./);
});
test("rendu: sans outil enrichi, les sections concernées l'indiquent", () => {
  const md = rendreMarkdown(calculerStatistiques(entree([outil("X")])), { genereLe: GENERE_LE });
  assert.match(md, /Aucun outil n'est enrichi pour l'instant/);
  assert.doesNotMatch(md, /undefined|NaN|\[object|null/);
});
test("rendu: le résumé IA, ou la raison de son absence, est indiqué", () => {
  const s = calculerStatistiques(entree());
  const avec = rendreMarkdown(s, { genereLe: GENERE_LE, resume: { paragraphes: ["Premier paragraphe.", "Deuxième paragraphe."], modele: "gpt-x", date: GENERE_LE } });
  assert.match(avec, /## Résumé\n\nPremier paragraphe\.\n\nDeuxième paragraphe\./);
  assert.match(avec, /rédigé par un modèle d'IA \(gpt-x\)/);
  const erreur = rendreMarkdown(s, { genereLe: GENERE_LE, resume: { erreur: "OpenAI HTTP 500" } });
  assert.match(erreur, /n'a pas pu être rédigé \(OpenAI HTTP 500\)/);
  assert.doesNotMatch(rendreMarkdown(s, { genereLe: GENERE_LE, resume: null }), /## Résumé/);
});

const PARA = "Ce paragraphe décrit le répertoire, ses critères de souveraineté numérique et son utilité pour les organismes des arts et de la culture, sans rien extrapoler.";
test("chargeResume: statistiques et liste compacte des outils (sans les retirés)", () => {
  const s = calculerStatistiques(entree());
  const charge = chargeResume(s, OUTILS);
  assert.equal(charge.statistiques, s);
  assert.equal(charge.outils.length, 6);
  assert.deepEqual(Object.keys(charge.outils[0]!).sort(), ["categorie", "criteres", "description", "forge", "licence", "nom", "score", "source", "tags"].sort());
  assert.equal(charge.outils.find((o) => o.nom === "A")!.forge, "GitHub");
  assert.equal(charge.outils.find((o) => o.nom === "Maison")!.licence, "Licence maison");
});
test("validerResume: 3 ou 4 paragraphes de texte continu", () => {
  assert.equal(validerResume({ paragraphes: [PARA, PARA, PARA] }).length, 3);
  assert.equal(validerResume({ paragraphes: [PARA, PARA, PARA, ` ${PARA} `] })[3], PARA);
});
test("validerResume: refuse un mauvais nombre, un texte court, du Markdown de structure, du HTML, un tiret cadratin", () => {
  const rejet = (brut: unknown, re: RegExp) => assert.throws(() => validerResume(brut), re);
  rejet({ paragraphes: [PARA, PARA] }, /3 ou 4/);
  rejet({ paragraphes: [PARA, PARA, PARA, PARA, PARA] }, /3 ou 4/);
  rejet({}, /3 ou 4/);
  rejet({ paragraphes: [PARA, "Trop court.", PARA] }, /paragraphe 2.*120/);
  rejet({ paragraphes: [PARA, `## Titre\n${PARA}`, PARA] }, /ni titre, ni liste/);
  rejet({ paragraphes: [PARA, `- point un\n- point deux\n${PARA}`, PARA] }, /ni titre, ni liste/);
  rejet({ paragraphes: [PARA, `${PARA} **gras**`, PARA] }, /gras/);
  rejet({ paragraphes: [PARA, `${PARA} <b>html</b>`, PARA] }, /HTML/);
  rejet({ paragraphes: [PARA, `${PARA} Un outil — libre.`, PARA] }, /cadratin/);
  rejet({ paragraphes: [PARA, `${PARA} Super :)`, PARA] }, /émoticône/);
});
test("produireResume: une réponse invalide est redemandée avec la raison, puis acceptée", async () => {
  const rappels: (string | undefined)[] = [];
  const reponses = [{ paragraphes: [PARA] }, { paragraphes: [PARA, PARA, PARA] }];
  const generer: GenerateurResume = async (_c, rappel) => (rappels.push(rappel), reponses.shift());
  const rejets: string[] = [];
  const charge = chargeResume(calculerStatistiques(entree()), OUTILS);
  assert.equal((await produireResume(charge, generer, (r) => rejets.push(r))).length, 3);
  assert.equal(rappels[0], undefined);
  assert.match(rappels[1]!, /3 ou 4/);
  assert.equal(rejets.length, 1);
});
test("produireResume: deux réponses invalides, c'est une erreur", async () => {
  const charge = chargeResume(calculerStatistiques(entree()), OUTILS);
  await assert.rejects(produireResume(charge, async () => ({ paragraphes: [] })), /3 ou 4/);
});
