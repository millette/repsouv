// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  abandonne, aEnrichir, chargerTags, EFFORT_PAR_DEFAUT, effortDepuisEnv, enrichirOutils, ErreurDefinitive, modelesDepuisEnv, MODELE_PAR_DEFAUT, MODELE_REPLI_PAR_DEFAUT, obtenirValide, extraireContenu, instructions, instructionsEcart, lireContenu, MAX_TAGS, MIN_EXTRAIT, obtenirPage, problemesMarkdown, resumePage, sauverTags,
  schemaReponse, validerEcart, validerProposition, type Expliqueur, type Generateur, type Tag, appelerOpenAI, estimerCoutEnrichissement } from "../enrichir.ts";
import type { Usage } from "../prix.ts";
import type { Outil } from "../extract.ts";
import type { OutilClasse } from "../classify.ts";
import { CRITERES } from "./donnees-fictives.ts";

const VOCAB: Tag[] = [
  { id: "chiffrement", description: "Chiffre." },
  { id: "gratuit", description: "Gratuit." },
  { id: "automatisation", description: "Automatise." },
];
const evaluation = (extra: Record<string, unknown> = {}) => ({ score: 2, criteres: ["donnees", "dependance"], confiance: "moyenne", ...extra });
const valide = (extra: Record<string, unknown> = {}) => ({
  description_longue: "Une description.", tags: ["gratuit"], source: "libre",
  licence: "MIT", custom_license: null, custom_license_url: null, repo: "https://github.com/x/y",
  evaluation_enrichie: evaluation(), nouveaux_tags: [], ...extra,
});
const outil = (nom: string, extra: Partial<Outil> = {}): Outil => ({
  categorie: "c", nom, score: 2, lien: `https://${nom}.example/`,
  description: "d", derniere_modification: "2026-11-05T09:53", changement: null, source_repertoire_id: "praxis", ...extra,
});
const sansPage = async () => null;
const pageOk = async () => ({ titre: "T", meta_description: "", extrait: "x".repeat(MIN_EXTRAIT), liens_depot: [] });
const expliquerOk: Expliqueur = async () => ({ ecart: "Le répertoire ne précise pas l'hébergement." });

test("validation: une proposition correcte est acceptée", () => {
  assert.deepEqual(validerProposition(valide(), VOCAB, false).tags, ["gratuit"]);
});
test("validation: plus de 5 tags est rejeté", () => {
  const six = Array.from({ length: MAX_TAGS + 1 }, (_, i) => `t${i}`);
  const vocab = [...VOCAB, ...six.map((id) => ({ id, description: id }))];
  assert.throws(() => validerProposition(valide({ tags: six }), vocab, false), /1 à 5 tags/);
});
test("validation: aucun tag est rejeté", () => {
  assert.throws(() => validerProposition(valide({ tags: [] }), VOCAB, false), /1 à 5 tags/);
});
test("validation: un tag hors vocabulaire est rejeté", () => {
  assert.throws(() => validerProposition(valide({ tags: ["inconnu"] }), VOCAB, false), /hors vocabulaire/);
});
test("validation: un nouveau tag est refusé sans l'option", () => {
  const nt = { id: "nouveau", description: "d", justification: "j" };
  assert.throws(() => validerProposition(valide({ tags: ["nouveau"], nouveaux_tags: [nt] }), VOCAB, false), /non autorisés/);
});
test("validation: un nouveau tag exige une justification", () => {
  const nt = { id: "nouveau", description: "d", justification: " " };
  assert.throws(() => validerProposition(valide({ tags: ["nouveau"], nouveaux_tags: [nt] }), VOCAB, true), /justification/);
});
test("validation: un nouveau tag doit déjà ne pas exister et être utilisé", () => {
  const dup = { id: "gratuit", description: "d", justification: "j" };
  assert.throws(() => validerProposition(valide({ nouveaux_tags: [dup] }), VOCAB, true), /existe déjà/);
  const inutilise = { id: "nouveau", description: "d", justification: "j" };
  assert.throws(() => validerProposition(valide({ nouveaux_tags: [inutilise] }), VOCAB, true), /n'est utilisé/);
});
test("validation: un nouveau tag justifié, même pour un seul outil, est accepté", () => {
  const nt = { id: "nouveau", description: "d", justification: "Aucun tag existant ne couvre X." };
  const p = validerProposition(valide({ tags: ["gratuit", "nouveau"], nouveaux_tags: [nt] }), VOCAB, true);
  assert.deepEqual(p.nouveaux_tags, [nt]);
});
test("validation: un logiciel propriétaire n'a ni licence ni repo", () => {
  assert.throws(() => validerProposition(valide({ source: "proprietaire" }), VOCAB, false), /propriétaire/);
  assert.equal(validerProposition(valide({ source: "proprietaire", licence: null, repo: null }), VOCAB, false).repo, null);
});
test("validation: le repo peut être sur n'importe quelle forge mais doit être une URL http(s)", () => {
  assert.equal(validerProposition(valide({ repo: "https://codeberg.org/a/b" }), VOCAB, false).repo, "https://codeberg.org/a/b");
  assert.throws(() => validerProposition(valide({ repo: "git@github.com:a/b" }), VOCAB, false), /repo/);
});

test("schéma: l'enum des tags est le vocabulaire et tous les champs sont requis", () => {
  const s = schemaReponse(VOCAB, false) as any;
  assert.deepEqual(s.properties.tags.items.enum, ["chiffrement", "gratuit", "automatisation"]);
  assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort());
  assert.equal("nouveaux_tags" in s.properties, false);
  assert.equal("nouveaux_tags" in (schemaReponse(VOCAB, true) as any).properties, true);
});

