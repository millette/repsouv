// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Le calcul des statistiques, sur des données fictives: ni outils.json, ni réseau, ni disque.
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculerStatistiques, familleLicence, forgeDe } from "../statistiques.ts";
import { D0, D1, entree, enrichi, outil, OUTILS, SOURCES } from "./donnees-fictives.ts";

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
test("statistiques: nombre d'outils par catégorie et par statut du code source", () => {
  const { categoriesSources } = calculerStatistiques(entree());
  assert.equal(categoriesSources.reduce((n, r) => n + r.n, 0), 6);
  assert.deepEqual(categoriesSources.filter((r) => r.categorie === "cat2" && r.nom === "Cat2").map((r) => [r.source, r.n]).sort(), [["libre", 1], ["non enrichi", 1], ["proprietaire", 1]]);
});
test("statistiques: provenance par source (noms de sources.json), scores estimés, alternatives et Open Hub (complétés triés par contributeurs, restants, abandonnés, activité)", () => {
  const oh = (nom: string, contributeurs: number, activite: string | null) => enrichi(nom, { openhub_id: nom.toLowerCase(), openhub: { organisation: null, activite, licences: ["MIT"], langage_principal: "Go", lignes_de_code: 10, contributeurs_total: 50, contributeurs_12_mois: contributeurs, commits_12_mois: 100, premier_mois: "2020-01-01", dernier_mois: "2026-11-01", consulte_le: "2026-11-13T10:00:00-05:00" } });
  const outils = [...OUTILS, oh("H1", 5, "High"), oh("H2", 40, "High"), enrichi("Facil", { source_repertoire_id: "facil", score_estime: true, alternative_a: ["https://feedly.example/"] }), enrichi("Fin", { echecs_openhub: 3 })];
  const s = calculerStatistiques(entree(outils, SOURCES));
  assert.deepEqual(s.provenance, [{ id: "praxis", nom: "Praxis", outils: 9, enrichis: 8 }, { id: "facil", nom: "FACiL", outils: 1, enrichis: 1 }]);
  assert.deepEqual(s.scoresEstimes, ["Facil"]);
  assert.deepEqual(s.alternatives, [{ nom: "Facil", alternatives: ["https://feedly.example/"] }]);
  assert.deepEqual(s.openhub.completes.map((o) => [o.nom, o.contributeurs12]), [["H2", 40], ["H1", 5]]);
  assert.deepEqual(s.openhub.activite, [{ cle: "High", n: 2 }]);
  assert.deepEqual(s.openhub.abandonnes, ["Fin"]);
  assert.ok(s.openhub.restants.includes("A") && !s.openhub.restants.includes("C") && !s.openhub.restants.includes("Fin"), s.openhub.restants.join());
  assert.equal(calculerStatistiques(entree()).provenance[0]!.nom, "praxis", "sans sources.json, l'identifiant sert de nom");
});
