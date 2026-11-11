// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  aEnrichir, chargerCriteres, chargerTags, enrichirOutils, extraireContenu, instructions, instructionsEcart, lireContenu, MAX_TAGS, MIN_EXTRAIT, obtenirPage, problemesMarkdown, sauverTags,
  schemaReponse, validerEcart, validerProposition, type Expliqueur, type Generateur, type Tag,
} from "../enrichir.ts";
import type { Outil } from "../extract.ts";

const VOCAB: Tag[] = [
  { id: "chiffrement", description: "Chiffre." },
  { id: "gratuit", description: "Gratuit." },
  { id: "automatisation", description: "Automatise." },
];
const CRITERES = chargerCriteres("criteres.json");
const evaluation = (extra: Record<string, unknown> = {}) => ({ score: 2, criteres: ["donnees", "dependance"], confiance: "moyenne", ...extra });
const valide = (extra: Record<string, unknown> = {}) => ({
  description_longue: "Une description.", tags: ["gratuit"], source: "libre",
  licence: "MIT", custom_license: null, custom_license_url: null, repo: "https://github.com/x/y",
  evaluation_enrichie: evaluation(), nouveaux_tags: [], ...extra,
});
const outil = (nom: string, extra: Partial<Outil> = {}): Outil => ({
  categorie: "C", icone: "🧪", nom, score: 2, lien: `https://${nom}.example/`,
  description: "d", derniere_modification: "2026-11-05T09:53", changement: null, ...extra,
});
const sansPage = async () => null;
const pageOk = async () => ({ titre: "T", meta_description: "", extrait: "x".repeat(MIN_EXTRAIT), liens_depot: [] });
const expliquerOk: Expliqueur = async () => ({ ecart: "Le répertoire ne précise pas l'hébergement." });

test("tags.json: ids uniques, en kebab-case, avec description française non vide", () => {
  const tags = chargerTags("tags.json");
  assert.equal(new Set(tags.map((t) => t.id)).size, tags.length);
  for (const t of tags) {
    assert.match(t.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(t.description.trim().length > 0, t.id);
  }
});

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
test("enrichir: respecte la limite et sauvegarde après chaque outil", async () => {
  const outils = [outil("a"), outil("b"), outil("c")];
  let sauvegardes = 0;
  const r = await enrichirOutils(outils, {
    tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire: pageOk, limite: 2, apresChaque: () => sauvegardes++,
  });
  assert.deepEqual(r.enrichis, ["a", "b"]);
  assert.equal(sauvegardes, 2);
  assert.equal(outils[2]!.description_longue, undefined);
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

test("page: une page normale donne page_lue: true, sans avertissement", async () => {
  const g = unOutilAvecGenerateur();
  const journal: string[] = [];
  const outils = [outil("a")];
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: g.generer, lire: pageOk, journal: (m) => journal.push(m) });
  assert.equal(outils[0]!.page_lue, true);
  assert.deepEqual(r.sansPage, []);
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
    assert.match(r.erreurs[0]!.message, /--sans-page/);
    assert.ok(journal.some((m) => m.includes("AVERTISSEMENT") && raison.test(m)));
    assert.equal(outils[0]!.description_longue, undefined);
    assert.equal(outils[0]!.page_lue, undefined);
    assert.equal(aEnrichir(outils[0]!), true);
  });
  test(`page ${cas}, avec accepterSansPage: enrichi à partir de la description seule et marqué page_lue: false`, async () => {
    const g = unOutilAvecGenerateur();
    const outils = [outil("a")];
    const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: g.generer, lire, accepterSansPage: true });
    assert.equal(g.appels(), 1);
    assert.deepEqual(r.enrichis, ["a"]);
    assert.deepEqual(r.sansPage, ["a"]);
    assert.equal(outils[0]!.page_lue, false);
    assert.ok(outils[0]!.description_longue);
  });
}
test("page: sans page lisible, le modèle reçoit « inaccessible » et aucun lien de dépôt", async () => {
  let recu: unknown = "non appelé";
  const generer: Generateur = async (_o, contenu) => ((recu = contenu), valide());
  await enrichirOutils([outil("a")], { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer, lire: sansPage, accepterSansPage: true });
  assert.equal(recu, null);
});
test("page: un outil dont la page est inaccessible n'empêche pas les autres d'être enrichis", async () => {
  const outils = [outil("a"), outil("b")];
  const lire = async (url: string) => (url.includes("//a.") ? null : pageOk());
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, expliquer: expliquerOk, generer: async () => valide(), lire });
  assert.deepEqual(r.enrichis, ["b"]);
  assert.equal(r.erreurs[0]!.nom, "a");
});
test("page: les instructions demandent la prudence sans page lisible", () => {
  assert.match(instructions(VOCAB, CRITERES, false), /inaccessible/);
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