test("extraireContenu: trouve les dépôts sur plusieurs forges et ignore les scripts", () => {
  const html = `<html><head><title>T</title><meta name="description" content="M"></head><body>
    <script>var secret = 1</script><a href="https://github.com/a/b/issues">gh</a>
    <a href="https://codeberg.org/c/d">cb</a><a href="/rel">r</a><p>Bonjour</p></body></html>`;
  const c = extraireContenu(html, "https://outil.example/");
  assert.deepEqual(c.liens_depot, ["https://github.com/a/b", "https://codeberg.org/c/d"]);
  assert.equal(c.titre, "T");
  assert.equal(c.meta_description, "M");
  assert.ok(!c.extrait.includes("secret"));
});

test("enrichir: ne touche jamais un outil qui a déjà une description longue ni un outil retiré", async () => {
  const outils = [outil("a", { description_longue: "existante" }), outil("b", { removed: true }), outil("c")];
  let appels = 0;
  const generer: Generateur = async () => (appels++, valide());
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer, lire: pageOk });
  assert.deepEqual(r.enrichis, ["c"]);
  assert.equal(appels, 1);
  assert.equal(outils[0]!.description_longue, "existante");
  assert.equal(aEnrichir(outils[1]!), false);
});
test("enrichir: un second passage n'appelle plus le générateur", async () => {
  const outils = [outil("a")];
  let appels = 0;
  const generer: Generateur = async () => (appels++, valide());
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer, lire: pageOk });
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer, lire: pageOk });
  assert.equal(appels, 1);
});
test("enrichir: sauvegarde après chaque outil enrichi", async () => {
  const outils = [outil("a"), outil("b")];
  let sauvegardes = 0;
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire: pageOk, apresChaque: () => sauvegardes++ });
  assert.deepEqual(r.enrichis, ["a", "b"]);
  assert.equal(sauvegardes, 2);
});
test("enrichir: chaque échec incrémente echecs_enrichissement et est sauvegardé; après 3 échecs consécutifs, l'outil n'est plus tenté", async () => {
  const outils = [outil("a")];
  let appels = 0, sauvegardes = 0;
  const options = { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: (async () => (appels++, valide())) as Generateur, lire: async () => null, apresChaque: () => sauvegardes++ };
  for (const attendu of [1, 2, 3]) {
    const r = await enrichirOutils(outils, options);
    assert.equal(r.erreurs.length, 1);
    assert.equal(outils[0]!.echecs_enrichissement, attendu);
    assert.deepEqual(r.abandonnes, []);
  }
  assert.equal(sauvegardes, 3);
  const r = await enrichirOutils(outils, options);
  assert.deepEqual(r.abandonnes, ["a"]);
  assert.deepEqual(r.erreurs, []);
  assert.equal(appels, 0, "la page inaccessible n'appelle jamais le générateur");
  assert.equal(outils[0]!.echecs_enrichissement, 3, "un outil abandonné n'est plus compté");
  assert.equal(abandonne(outils[0]!), true);
});
test("enrichir: maxEchecs est configurable, et un succès retire le compteur", async () => {
  const un = [outil("a", { echecs_enrichissement: 1 })];
  const r = await enrichirOutils(un, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire: pageOk, maxEchecs: 1 });
  assert.deepEqual([r.abandonnes, r.enrichis], [["a"], []]);
  const deux = [outil("b", { echecs_enrichissement: 2 })];
  const s = await enrichirOutils(deux, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire: pageOk });
  assert.deepEqual(s.enrichis, ["b"]);
  assert.equal(deux[0]!.echecs_enrichissement, undefined);
  assert.equal(abandonne(outil("c", { echecs_enrichissement: 5 }), 10), false);
});
test("enrichir: un second essai suit une réponse invalide", async () => {
  const reponses = [valide({ tags: [] }), valide()];
  const r = await enrichirOutils([outil("a")], { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => reponses.shift(), lire: pageOk });
  assert.deepEqual(r.enrichis, ["a"]);
});
test("enrichir: deux réponses invalides = échec consigné, l'outil reste sans description longue", async () => {
  const outils = [outil("a"), outil("b")];
  let n = 0;
  const generer: Generateur = async () => (++n <= 2 ? valide({ tags: [] }) : valide());
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer, lire: pageOk });
  assert.deepEqual(r.enrichis, ["b"]);
  assert.equal(r.erreurs[0]!.nom, "a");
  assert.equal(outils[0]!.description_longue, undefined);
});
test("enrichir: les nouveaux tags validés rejoignent le vocabulaire avec leur justification", async () => {
  const tags = [...VOCAB];
  const nt = { id: "nouveau", description: "d", justification: "Aucun tag existant ne convient." };
  const outils = [outil("a")];
  await enrichirOutils(outils, {
    tags, criteres: CRITERES, expliquer: expliquerOk, lire: pageOk, autoriserNouveauxTags: true,
    generer: async () => valide({ tags: ["gratuit", "nouveau"], nouveaux_tags: [nt] }),
  });
  assert.equal(tags.at(-1)!.id, "nouveau");
  assert.equal(tags.at(-1)!.justification, nt.justification);
  assert.equal(tags.at(-1)!.propose_pour, "a");
  assert.equal("nouveaux_tags" in outils[0]!, false);
});

