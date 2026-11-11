import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aEnrichir, chargerCriteres, chargerTags, enrichirOutils, extraireContenu, instructions, MAX_TAGS, problemesMarkdown,
  schemaReponse, validerProposition, type Generateur, type Tag,
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
  licence: "MIT", repo: "https://github.com/x/y", evaluation_enrichie: evaluation(), nouveaux_tags: [], ...extra,
});
const outil = (nom: string, extra: Partial<Outil> = {}): Outil => ({
  categorie: "C", icone: "🧪", nom, score: 2, lien: `https://${nom}.example/`,
  description: "d", derniere_modification: "2026-11-05T09:53", changement: null, ...extra,
});
const sansPage = async () => null;

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
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, generer, lire: sansPage });
  assert.deepEqual(r.enrichis, ["c"]);
  assert.equal(appels, 1);
  assert.equal(outils[0]!.description_longue, "existante");
  assert.equal(aEnrichir(outils[1]!), false);
});
test("enrichir: un second passage n'appelle plus le générateur", async () => {
  const outils = [outil("a")];
  let appels = 0;
  const generer: Generateur = async () => (appels++, valide());
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, generer, lire: sansPage });
  await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, generer, lire: sansPage });
  assert.equal(appels, 1);
});
test("enrichir: respecte la limite et sauvegarde après chaque outil", async () => {
  const outils = [outil("a"), outil("b"), outil("c")];
  let sauvegardes = 0;
  const r = await enrichirOutils(outils, {
    tags: VOCAB, criteres: CRITERES, generer: async () => valide(), lire: sansPage, limite: 2, apresChaque: () => sauvegardes++,
  });
  assert.deepEqual(r.enrichis, ["a", "b"]);
  assert.equal(sauvegardes, 2);
  assert.equal(outils[2]!.description_longue, undefined);
});
test("enrichir: un second essai suit une réponse invalide", async () => {
  const reponses = [valide({ tags: [] }), valide()];
  const r = await enrichirOutils([outil("a")], { tags: VOCAB, criteres: CRITERES, generer: async () => reponses.shift(), lire: sansPage });
  assert.deepEqual(r.enrichis, ["a"]);
});
test("enrichir: deux réponses invalides = échec consigné, l'outil reste sans description longue", async () => {
  const outils = [outil("a"), outil("b")];
  let n = 0;
  const generer: Generateur = async () => (++n <= 2 ? valide({ tags: [] }) : valide());
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, generer, lire: sansPage });
  assert.deepEqual(r.enrichis, ["b"]);
  assert.equal(r.erreurs[0]!.nom, "a");
  assert.equal(outils[0]!.description_longue, undefined);
});
test("enrichir: les nouveaux tags validés rejoignent le vocabulaire avec leur justification", async () => {
  const tags = [...VOCAB];
  const nt = { id: "nouveau", description: "d", justification: "Aucun tag existant ne convient." };
  const outils = [outil("a")];
  await enrichirOutils(outils, {
    tags, criteres: CRITERES, lire: sansPage, autoriserNouveauxTags: true,
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
  await enrichirOutils([outil("a")], { tags: VOCAB, criteres: CRITERES, generer, lire: sansPage });
  assert.equal(rappels[0], undefined);
  assert.match(rappels[1]!, /cadratin/);
});
test("enrichir: l'évaluation est enregistrée et les écarts avec le répertoire sont signalés", async () => {
  const outils = [
    { ...outil("a", { score: 2 }), criteres: ["donnees", "dependance"] },
    { ...outil("b", { score: 2 }), criteres: ["donnees", "controle"] },
  ];
  const r = await enrichirOutils(outils, { tags: VOCAB, criteres: CRITERES, generer: async () => valide(), lire: sansPage });
  assert.deepEqual(outils[0]!.evaluation_enrichie, { score: 2, criteres: ["donnees", "dependance"], confiance: "moyenne" });
  assert.deepEqual(r.ecarts, ["b"]);
});
