// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { ajouterOutil, outilDemande, parametresDepuisArgs, sourceDemandee, type ParametresAjout } from "../ajouter.ts";
import type { OutilClasse } from "../classify.ts";
import { ecrireFichier, lireFichier } from "../fichiers.ts";
import type { Source } from "../sources.ts";
import { CATEGORIES, META, OUTILS, SOURCES, TAGS } from "../../commun/test/donnees-fictives.ts";

const T = "2026-11-13T10:00:00-05:00";
const p: ParametresAjout = {
  lien: "https://planete.facil.example/", nom: "Planète FACiLe", categorie: "cat1", description: "Agrégateur de flux auto-hébergé, libre, hébergé au Québec.", source: "facil",
  alternative_a: ["https://feedly.example/", "https://inoreader.example/"],
};

test("sourceDemandee: source connue réutilisée; source nouvelle bâtie des paramètres (extracteur manuel), sinon erreur explicite", () => {
  assert.deepEqual(sourceDemandee(SOURCES, p), { source: SOURCES[1], nouvelle: false });
  assert.throws(() => sourceDemandee([SOURCES[0]!], p), /absente de sources\.json.*--source-nom/);
  const { source, nouvelle } = sourceDemandee([], { ...p, sourceNom: "FACiL", sourceUrl: "https://facil.example/", sourcePdc: "https://facil.example/pdc/", soumisParNom: "Robin", soumisParEmail: "robin@example.com" });
  assert.equal(nouvelle, true);
  assert.deepEqual(source, { id: "facil", nom: "FACiL", url: "https://facil.example/", extracteur: "manuel", pdc: "https://facil.example/pdc/", soumis_par: { nom: "Robin", email: "robin@example.com" } });
  assert.throws(() => sourceDemandee([], { ...p, sourceNom: "FACiL", sourceUrl: "https://facil.example/", soumisParNom: "Robin", soumisParEmail: "robin" }), /email/);
});

test("outilDemande: outil nouveau, daté, classé par seuil avec score_estime quand la source ne donne pas d'étoiles; score donné sinon", () => {
  const o = outilDemande(p, OUTILS, CATEGORIES, T);
  assert.equal(o.changement, "nouveau");
  assert.equal(o.derniere_modification, T);
  assert.equal(o.source_repertoire_id, "facil");
  assert.equal(o.score_estime, true);
  assert.equal(o.score, o.criteres.length);
  assert.equal(o.confiance, "indéterminée");
  assert.deepEqual(o.alternative_a, ["https://feedly.example/", "https://inoreader.example/"]);
  const avecScore = outilDemande({ ...p, score: 3 }, OUTILS, CATEGORIES, T);
  assert.equal(avecScore.score, 3);
  assert.equal(avecScore.score_estime, undefined);
  assert.equal(avecScore.criteres.length, 3);
});
test("outilDemande: lien, nom, description, catégorie connue, nom libre, score 0 à 3 et alternatives en URL sont vérifiés", () => {
  assert.throws(() => outilDemande({ ...p, lien: "planete.facil" }, OUTILS, CATEGORIES, T), /lien/);
  assert.throws(() => outilDemande({ ...p, nom: " " }, OUTILS, CATEGORIES, T), /--nom/);
  assert.throws(() => outilDemande({ ...p, description: "" }, OUTILS, CATEGORIES, T), /--description/);
  assert.throws(() => outilDemande({ ...p, categorie: "inconnue" }, OUTILS, CATEGORIES, T), /catégorie « inconnue »/);
  assert.throws(() => outilDemande({ ...p, nom: "A" }, OUTILS, CATEGORIES, T), /existe déjà/);
  assert.throws(() => outilDemande({ ...p, score: 4 }, OUTILS, CATEGORIES, T), /--score/);
  assert.throws(() => outilDemande({ ...p, alternative_a: ["feedly"] }, OUTILS, CATEGORIES, T), /alternative/);
});

const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "ajouter-"));
  ecrireFichier(join(d, "outils.json"), "outils", OUTILS, null, META.created_at);
  ecrireFichier(join(d, "categories.json"), "categories", CATEGORIES, null, META.created_at);
  ecrireFichier(join(d, "tags.json"), "tags", TAGS, null, META.created_at);
  ecrireFichier(join(d, "sources.json"), "sources", [SOURCES[0]!], null, META.created_at);
  return d;
};