test("markdown: titres, gras, italique, listes, liens et plusieurs paragraphes sont permis", () => {
  const md = "## Aperçu\n\nUn **outil** *libre* (voir [le site](https://x.example/)).\n\n- point un\n- point deux\n\n1. étape\n";
  assert.deepEqual(problemesMarkdown(md), []);
  assert.equal(validerProposition(valide({ description_longue: md }), VOCAB, false).description_longue, md.trim());
});
test("markdown: les URL et les heures ne sont pas prises pour des émoticônes", () => {
  assert.deepEqual(problemesMarkdown("Voir https://x.example/a:b et 10:30 (ex.: Matomo)."), []);
});
test("markdown: images, HTML, tiret cadratin, émojis et émoticônes sont refusés", () => {
  const mauvais: [string, RegExp][] = [
    ["![logo](https://x.example/a.png)", /image/],
    ["Du <b>gras</b> en HTML", /HTML/],
    ["Un lien <https://x.example>", /HTML/],
    ["Une entité&nbsp;ici", /HTML/],
    ["Un outil \u2014 libre", /cadratin/],
    ["Super \u{1F600}", /émoji/],
    ["Coeur \u2764\uFE0F", /émoji/],
    ["Super :)", /émoticône/],
    ["Super ;-) vraiment", /émoticône/],
    ["J'adore <3", /émoticône|HTML/],
  ];
  for (const [texte, re] of mauvais) {
    assert.match(problemesMarkdown(texte).join("; "), re, texte);
    assert.throws(() => validerProposition(valide({ description_longue: texte }), VOCAB, false), re, texte);
  }
});
test("évaluation: score, critères et confiance sont validés et rangés dans l'ordre des critères", () => {
  const p = validerProposition(valide({ evaluation_enrichie: evaluation({ criteres: ["dependance", "donnees"] }) }), VOCAB, false);
  assert.deepEqual(p.evaluation_enrichie, { score: 2, criteres: ["donnees", "dependance"], confiance: "moyenne" });
});
test("évaluation: score incohérent, critère inconnu, confiance invalide ou absence sont rejetés", () => {
  const rejet = (e: unknown, re: RegExp) => assert.throws(() => validerProposition(valide({ evaluation_enrichie: e }), VOCAB, false), re);
  rejet(evaluation({ score: 3 }), /score doit égaler/);
  rejet(evaluation({ score: 4, criteres: ["donnees", "controle", "dependance", "x"] }), /critère inconnu/);
  rejet(evaluation({ score: 1, criteres: ["donnees", "donnees"] }), /doublons|score/);
  rejet(evaluation({ confiance: "certaine" }), /confiance/);
  rejet(undefined, /absente/);
});
test("évaluation: 0 critère (score 0) est valide", () => {
  const e = evaluation({ score: 0, criteres: [] });
  assert.equal(validerProposition(valide({ evaluation_enrichie: e }), VOCAB, false).evaluation_enrichie.score, 0);
});
test("instructions: le modèle reçoit les critères, la règle Markdown et la règle sans tiret cadratin", () => {
  const i = instructions(VOCAB, CRITERES, false);
  for (const c of CRITERES) assert.ok(i.includes(c.id), c.id);
  assert.match(i, /Markdown/);
  assert.match(i, /tiret cadratin/);
});
test("schéma: l'évaluation fait partie des champs requis", () => {
  const s = schemaReponse(VOCAB, false) as any;
  assert.ok(s.required.includes("evaluation_enrichie"));
  assert.deepEqual(s.properties.evaluation_enrichie.properties.criteres.items.enum, ["donnees", "controle", "dependance"]);
});
test("enrichir: la raison du rejet est transmise au modèle à l'essai suivant", async () => {
  const rappels: (string | undefined)[] = [];
  const reponses = [valide({ description_longue: "Un tiret \u2014 interdit" }), valide()];
  const generer: Generateur = async (_o, _c, ctx) => (rappels.push(ctx.rappel), reponses.shift());
  await enrichirOutils([outil("a")], { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer, lire: pageOk });
  assert.equal(rappels[0], undefined);
  assert.match(rappels[1]!, /cadratin/);
});
test("enrichir: l'évaluation est enregistrée et les écarts avec le répertoire sont signalés", async () => {
  const outils = [
    { ...outil("a", { score: 2 }), criteres: ["donnees", "dependance"] },
    { ...outil("b", { score: 2 }), criteres: ["donnees", "controle"] },
  ];
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire: pageOk });
  assert.deepEqual(outils[0]!.evaluation_enrichie, { score: 2, criteres: ["donnees", "dependance"], confiance: "moyenne" });
  assert.deepEqual(r.ecarts, ["b"]);
});

