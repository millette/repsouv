// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import type { OutilClasse } from "../classify.ts";
import { ALTERNATIVES, CATEGORIE_PAR_LOGICIEL, extraireFacil, SOURCE_FACIL, synchroniserFacil, telechargerFacil } from "../extract-facil.ts";
import { USER_AGENT } from "../agent.ts";
import { ecrireFichier, lireFichier } from "../fichiers.ts";
import { problemesSource, type Source } from "../sources.ts";
import { CATEGORIES, META, OUTILS, outil, SOURCES, TAGS } from "../../commun/test/donnees-fictives.ts";

const service = (nom: string, url: string, description: string, logiciel: string, depot: string, remplace: string) => `
<div class="un-service">
  <p><a href="${url}" title="${nom}"><i class="sprite"></i></a><br><span style="font-size:110%;"><a href="${url}">${nom}</a></span></p>
  <p>${description}</p>
  <p> Est une instance de&#160;: <a href="${depot}">${logiciel}</a><br>
    Remplace&#160;: ${remplace}<br>
    <span style="font-size:110%;"><a href="https://code.facil.services/x/issues">Rapporter un problème</a></span>
  </p>
</div>`;
const PAGE = `<html><body><section id="prod" class="grille">
${service("Planète FACiLe", "https://planete.facil.qc.ca/", "Agrégateur de blogues libre et auto-hébergé pour les membres de FACiL.", "BilboPlanet", "https://github.com/theclimber/Bilboplanet", "Feedly, Inoreader")}
${service("Dates FACiLes", "https://date.facil.services/", "Planifier des rendez-vous.", "Framadate", "https://framagit.org/framasoft/framadate/framadate/tags/1.1.19", "Doodle, Calendly")}
${service("Forums du libre du Québec", "https://forumsdulibre.quebec/", "Discuter du libre de manière civilisée.", "Discourse", "https://github.com/discourse/discourse/commits/abc", "Groupes Facebook ou Google")}
</section></body></html>`;

test("SOURCE_FACIL est une source valide, d'extracteur facil, avec pdc et donnees", () => {
  assert.deepEqual(problemesSource(SOURCE_FACIL), []);
  assert.equal(SOURCE_FACIL.extracteur, "facil");
  assert.equal(SOURCE_FACIL.pdc, "https://facil.services/pdc/");
  assert.equal(SOURCE_FACIL.donnees, "https://facil.services/donnees/");
});

test("extraireFacil: un outil par service avec nom, lien, description, instance_de, alternative_a (URL des services remplacés), catégorie par logiciel, score estimé par seuil", () => {
  const { outils, source, avertissements } = extraireFacil(PAGE);
  assert.equal(source.id, "facil");
  assert.deepEqual(outils.map((o) => o.nom), ["Planète FACiLe", "Dates FACiLes", "Forums du libre du Québec"]);
  const planete = outils[0]!;
  assert.equal(planete.lien, "https://planete.facil.qc.ca/");
  assert.equal(planete.description, "Agrégateur de blogues libre et auto-hébergé pour les membres de FACiL.");
  assert.deepEqual(planete.instance_de, { nom: "BilboPlanet", url: "https://github.com/theclimber/Bilboplanet" });
  assert.deepEqual(planete.alternative_a, ["https://feedly.com/", "https://www.inoreader.com/"]);
  assert.equal(planete.categorie, "veille-et-gestion-de-l-information");
  assert.equal(planete.source_repertoire_id, "facil");
  assert.equal(planete.score_estime, true);
  assert.equal(planete.score, planete.criteres.length);
  assert.equal(planete.confiance, "indéterminée");
  assert.equal(planete.changement, null);
  assert.deepEqual(outils[2]!.alternative_a, ["https://www.facebook.com/groups/", "https://groups.google.com/"]);
  assert.deepEqual(avertissements, ["Dates FACiLes: service remplacé inconnu « Calendly » (à ajouter à ALTERNATIVES dans extract-facil.ts)"]);
  assert.deepEqual(outils[1]!.alternative_a, ["https://doodle.com/"]);
});
test("extraireFacil: page sans service, logiciel sans catégorie connue, noms en double: erreurs explicites", () => {
  assert.throws(() => extraireFacil("<html><body></body></html>"), /aucun service/);
  assert.throws(() => extraireFacil(`<div>${service("X", "https://x.example/", "d", "LogicielInconnu", "https://g.example/", "Y")}</div>`), /sans catégorie .*X \(instance de « LogicielInconnu »\)/);
  assert.throws(() => extraireFacil(`<div>${service("X", "https://x.example/", "d", "Discourse", "https://g.example/", "")}${service("X", "https://y.example/", "d", "Discourse", "https://g.example/", "")}</div>`), /même nom/);
});
test("les tables de l'extracteur renvoient à des catégories et des URL valides", () => {
  const ids = new Set(CATEGORIES.map((c) => c.id));
  // Les identifiants réels viennent de categories.json du dépôt; les fictifs servent seulement à vérifier la forme.
  for (const id of Object.values(CATEGORIE_PAR_LOGICIEL)) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  for (const url of Object.values(ALTERNATIVES).flat()) assert.match(url, /^https:\/\/\S+$/);
  assert.ok(ids.size > 0);
});