test("ajouterOutil: un outil ajouté qui est le logiciel d'un service existant reçoit voir_aussi, et le service aussi", () => {
  const d = dossier();
  const f = join(d, "outils.json");
  const lu = lireFichier<OutilClasse>(f, "outils");
  ecrireFichier(f, "outils", [...lu.donnees, { ...lu.donnees[0]!, nom: "Jasette FACiLe", lien: "https://jasette.facil.example/", source_repertoire_id: "facil", instance_de: { nom: "Mastodon", url: "https://github.com/mastodon/mastodon" } }], lu, T);
  const r = ajouterOutil(f, { ...p, nom: "Mastodon", lien: "https://joinmastodon.example/", source: "praxis" }, T);
  assert.deepEqual(r.outil.voir_aussi, ["Jasette FACiLe"]);
  const outils = lireFichier<OutilClasse>(f, "outils").donnees;
  assert.deepEqual(outils.find((o) => o.nom === "Jasette FACiLe")!.voir_aussi, ["Mastodon"]);
  assert.deepEqual(outils.at(-1)!.voir_aussi, ["Jasette FACiLe"]);
});
test("ajouterOutil: écrit l'outil à la fin de outils.json et la source nouvelle dans sources.json; un second ajout de même nom est refusé", () => {
  const d = dossier();
  const r = ajouterOutil(join(d, "outils.json"), { ...p, sourceNom: "FACiL", sourceUrl: "https://facil.example/" }, T);
  assert.equal(r.nouvelleSource, true);
  const outils = lireFichier<OutilClasse>(join(d, "outils.json"), "outils");
  assert.equal(outils.donnees.length, OUTILS.length + 1);
  assert.deepEqual(outils.donnees.at(-1), r.outil);
  assert.equal(outils.meta.updated_at, T);
  assert.deepEqual(lireFichier<Source>(join(d, "sources.json"), "sources").donnees.map((s) => s.id), ["praxis", "facil"]);
  assert.throws(() => ajouterOutil(join(d, "outils.json"), p, T), /existe déjà/);
  assert.throws(() => ajouterOutil(join(d, "absent", "outils.json"), p, T), /absent: lancer/);
});

test("parametresDepuisArgs: options --cle=valeur, lien et fichier positionnels, requis vérifiés, option inconnue refusée", () => {
  const { parametres, fichier } = parametresDepuisArgs(["https://x.example/", "--nom=X", "--categorie=cat1", "--description=Un outil = libre", "--source=facil", "--score=2", "--alternative-a=https://a.example/, https://b.example/", "--source-nom=FACiL", "--source-url=https://facil.example/", "--soumis-par-nom=Robin", "autre/outils.json"]);
  assert.equal(fichier, "autre/outils.json");
  assert.equal(parametres.description, "Un outil = libre");
  assert.equal(parametres.score, 2);
  assert.deepEqual(parametres.alternative_a, ["https://a.example/", "https://b.example/"]);
  assert.equal(parametres.soumisParNom, "Robin");
  assert.throws(() => parametresDepuisArgs(["--nom=X"]), /Usage/);
  assert.throws(() => parametresDepuisArgs(["https://x.example/", "--nom=X"]), /--categorie requis/);
  assert.throws(() => parametresDepuisArgs(["https://x.example/", "--nom=X", "--bogus=1"]), /Option inconnue: --bogus/);
});

test("CLI: ajoute un outil et dit comment l'enrichir; une erreur donne le code 1 et un message « Erreur: »", () => {
  const d = dossier();
  const f = join(d, "outils.json");
  const ok = spawnSync("nub", [resolve("ajouter.ts"), "https://planete.facil.example/", "--nom=Planète FACiLe", "--categorie=cat1", "--description=Agrégateur de flux libre.", "--source=facil", "--source-nom=FACiL", "--source-url=https://facil.example/", f], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Planète FACiLe ajouté .*source facil, créée.*score estimé .*node packages\/scripts\/update\.ts/);
  const non = spawnSync("nub", [resolve("ajouter.ts"), "https://x.example/", "--nom=X", "--categorie=zzz", "--description=d", "--source=facil", f], { encoding: "utf8" });
  assert.equal(non.status, 1);
  assert.match(non.stderr, /^Erreur: catégorie « zzz »/);
});