test("écart: validation du texte (non vide, mêmes interdits que la description longue)", () => {
  assert.equal(validerEcart({ ecart: "  Une explication.  " }), "Une explication.");
  assert.throws(() => validerEcart({ ecart: " " }), /vide/);
  assert.throws(() => validerEcart(undefined), /vide/);
  assert.throws(() => validerEcart({ ecart: "Un tiret \u2014 ici" }), /cadratin/);
  assert.throws(() => validerEcart({ ecart: "Super :)" }), /émoticône/);
});
test("écart: expliqué et enregistré dans evaluation_enrichie.ecart seulement quand l'évaluation diffère", async () => {
  const outils = [
    { ...outil("a", { score: 2 }), criteres: ["donnees", "dependance"] },
    { ...outil("b", { score: 2 }), criteres: ["donnees", "controle"] },
  ];
  const appels: string[] = [];
  const expliquer: Expliqueur = async (o, _c, comparaison) => {
    appels.push(o.nom);
    assert.deepEqual(comparaison.repertoire, { score: 2, criteres: ["donnees", "controle"], confiance: undefined });
    assert.deepEqual(comparaison.enrichie.criteres, ["donnees", "dependance"]);
    return { ecart: "Le contrôle n'est pas établi par la page." };
  };
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer, generer: async () => valide(), lire: pageOk });
  assert.equal("ecart" in outils[0]!.evaluation_enrichie!, false);
  assert.equal(outils[1]!.evaluation_enrichie!.ecart, "Le contrôle n'est pas établi par la page.");
  assert.deepEqual(appels, ["b"]);
});
test("écart: un score différent à critères équivalents compte aussi comme un écart", async () => {
  const outils = [{ ...outil("a", { score: 3 }), criteres: ["donnees", "controle", "dependance"] }];
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire: pageOk });
  assert.ok(outils[0]!.evaluation_enrichie!.ecart);
});
test("écart: une explication refusée est redemandée avec la raison, puis acceptée", async () => {
  const outils = [{ ...outil("a", { score: 2 }), criteres: ["donnees", "controle"] }];
  const rappels: (string | undefined)[] = [];
  const reponses = [{ ecart: "Un tiret \u2014 interdit" }, { ecart: "Corrigée." }];
  const expliquer: Expliqueur = async (_o, _c, ctx) => (rappels.push(ctx.rappel), reponses.shift());
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer, generer: async () => valide(), lire: pageOk });
  assert.deepEqual(r.enrichis, ["a"]);
  assert.match(rappels[1]!, /cadratin/);
  assert.equal(outils[0]!.evaluation_enrichie!.ecart, "Corrigée.");
});
test("écart: si l'explication échoue, l'outil n'est PAS modifié (il sera retenté) et les nouveaux tags ne sont pas ajoutés", async () => {
  const tags = [...VOCAB];
  const nt = { id: "nouveau", description: "d", justification: "Aucun tag existant ne convient." };
  const outils = [{ ...outil("a", { score: 2 }), criteres: ["donnees", "controle"] }];
  const r = await enrichirOutils(outils, {
    tags, criteres: CRITERES, lire: pageOk, autoriserNouveauxTags: true,
    generer: async () => valide({ tags: ["gratuit", "nouveau"], nouveaux_tags: [nt] }),
    expliquer: async () => ({ ecart: "" }),
  });
  assert.equal(r.erreurs[0]!.nom, "a");
  assert.equal(outils[0]!.description_longue, undefined);
  assert.equal(tags.length, VOCAB.length);
});
test("écart: les instructions précisent que les critères du répertoire sont déduits et que l'explication est sans tiret cadratin", () => {
  const i = instructionsEcart(CRITERES);
  assert.match(i, /DÉDUITS/);
  assert.match(i, /tiret cadratin/);
});
test("progression: appelée après chaque outil traité, succès comme échec", async () => {
  const vus: number[] = [];
  let n = 0;
  const generer: Generateur = async () => (++n === 1 ? { vide: true } : valide());
  await enrichirOutils([outil("a"), outil("b"), outil("c")], {
    tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer, lire: pageOk, progression: (k) => vus.push(k),
  });
  assert.deepEqual(vus.slice(-2), [2, 3]);
  assert.equal(vus.length, 3);
});
test("début: annonce le nom de chaque outil traité, dans l'ordre, sans annoncer ceux déjà enrichis", async () => {
  const vus: string[] = [];
  const outils = [outil("a"), outil("b", { description_longue: "existante" }), outil("c")];
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire: pageOk, debut: (n) => vus.push(n) });
  assert.deepEqual(vus, ["a", "c"]);
});

test("licence: seules les expressions SPDX valides sont acceptées", () => {
  for (const ok of ["MIT", "AGPL-3.0-or-later", "GPL-2.0-only", "MIT OR Apache-2.0", "GPL-2.0-only WITH Classpath-exception-2.0"]) {
    assert.equal(validerProposition(valide({ licence: ok }), VOCAB, false).licence, ok, ok);
  }
  const mauvais: [string, RegExp][] = [
    ["GNU Affero General Public License v3.0", /SPDX/],
    ["agpl-3.0-or-later", /SPDX/],
    ["BSL-1.1", /SPDX/],
    ["GPL-3.0", /déprécié/],
    ["GPL-2.0+", /dépréciée/],
    ["LicenseRef-maison", /custom_license/],
  ];
  for (const [licence, re] of mauvais) {
    assert.throws(() => validerProposition(valide({ licence }), VOCAB, false), re, licence);
  }
});
test("licence: null reste permis (propriétaire, inconnue)", () => {
  assert.equal(validerProposition(valide({ licence: null, repo: null }), VOCAB, false).licence, null);
});
test("licence: un nom en toutes lettres est redemandé avec la raison, puis accepté", async () => {
  const rappels: (string | undefined)[] = [];
  const reponses = [valide({ licence: "GNU Affero General Public License v3.0" }), valide({ licence: "AGPL-3.0-only" })];
  const generer: Generateur = async (_o, _c, ctx) => (rappels.push(ctx.rappel), reponses.shift());
  const outils = [outil("a")];
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer, lire: pageOk });
  assert.match(rappels[1]!, /SPDX/);
  assert.equal(outils[0]!.licence, "AGPL-3.0-only");
});
test("instructions: la licence doit être SPDX et jamais un nom en toutes lettres", () => {
  assert.match(instructions(VOCAB, CRITERES, false), /UNIQUEMENT une expression de licence SPDX/);
});

const maison = (extra: Record<string, unknown> = {}) =>
  valide({ source: "source-disponible", licence: null, custom_license: "Sustainable Use License", custom_license_url: "https://example.org/licence", ...extra });