const dossier = (outils: OutilClasse[] = OUTILS) => {
  const d = mkdtempSync(join(tmpdir(), "facil-"));
  ecrireFichier(join(d, "outils.json"), "outils", outils, null, META.created_at);
  ecrireFichier(join(d, "categories.json"), "categories", CATEGORIES, null, META.created_at);
  ecrireFichier(join(d, "tags.json"), "tags", TAGS, null, META.created_at);
  ecrireFichier(join(d, "sources.json"), "sources", [SOURCES[0]!], null, META.created_at);
  return d;
};
const T1 = "2026-11-13T10:00:00-05:00";
const T2 = "2026-11-14T10:00:00-05:00";

test("synchroniserFacil: ajoute les services comme nouveaux (datés de la lecture) sans toucher aux outils Praxis, écrit la source; un second passage inchangé n'écrit rien; un service disparu est retiré", () => {
  const d = dossier();
  const f = join(d, "outils.json");
  const r = synchroniserFacil(f, PAGE, T1);
  assert.deepEqual(r.resume.nouveau, ["Planète FACiLe", "Dates FACiLes", "Forums du libre du Québec"]);
  assert.equal(r.ecrit, true);
  assert.equal(r.sourcesEcrites, true);
  const outils = lireFichier<OutilClasse>(f, "outils").donnees;
  assert.equal(outils.length, OUTILS.length + 3);
  assert.deepEqual(outils.slice(0, OUTILS.length).map((o) => o.nom), OUTILS.map((o) => o.nom), "les outils Praxis restent en tête, inchangés");
  const planete = outils.find((o) => o.nom === "Planète FACiLe")!;
  assert.equal(planete.derniere_modification, T1);
  assert.equal(planete.changement, "nouveau");
  assert.equal(planete.confiance, "indéterminée", "la classification de l'extracteur est conservée");
  assert.deepEqual(lireFichier<Source>(join(d, "sources.json"), "sources").donnees.map((s) => s.id), ["praxis", "facil"]);
  const s = synchroniserFacil(f, PAGE, T2);
  assert.equal(s.ecrit, false);
  assert.equal(s.sourcesEcrites, false);
  const moins = synchroniserFacil(f, PAGE.replace(/<div class="un-service">\s*<p><a href="https:\/\/date\.facil[\s\S]*?<\/div>/, ""), T2);
  assert.deepEqual(moins.resume.retrait, ["Dates FACiLes"]);
  assert.equal(lireFichier<OutilClasse>(f, "outils").donnees.find((o) => o.nom === "Dates FACiLes")!.removed, true);
  assert.throws(() => synchroniserFacil(join(d, "absent", "outils.json"), PAGE, T1), /absent: lancer/);
});

test("synchroniserFacil: voir_aussi relie un service à l'outil d'une autre source qui est le même logiciel", () => {
  const d = dossier([...OUTILS, outil("Discourse")]);
  const f = join(d, "outils.json");
  synchroniserFacil(f, PAGE, T1);
  const outils = lireFichier<OutilClasse>(f, "outils").donnees;
  assert.deepEqual(outils.find((o) => o.nom === "Discourse")!.voir_aussi, ["Forums du libre du Québec"]);
  assert.deepEqual(outils.find((o) => o.nom === "Forums du libre du Québec")!.voir_aussi, ["Discourse"]);
  assert.equal(outils.find((o) => o.nom === "Planète FACiLe")!.voir_aussi, undefined);
});
test("synchroniserFacil: un outil au score estimé déjà enrichi garde le score de l'évaluation enrichie et n'est pas marqué modifié pour autant", () => {
  const d = dossier();
  const f = join(d, "outils.json");
  synchroniserFacil(f, PAGE, T1);
  const lu = lireFichier<OutilClasse>(f, "outils");
  const enrichis = lu.donnees.map((o) => (o.nom === "Planète FACiLe" ? { ...o, score: 3, criteres: ["donnees", "controle", "dependance"], confiance: "élevée", description_longue: "Longue.", tags: ["gratuit"], source: "libre", licence: "MIT", custom_license: null, custom_license_url: null, repo: "https://github.com/theclimber/Bilboplanet", evaluation_enrichie: { score: 3, criteres: ["donnees", "controle", "dependance"], confiance: "élevée" }, enrichi_le: T1 } : o)) as OutilClasse[];
  ecrireFichier(f, "outils", enrichis, lu, T1);
  const r = synchroniserFacil(f, PAGE, T2);
  assert.deepEqual(r.resume.modification, []);
  const planete = lireFichier<OutilClasse>(f, "outils").donnees.find((o) => o.nom === "Planète FACiLe")!;
  assert.equal(planete.score, 3);
  assert.equal(planete.description_longue, "Longue.");
  const change = synchroniserFacil(f, PAGE.replace("Agrégateur de blogues libre", "Agrégateur de blogues"), T2);
  assert.deepEqual(change.resume.modification, ["Planète FACiLe"]);
  const apres = lireFichier<OutilClasse>(f, "outils").donnees.find((o) => o.nom === "Planète FACiLe")!;
  assert.equal(apres.score, 3, "le score aligné sur l'évaluation enrichie survit à une modification de la page");
  assert.equal(apres.description_longue, "Longue.");
});

test("telechargerFacil: en-tête de navigateur, erreur HTTP refusée", async () => {
  const requetes: { url: string; ua: string }[] = [];
  const telecharger = (async (url: string, init: { headers: Record<string, string> }) => { requetes.push({ url, ua: init.headers["user-agent"]! }); return { ok: true, status: 200, text: async () => PAGE }; }) as unknown as typeof fetch;
  assert.equal(await telechargerFacil(undefined, telecharger), PAGE);
  assert.equal(requetes[0]!.url, "https://facil.services/");
  assert.equal(requetes[0]!.ua, USER_AGENT);
  await assert.rejects(telechargerFacil("https://x.example/", (async () => ({ ok: false, status: 403 })) as unknown as typeof fetch), /HTTP 403/);
});

test("CLI: --fichier lit une copie locale, synchronise et dit d'enrichir; une option inconnue est refusée", () => {
  const d = dossier();
  const page = join(d, "page.html");
  writeFileSync(page, PAGE);
  const ok = spawnSync("nub", [resolve("extract-facil.ts"), `--fichier=${page}`, join(d, "outils.json")], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Source facil \(.*page\.html\)/);
  assert.match(ok.stdout, /nouveau/i);
  assert.match(ok.stdout, /node update\.ts/);
  assert.match(ok.stderr, /Avertissement: Dates FACiLes: service remplacé inconnu « Calendly »/);
  const non = spawnSync("nub", [resolve("extract-facil.ts"), "--bogus", join(d, "outils.json")], { encoding: "utf8" });
  assert.equal(non.status, 1);
  assert.match(non.stderr, /^Erreur: Option inconnue: --bogus/);
});
