// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Ces tests n'utilisent que des données fictives: ni outils.json, ni réseau, ni ligne de commande.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CATEGORIES, CRITERES, D0, D1, entree, enrichi, META, outil, OUTILS, sansDate, TAGS } from "./donnees-fictives.ts";
import { ecrireFichier } from "../fichiers.ts";
import {
  calculerStatistiques, chargeResume, familleLicence, forgeDe, genererSommaire, produireResume, rendreMarkdown, validerResume,
  type Entree, type GenerateurResume,
} from "../sommaire.ts";

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
  assert.deepEqual(s.categories.map((c) => [c.id, c.nom, c.icone, c.outils, c.enrichis, c.libres]), [["cat1", "Cat1", "🧪", 3, 3, 2], ["cat2", "Cat2", "🧫", 3, 2, 1]]);
  assert.equal(s.categories[0]!.description, "Outils d'essai de la première catégorie, pour les tests.");
  assert.equal(s.categories[1]!.description, undefined);
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
test("statistiques: critères vérifiés (criteres_confirmes): confirmés, infirmés et indéterminés par critère et par statut", () => {
  const { confirmes } = calculerStatistiques(entree()).criteres;
  assert.equal(confirmes.outils, 4);
  assert.deepEqual(confirmes.sansVerdict, ["G"]);
  assert.deepEqual(cles(confirmes.modeles), { "gpt-6-astra": 4 });
  assert.deepEqual(confirmes.parSource.map((l) => l.source), ["libre", "partiel", "source-disponible", "proprietaire", "Ensemble"]);
  const ensemble = confirmes.parSource.at(-1)!;
  assert.equal(ensemble.outils, 4);
  assert.deepEqual(ensemble.parCritere, {
    donnees: { confirme: 2, infirme: 1, indetermine: 1 },
    controle: { confirme: 2, infirme: 1, indetermine: 1 },
    dependance: { confirme: 2, infirme: 0, indetermine: 2 },
  });
  const libre = confirmes.parSource.find((l) => l.source === "libre")!;
  assert.deepEqual([libre.outils, libre.parCritere.controle], [1, { confirme: 0, infirme: 1, indetermine: 0 }]);
  assert.equal(confirmes.autantQueEtoiles, 2);
  assert.equal(confirmes.identiquesEvaluation, 3);
});
test("statistiques: sans aucun criteres_confirmes, la section est vide", () => {
  const { confirmes } = calculerStatistiques(entree(OUTILS.map((o) => { const { criteres_confirmes: _c, ...reste } = o; return reste as typeof o; }))).criteres;
  assert.deepEqual([confirmes.outils, confirmes.parSource, confirmes.sansVerdict.length], [0, [], 5]);
});
test("statistiques et rendu: outils abandonnés après des échecs d'enrichissement répétés", () => {
  const st = calculerStatistiques(entree([outil("X", { echecs_enrichissement: 3 }), outil("Y", { echecs_enrichissement: 2 }), outil("Z")]));
  assert.deepEqual(st.enrichissement.abandonnes, ["X"]);
  const md = rendreMarkdown(st, { genereLe: GENERE_LE });
  assert.ok(md.includes("- Outils restant à enrichir : 3, dont 1 abandonné(s) après 3 échecs consécutifs d'enrichissement (X)."));
  assert.deepEqual(calculerStatistiques(entree()).enrichissement.abandonnes, []);
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

test("statistiques: nombre d'outils par catégorie et par statut du code source", () => {
  const { categoriesSources } = calculerStatistiques(entree());
  assert.equal(categoriesSources.reduce((n, r) => n + r.n, 0), 6);
  assert.deepEqual(categoriesSources.filter((r) => r.categorie === "cat2" && r.nom === "Cat2").map((r) => [r.source, r.n]).sort(), [["libre", 1], ["non enrichi", 1], ["proprietaire", 1]]);
});

const GRAPHIQUE = (id: string) => ({ id, titre: `Titre ${id}`, description: `Texte alternatif de ${id} [avec crochets].`, svg: `graphiques/${id}.svg` });
test("rendu: chaque image SVG est insérée dans la section du graphique, avec son texte alternatif", () => {
  const ids = ["statut-code-source", "categories-statut", "criteres-repertoire-enrichie", "criteres-par-statut", "criteres-verdicts", "licences", "forges", "tags", "enrichissement-jours"];
  const md = rendreMarkdown(calculerStatistiques(entree()), { genereLe: GENERE_LE, graphiques: ids.map(GRAPHIQUE) });
  for (const id of ids) {
    assert.ok(md.includes(`](graphiques/${id}.svg)`), id);
    assert.ok(md.includes(`![Texte alternatif de ${id} avec crochets.]`), `${id}: texte alternatif sans crochets`);
  }
  const section = (titre: string) => md.slice(md.indexOf(`## ${titre}`), md.indexOf("\n## ", md.indexOf(`## ${titre}`) + 3));
  assert.ok(section("Statut du code source").includes("statut-code-source.svg"));
  assert.ok(section("Catégories").includes("categories-statut.svg"));
  assert.ok(section("Licences").includes("licences.svg"));
  assert.ok(section("Forges de code").includes("forges.svg"));
  assert.ok(section("Tags").includes("tags.svg"));
  assert.ok(section("Critères de souveraineté").includes("criteres-repertoire-enrichie.svg") && section("Critères de souveraineté").includes("criteres-par-statut.svg"));
  assert.ok(section("Critères de souveraineté").includes("criteres-verdicts.svg"));
  assert.ok(section("Dates").includes("enrichissement-jours.svg"));
  assert.doesNotMatch(md, /\.png/); // plus aucun PNG
});
test("rendu: les critères vérifiés ont leur sous-section, avec les trois verdicts par statut, le modèle et les outils sans verdict", () => {
  const md = rendreMarkdown(calculerStatistiques(entree()), { genereLe: GENERE_LE });
  const section = md.slice(md.indexOf("### Critères vérifiés"), md.indexOf("\n## ", md.indexOf("### Critères vérifiés")));
  assert.match(section, /citation/);
  assert.match(section, /\| Libre \| 1 \| 1 \/ 0 \/ 0 \| 0 \/ 1 \/ 0 \| 1 \/ 0 \/ 0 \|/);
  assert.match(section, /\| Ensemble \| 4 \| 2 \/ 1 \/ 1 \| 2 \/ 1 \/ 1 \| 2 \/ 0 \/ 2 \|/);
  assert.match(section, /gpt-6-astra/);
  assert.match(section, /sans verdict[^\n]*G/);
  assert.match(section, /\*\*2\*\* outil\(s\) sur 4 ont autant de critères confirmés que d'étoiles/);
  const sans = rendreMarkdown(calculerStatistiques(entree(OUTILS.map((o) => { const { criteres_confirmes: _c, ...reste } = o; return reste as typeof o; }))), { genereLe: GENERE_LE });
  assert.match(sans, /### Critères vérifiés[\s\S]*?\*Aucun critère n'a encore été vérifié/);
});
test("rendu: sans graphiques, aucune image; l'image précède son tableau", () => {
  const sans = rendreMarkdown(calculerStatistiques(entree()), { genereLe: GENERE_LE });
  assert.doesNotMatch(sans, /!\[/);
  const avec = rendreMarkdown(calculerStatistiques(entree()), { genereLe: GENERE_LE, graphiques: [GRAPHIQUE("statut-code-source")] });
  assert.ok(avec.indexOf("statut-code-source.svg") < avec.indexOf("| Statut | Outils |"));
  assert.doesNotMatch(avec, /undefined|NaN|\[object/);
});

// ---------- genererSommaire (avec un faux générateur et un faux convertisseur: ni réseau, ni vl-convert) ----------

const PARAS = { paragraphes: [PARA, PARA, PARA] };
const dossierDeDonnees = () => {
  const d = mkdtempSync(join(tmpdir(), "sommaire-"));
  ecrireFichier(join(d, "outils.json"), "outils", OUTILS, null, "2026-11-11T16:00:00-05:00");
  ecrireFichier(join(d, "tags.json"), "tags", TAGS, null, "2026-11-11T16:00:00-05:00");
  ecrireFichier(join(d, "criteres.json"), "criteres", CRITERES, null, "2026-11-11T16:00:00-05:00");
  ecrireFichier(join(d, "categories.json"), "categories", CATEGORIES, null, "2026-11-11T16:00:00-05:00");
  return d;
};
const fauxConvertir = (appels: string[]) => (_spec: unknown, svg: string) => {
  appels.push(svg);
  writeFileSync(svg, "<svg/>");
};

test("genererSommaire: écrit sommaire.md avec le résumé et les images, et graphiques/ à côté", async () => {
  const d = dossierDeDonnees();
  const converties: string[] = [];
  const r = await genererSommaire({ source: join(d, "outils.json"), generer: async () => PARAS, convertir: fauxConvertir(converties), modele: "gpt-test" });
  assert.equal(r.ecrit, true);
  assert.equal(r.resume, "oui");
  assert.equal(r.destination, join(d, "sommaire.md"));
  const md = readFileSync(join(d, "sommaire.md"), "utf8");
  assert.match(md, /## Résumé/);
  assert.ok(md.includes(PARA));
  assert.match(md, /gpt-test/);
  assert.match(md, /!\[.*\]\(graphiques\/statut-code-source\.svg\)/);
  assert.equal(r.graphiques, converties.length);
  assert.ok(existsSync(join(d, "graphiques", "statut-code-source.svg")));
  assert.equal(readdirSync(join(d, "graphiques")).some((f) => f.endsWith(".png")), false);
});
test("genererSommaire: sans résumé, le générateur n'est pas appelé; sans graphiques, le convertisseur non plus", async () => {
  const d = dossierDeDonnees();
  let generations = 0;
  const converties: string[] = [];
  const r = await genererSommaire({ source: join(d, "outils.json"), sansResume: true, sansGraphiques: true, generer: async () => (generations++, PARAS), convertir: fauxConvertir(converties) });
  assert.equal(generations, 0);
  assert.equal(converties.length, 0);
  assert.equal(r.resume, "non");
  assert.equal(r.graphiques, 0);
  assert.equal(existsSync(join(d, "graphiques")), false);
  assert.doesNotMatch(readFileSync(join(d, "sommaire.md"), "utf8"), /## Résumé|!\[/);
});
test("genererSommaire: une clé API absente est refusée avant tout travail, sauf sans résumé", async () => {
  const d = dossierDeDonnees();
  await assert.rejects(genererSommaire({ source: join(d, "outils.json"), sansGraphiques: true }), /OPENAI_API_KEY absente/);
  assert.equal(existsSync(join(d, "sommaire.md")), false);
  assert.equal((await genererSommaire({ source: join(d, "outils.json"), sansGraphiques: true, sansResume: true })).ecrit, true);
});
test("genererSommaire: résumé impossible, comportement par défaut: sommaire écrit avec une note, résultat « echec »", async () => {
  const d = dossierDeDonnees();
  const r = await genererSommaire({ source: join(d, "outils.json"), generer: async () => ({ paragraphes: [] }), convertir: fauxConvertir([]) });
  assert.equal(r.ecrit, true);
  assert.equal(r.resume, "echec");
  assert.match(r.erreur!, /3 ou 4/);
  assert.match(readFileSync(join(d, "sommaire.md"), "utf8"), /n'a pas pu être rédigé/);
});
test("genererSommaire: résumé impossible avec conserverSiEchec: rien n'est écrit, le sommaire existant et les graphiques sont conservés", async () => {
  const d = dossierDeDonnees();
  writeFileSync(join(d, "sommaire.md"), "ancien sommaire");
  const converties: string[] = [];
  const r = await genererSommaire({ source: join(d, "outils.json"), conserverSiEchec: true, generer: async () => { throw new Error("OpenAI HTTP 500"); }, convertir: fauxConvertir(converties) });
  assert.equal(r.ecrit, false);
  assert.equal(r.resume, "echec");
  assert.match(r.erreur!, /HTTP 500/);
  assert.equal(readFileSync(join(d, "sommaire.md"), "utf8"), "ancien sommaire");
  assert.equal(converties.length, 0);
  assert.equal(existsSync(join(d, "graphiques")), false);
});
test("genererSommaire: une réponse invalide puis valide est acceptée, la raison du rejet est journalisée", async () => {
  const d = dossierDeDonnees();
  const reponses = [{ paragraphes: [PARA] }, PARAS];
  const journal: string[] = [];
  const r = await genererSommaire({ source: join(d, "outils.json"), sansGraphiques: true, generer: async () => reponses.shift(), journal: (m) => journal.push(m) });
  assert.equal(r.resume, "oui");
  assert.match(journal[0]!, /Résumé rejeté \(3 ou 4 paragraphes attendus\)/);
});
test("genererSommaire: destination personnalisée, graphiques/ créé à côté", async () => {
  const d = dossierDeDonnees();
  const sortie = join(d, "ailleurs.md");
  await genererSommaire({ source: join(d, "outils.json"), sortie, sansResume: true, convertir: fauxConvertir([]) });
  assert.ok(existsSync(sortie));
  assert.ok(existsSync(join(d, "graphiques", "statut-code-source.svg")));
});