test("licence maison: nom et URL sont acceptés quand licence est null", () => {
  const p = validerProposition(maison(), VOCAB, false);
  assert.equal(p.licence, null);
  assert.equal(p.custom_license, "Sustainable Use License");
  assert.equal(p.custom_license_url, "https://example.org/licence");
});
test("licence maison: l'URL est facultative", () => {
  const p = validerProposition(maison({ custom_license_url: null }), VOCAB, false);
  assert.equal(p.custom_license_url, null);
  assert.equal(p.custom_license, "Sustainable Use License");
});
test("licence maison: custom_license_url exige custom_license et doit être une URL http(s)", () => {
  assert.throws(() => validerProposition(maison({ custom_license: null }), VOCAB, false), /exige custom_license/);
  assert.throws(() => validerProposition(maison({ custom_license_url: "licence.txt" }), VOCAB, false), /custom_license_url/);
});
test("licence maison: exclusive avec licence SPDX, et un identifiant SPDX n'est pas une licence maison", () => {
  assert.throws(() => validerProposition(maison({ licence: "MIT" }), VOCAB, false), /exclusifs/);
  assert.throws(() => validerProposition(maison({ custom_license: "MIT" }), VOCAB, false), /identifiant SPDX, il va dans licence/);
});
test("licence maison: un logiciel propriétaire n'en a pas", () => {
  assert.throws(() => validerProposition(maison({ source: "proprietaire", repo: null }), VOCAB, false), /propriétaire/);
});
test("licence maison: les champs sont requis par le schéma et expliqués au modèle", () => {
  const s = schemaReponse(VOCAB, false) as any;
  for (const c of ["custom_license", "custom_license_url"]) assert.ok(s.required.includes(c), c);
  assert.match(instructions(VOCAB, CRITERES, false), /custom_license_url/);
});
test("licence maison: un LicenseRef dans licence est redemandé avec la consigne de passer par custom_license", async () => {
  const rappels: (string | undefined)[] = [];
  const reponses = [valide({ source: "source-disponible", licence: "LicenseRef-Maison" }), maison()];
  const generer: Generateur = async (_o, _c, ctx) => (rappels.push(ctx.rappel), reponses.shift());
  const outils = [outil("a")];
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer, lire: pageOk });
  assert.match(rappels[1]!, /custom_license/);
  assert.equal(outils[0]!.custom_license, "Sustainable Use License");
  assert.equal(outils[0]!.licence, null);
});

// ---------- page de l'outil inaccessible ou presque vide ----------

const pageVide = async () => ({ titre: "T", meta_description: "", extrait: "x".repeat(MIN_EXTRAIT - 1), liens_depot: [] });
const pageQuiPlante = async () => {
  throw new Error("HTTP 403");
};
const unOutilAvecGenerateur = () => {
  let appels = 0;
  const generer: Generateur = async () => (appels++, valide());
  return { generer, appels: () => appels };
};

test("instance_de: la page lue est le dépôt du logiciel (normalisé), la fiche donne instance_de et page_lue, et les instructions expliquent le cas", async () => {
  const g = unOutilAvecGenerateur();
  const urls: string[] = [];
  const outils = [outil("Jasette FACiLe", { instance_de: { nom: "Mastodon", url: "https://github.com/mastodon/mastodon/releases/tag/v4.7.1" } })];
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: g.generer, lire: async (url) => (urls.push(url), pageOk()) });
  assert.deepEqual(urls, ["https://github.com/mastodon/mastodon"]);
  const fiche = resumePage(outils[0]!, { titre: "T", meta_description: "M", extrait: "E", liens_depot: [] });
  assert.equal(fiche.lien, "https://Jasette FACiLe.example/");
  assert.deepEqual(fiche.instance_de, { nom: "Mastodon", url: "https://github.com/mastodon/mastodon/releases/tag/v4.7.1" });
  assert.equal(fiche.page_lue, "https://github.com/mastodon/mastodon");
  assert.equal("instance_de" in resumePage(outil("A"), null), false);
  assert.match(instructions(VOCAB, CRITERES, false), /instance_de.*service hébergé.*logiciel/);
});
test("page: une page normale: enrichi, sans avertissement", async () => {
  const g = unOutilAvecGenerateur();
  const journal: string[] = [];
  const outils = [outil("a")];
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: g.generer, lire: pageOk, journal: (m) => journal.push(m) });
  assert.deepEqual(r.enrichis, ["a"]);
  assert.equal(journal.some((m) => m.includes("AVERTISSEMENT")), false);
});
for (const [cas, lire, raison] of [
  ["introuvable (null)", sansPage, /page inaccessible/],
  ["erreur réseau ou HTTP", pageQuiPlante, /HTTP 403/],
  ["presque vide", pageVide, /presque vide/],
] as const) {
  test(`page ${cas}: avertissement, aucun appel à l'API, outil non enrichi et retenté plus tard`, async () => {
    const g = unOutilAvecGenerateur();
    const journal: string[] = [];
    const outils = [outil("a")];
    const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: g.generer, lire, journal: (m) => journal.push(m) });
    assert.equal(g.appels(), 0);
    assert.deepEqual(r.enrichis, []);
    assert.match(r.erreurs[0]!.message, raison);
    assert.doesNotMatch(r.erreurs[0]!.message, /--sans-page/);
    assert.ok(journal.some((m) => m.includes("AVERTISSEMENT") && raison.test(m)));
    assert.equal(outils[0]!.description_longue, undefined);
    assert.equal(aEnrichir(outils[0]!), true);
  });
}
test("page: un outil dont la page est inaccessible n'empêche pas les autres d'être enrichis", async () => {
  const outils = [outil("a"), outil("b")];
  const lire = async (url: string) => (url.includes("//a.") ? null : pageOk());
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire });
  assert.deepEqual(r.enrichis, ["b"]);
  assert.equal(r.erreurs[0]!.nom, "a");
});
test("obtenirPage: distingue page normale, vide, absente et en erreur", async () => {
  assert.equal((await obtenirPage("u", pageOk)).probleme, undefined);
  assert.match((await obtenirPage("u", pageVide)).probleme!, /presque vide \(199 caractères/);
  assert.equal((await obtenirPage("u", sansPage)).contenu, null);
  assert.match((await obtenirPage("u", pageQuiPlante)).probleme!, /inaccessible \(HTTP 403\)/);
});

async function avecServeur<T>(statut: number, corps: string, f: (url: string) => Promise<T>): Promise<T> {
  const serveur = createServer((_q, r) => {
    r.writeHead(statut, { "content-type": "text/html; charset=utf-8" });
    r.end(corps);
  });
  await new Promise<void>((ok) => serveur.listen(0, "127.0.0.1", ok));
  try {
    return await f(`http://127.0.0.1:${(serveur.address() as AddressInfo).port}/`);
  } finally {
    serveur.close();
  }
}
test("lireContenu: lit une page, et lève une erreur avec la raison sinon", async () => {
  const html = `<html><head><title>Titre</title></head><body><p>${"mot ".repeat(100)}</p><a href="https://github.com/a/b">d</a></body></html>`;
  const c = await avecServeur(200, html, (url) => lireContenu(url));
  assert.equal(c.titre, "Titre");
  assert.deepEqual(c.liens_depot, ["https://github.com/a/b"]);
  assert.ok(c.extrait.length >= MIN_EXTRAIT);
  await avecServeur(403, "interdit", (url) => assert.rejects(lireContenu(url), /HTTP 403/));
  await assert.rejects(lireContenu("http://127.0.0.1:1/"), /./);
});

test("tags.json: sauverTags maintient la licence des données et les dates (updated_at seulement si les tags changent)", () => {
  const f = join(mkdtempSync(join(tmpdir(), "tags-")), "tags.json");
  sauverTags(f, [{ id: "a", description: "A." }]);
  const premier = JSON.parse(readFileSync(f, "utf8"));
  assert.equal(premier.meta.data_license, "CC-BY-SA-4.0");
  assert.equal(premier.meta.created_at, premier.meta.updated_at);
  assert.deepEqual(chargerTags(f), [{ id: "a", description: "A." }]);

  sauverTags(f, [{ id: "a", description: "A." }]);
  assert.deepEqual(JSON.parse(readFileSync(f, "utf8")), premier);

  sauverTags(f, [{ id: "a", description: "A." }, { id: "b", description: "B.", justification: "Parce que.", propose_pour: "x" }]);
  const apres = JSON.parse(readFileSync(f, "utf8"));
  assert.equal(apres.meta.created_at, premier.meta.created_at);
  assert.equal(apres.tags.length, 2);
});

test("enrichi_le: la date et l'heure de l'enrichissement sont enregistrées pour chaque outil, selon l'horloge", async () => {
  const heures = ["2026-11-12T09:00:00-05:00", "2026-11-12T09:00:20-05:00"];
  const outils = [outil("a"), outil("b")];
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire: pageOk, horloge: () => heures.shift()! });
  assert.equal(outils[0]!.enrichi_le, "2026-11-12T09:00:00-05:00");
  assert.equal(outils[1]!.enrichi_le, "2026-11-12T09:00:20-05:00");
});
test("enrichi_le: absent d'un outil dont l'enrichissement a échoué", async () => {
  const outils = [outil("a")];
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => ({}), lire: pageOk });
  assert.equal(outils[0]!.enrichi_le, undefined);
});
test("enrichi_le: sans horloge fournie, c'est l'heure actuelle de Toronto", async () => {
  const outils = [outil("a")];
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire: pageOk });
  assert.match(outils[0]!.enrichi_le!, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[45]:00$/);
});

test("journal: chaque message porte son niveau (succès, avertissement, erreur), pour la couleur", async () => {
  const vus: [string, string | undefined][] = [];
  const journal = (m: string, n?: string) => vus.push([m, n]);
  const lire = async (url: string) => (url.includes("//b.") ? null : pageOk());
  const outils = [outil("a", { score: 2, criteres: ["donnees", "controle"] } as never), outil("b")];
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire, journal });
  const niveau = (re: RegExp) => vus.find(([m]) => re.test(m))?.[1];
  assert.equal(niveau(/a: chiffrement|a: gratuit/), "succes");
  assert.equal(niveau(/évaluation différente/), "avertissement");
  assert.equal(niveau(/b: AVERTISSEMENT/), "avertissement");
  assert.equal(niveau(/b: ÉCHEC/), "erreur");
});
test("journal: une réponse rejetée est un avertissement", async () => {
  const vus: [string, string | undefined][] = [];
  const reponses = [valide({ tags: [] }), valide()];
  await enrichirOutils([outil("a")], { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => reponses.shift(), lire: pageOk, journal: (m, n) => vus.push([m, n]) });
  assert.equal(vus.find(([m]) => m.includes("réponse rejetée"))?.[1], "avertissement");
});

test("estimerCoutEnrichissement: borne haute par outil, proportionnelle au nombre d'outils, coût nul pour un modèle sans prix", () => {
  const un = estimerCoutEnrichissement([outil("a")], VOCAB, CRITERES, "gpt-6-astra");
  const deux = estimerCoutEnrichissement([outil("a"), outil("b")], VOCAB, CRITERES, "gpt-6-astra");
  assert.equal(un.outils, 1);
  assert.ok(un.usage.entree > 1000 && un.usage.sortie > 500, JSON.stringify(un.usage));
  assert.equal(deux.usage.entree, 2 * un.usage.entree);
  assert.equal(deux.usage.sortie, 2 * un.usage.sortie);
  assert.ok(un.cout! > 0 && Math.abs(deux.cout! - 2 * un.cout!) < 1e-9);
  assert.equal(estimerCoutEnrichissement([outil("a")], VOCAB, CRITERES, "modele-inconnu").cout, null);
  assert.deepEqual(estimerCoutEnrichissement([], VOCAB, CRITERES, "gpt-6-astra").usage, { entree: 0, sortie: 0, cache_lecture: 0, cache_ecriture: 0, raisonnement: 0 });
});
test("appelerOpenAI: le compteur reçoit les jetons de chaque appel, et le contenu est retourné", async () => {
  const vrai = globalThis.fetch;
  const corps = { status: "completed", usage: { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 10 } }, output: [{ type: "message", content: [{ type: "output_text", text: "{\"a\":1}" }] }] };
  globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => corps })) as unknown as typeof fetch;
  try {
    const usages: Usage[] = [];
    const contenu = await appelerOpenAI("k", "m", { nom: "x", schema: {}, instructions: "i", messages: ["m"], maxTokens: 10 }, (u) => usages.push(u));
    assert.deepEqual(contenu, { a: 1 });
    assert.deepEqual(usages, [{ entree: 100, sortie: 20, cache_lecture: 10, cache_ecriture: 0, raisonnement: 0 }]);
  } finally {
    globalThis.fetch = vrai;
  }
});

// ---------- modèles, repli et erreurs définitives ----------

test("modelesDepuisEnv: terra et sol par défaut; OPENAI_MODEL et OPENAI_MODEL_FALLBACK les remplacent; un repli vide ou égal au principal est désactivé", () => {
  assert.deepEqual(modelesDepuisEnv({}), { principal: MODELE_PAR_DEFAUT, repli: MODELE_REPLI_PAR_DEFAUT });
  assert.deepEqual(modelesDepuisEnv({ OPENAI_MODEL: "gpt-6-astra", OPENAI_MODEL_FALLBACK: "gpt-6.1-terra" }), { principal: "gpt-6-astra", repli: "gpt-6.1-terra" });
  assert.deepEqual(modelesDepuisEnv({ OPENAI_MODEL_FALLBACK: "" }), { principal: MODELE_PAR_DEFAUT, repli: null });
  assert.deepEqual(modelesDepuisEnv({ OPENAI_MODEL: "gpt-6-astra" }), { principal: "gpt-6-astra", repli: null });
  assert.equal(MODELE_PAR_DEFAUT, "gpt-6.1-sol");
  assert.equal(MODELE_REPLI_PAR_DEFAUT, "gpt-6-astra");
});

test("obtenirValide: sans repli, une seconde tentative par le même producteur avec la raison; deux rejets, c'est une erreur", async () => {
  const appels: (string | undefined)[] = [];
  const rejets: string[] = [];
  const v = await obtenirValide(async (rappel) => (appels.push(rappel), appels.length === 1 ? "mauvais" : "bon"), (b) => { if (b !== "bon") throw new Error("pas bon"); return b; }, (r) => rejets.push(r));
  assert.equal(v, "bon");
  assert.deepEqual(appels, [undefined, "pas bon"]);
  assert.deepEqual(rejets, ["pas bon"]);
  await assert.rejects(obtenirValide(async () => "mauvais", (b) => { if (b !== "bon") throw new Error("pas bon"); return b; }, () => {}), /pas bon/);
});

test("obtenirValide: avec repli, la seconde tentative passe par le repli (avec la raison), et le principal n'est pas réessayé", async () => {
  const principal: (string | undefined)[] = [];
  const repli: (string | undefined)[] = [];
  const v = await obtenirValide(
    async (rappel) => (principal.push(rappel), "mauvais"),
    (b) => { if (b !== "bon") throw new Error("pas bon"); return b; },
    () => {},
    async (rappel) => (repli.push(rappel), "bon"),
  );
  assert.equal(v, "bon");
  assert.deepEqual(principal, [undefined]);
  assert.deepEqual(repli, ["pas bon"]);
  await assert.rejects(obtenirValide(async () => "mauvais", (b) => { if (b !== "bon") throw new Error("pas bon"); return b; }, () => {}, async () => "mauvais aussi"), /pas bon/);
});

test("obtenirValide: une erreur définitive (clé invalide, requête refusée, refus du modèle) remonte sans seconde tentative ni repli", async () => {
  let repli = 0;
  const rejets: string[] = [];
  await assert.rejects(obtenirValide(async () => { throw new ErreurDefinitive("OpenAI HTTP 401: clé invalide"); }, (b) => b, (r) => rejets.push(r), async () => (repli++, "bon")), /HTTP 401/);
  assert.equal(repli, 0);
  assert.deepEqual(rejets, []);
});

test("appelerOpenAI: HTTP 400, 401, 403 et 404 et un refus du modèle sont des erreurs définitives; 429 et 500 ne le sont pas; les jetons d'une réponse en erreur sont comptés", async () => {
  const vrai = globalThis.fetch;
  const reponse = (status: number, corps: unknown) => (async () => ({ ok: status < 400, status, json: async () => corps })) as unknown as typeof fetch;
  const requete = { nom: "x", schema: {}, instructions: "i", messages: ["m"], maxTokens: 10 };
  try {
    for (const status of [400, 401, 403, 404]) {
      globalThis.fetch = reponse(status, { error: { message: "non" } });
      await assert.rejects(appelerOpenAI("k", "m", requete), (e: unknown) => e instanceof ErreurDefinitive && /HTTP/.test((e as Error).message), String(status));
    }
    for (const status of [429, 500, 503]) {
      globalThis.fetch = reponse(status, { error: { message: "plus tard" } });
      await assert.rejects(appelerOpenAI("k", "m", requete), (e: unknown) => !(e instanceof ErreurDefinitive) && /HTTP/.test((e as Error).message), String(status));
    }
    globalThis.fetch = reponse(200, { status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "non" }] }] });
    await assert.rejects(appelerOpenAI("k", "m", requete), (e: unknown) => e instanceof ErreurDefinitive && /refus/.test((e as Error).message));
    const usages: [Usage, string][] = [];
    globalThis.fetch = reponse(429, { error: { message: "quota" }, usage: { input_tokens: 50, output_tokens: 0 } });
    await assert.rejects(appelerOpenAI("k", "m", requete, (u, modele) => usages.push([u, modele])), /HTTP 429/);
    assert.deepEqual(usages, [[{ entree: 50, sortie: 0, cache_lecture: 0, cache_ecriture: 0, raisonnement: 0 }, "m"]]);
  } finally {
    globalThis.fetch = vrai;
  }
});

test("enrichir: avec genererRepli, une réponse rejetée est reprise par le repli (avec la raison) et compte un succès; le journal le dit", async () => {
  const rappels: (string | undefined)[] = [];
  const outils = [outil("a")];
  const journal: string[] = [];
  const r = await enrichirOutils(outils, {
    tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, lire: pageOk,
    generer: async () => valide({ tags: [] }),
    genererRepli: async (_o, _c, ctx) => (rappels.push(ctx.rappel), valide()),
    journal: (m) => journal.push(m),
  });
  assert.deepEqual(r.enrichis, ["a"]);
  assert.equal(outils[0]!.echecs_enrichissement, undefined);
  assert.match(rappels[0]!, /1 à 5 tags/);
  assert.ok(journal.some((m) => /nouvel essai avec le modèle de repli/.test(m)), journal.join("\n"));
});
test("enrichir: principal et repli rejetés, un seul échec compté; expliquerRepli reprend l'explication de l'écart", async () => {
  const outils = [outil("a")];
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, lire: pageOk, generer: async () => valide({ tags: [] }), genererRepli: async () => valide({ tags: [] }) });
  assert.deepEqual(r.enrichis, []);
  assert.equal(outils[0]!.echecs_enrichissement, 1);

  const b = [outil("b")]; // sans critères connus: l'évaluation enrichie diffère, donc l'écart est expliqué
  let repli = 0;
  const s = await enrichirOutils(b, {
    tags: VOCAB, criteres: CRITERES, lire: pageOk, generer: async () => valide(),
    expliquer: async () => ({ ecart: "" }),
    expliquerRepli: async () => (repli++, { ecart: "Le répertoire suppose les données au Canada." }),
  });
  assert.deepEqual(s.enrichis, ["b"]);
  assert.equal(repli, 1);
  assert.equal(b[0]!.evaluation_enrichie!.ecart, "Le répertoire suppose les données au Canada.");
});

test("effort de raisonnement: « low » par défaut, OPENAI_REASONING_EFFORT le remplace, vide laisse le défaut du modèle (rien n'est envoyé)", async () => {
  assert.equal(effortDepuisEnv({}), EFFORT_PAR_DEFAUT);
  assert.equal(EFFORT_PAR_DEFAUT, "low");
  assert.equal(effortDepuisEnv({ OPENAI_REASONING_EFFORT: "" }), null);
  assert.equal(effortDepuisEnv({ OPENAI_REASONING_EFFORT: "high" }), "high");
  const vrai = globalThis.fetch;
  const corps = { status: "completed", usage: { input_tokens: 1, output_tokens: 1 }, output: [{ type: "message", content: [{ type: "output_text", text: "{}" }] }] };
  const envois: string[] = [];
  globalThis.fetch = (async (_url: unknown, init: { body: string }) => (envois.push(init.body), { ok: true, status: 200, json: async () => corps })) as unknown as typeof fetch;
  try {
    const requete = { nom: "x", schema: {}, instructions: "i", messages: ["m"], maxTokens: 10 };
    await appelerOpenAI("k", "m", requete, undefined, { effort: "low" });
    assert.deepEqual(JSON.parse(envois[0]!).reasoning, { effort: "low" });
    await appelerOpenAI("k", "m", requete, undefined, { effort: null });
    assert.equal("reasoning" in JSON.parse(envois[1]!), false);
    await appelerOpenAI("k", "m", requete, undefined, { effort: effortDepuisEnv({}) });
    assert.deepEqual(JSON.parse(envois[2]!).reasoning, { effort: "low" });
  } finally {
    globalThis.fetch = vrai;
  }
});

test("enrichir: un outil au score estimé (sans étoiles dans sa source) prend le score, les critères et la confiance de l'évaluation enrichie, sans explication d'écart", async () => {
  const outils: OutilClasse[] = [{ ...outil("p", { score: 1, score_estime: true }), criteres: ["donnees"], confiance: "indéterminée" }];
  let explications = 0;
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, lire: pageOk, generer: async () => valide(), expliquer: async () => (explications++, { ecart: "x" }) });
  assert.deepEqual(r.enrichis, ["p"]);
  assert.deepEqual(r.ecarts, []);
  assert.equal(explications, 0);
  assert.equal(outils[0]!.score, 2);
  assert.deepEqual(outils[0]!.criteres, ["donnees", "dependance"]);
  assert.equal(outils[0]!.confiance, "moyenne");
  assert.equal(outils[0]!.score_estime, true);
  assert.equal(outils[0]!.evaluation_enrichie!.ecart, undefined);
});
