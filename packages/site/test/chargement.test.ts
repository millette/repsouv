// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Lecture, dans le navigateur, du fichier de données de l'explorateur: tout échec devient un message clair.
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import { adresseDonnees, chargerExplorateur, chargerFiche, chargerJson, contenuFiche } from "../src/lib/chargement.ts";

const valide = { meta: {}, categories: [], tags: [], sources: [], criteres: [], pays: [], outils: [] };
const reponse = (corps: string, status = 200) => async () => new Response(corps, { status });

test("adresseDonnees suit le chemin de base", () => {
  assert.equal(adresseDonnees("/"), "/explorateur.json");
  assert.equal(adresseDonnees("/repertoire/"), "/repertoire/explorateur.json");
  assert.equal(adresseDonnees("/repertoire"), "/repertoire/explorateur.json");
});

test("une réponse valide rend les données", async () => {
  assert.deepEqual(await chargerExplorateur("/x.json", reponse(JSON.stringify(valide))), valide);
});

test("une réponse HTTP en erreur est refusée avec son code", async () => {
  await assert.rejects(chargerExplorateur("/x.json", reponse("non", 500)), /500/);
});

test("un corps qui n'est pas du JSON est refusé", async () => {
  await assert.rejects(chargerExplorateur("/x.json", reponse("<html>")), /illisible/);
});

test("un objet sans l'un des tableaux attendus est refusé en le nommant", async () => {
  for (const cle of ["outils", "categories", "tags", "sources", "criteres", "pays"]) {
    const { [cle as keyof typeof valide]: _retire, ...incomplet } = valide;
    await assert.rejects(chargerExplorateur("/x.json", reponse(JSON.stringify(incomplet))), new RegExp(cle), cle);
  }
});

test("une panne de réseau est refusée avec un message en français", async () => {
  await assert.rejects(chargerExplorateur("/x.json", async () => { throw new TypeError("Failed to fetch"); }), /n'ont pas pu être chargés/);
});

test("chargerJson rend le contenu d'un fichier JSON et refuse une réponse en erreur", async () => {
  assert.deepEqual(await chargerJson("/g.json", reponse('{"marks":[]}')), { marks: [] });
  await assert.rejects(chargerJson("/g.json", reponse("non", 404)), /404/);
});

test("chargerFiche rend le HTML de la page d'une fiche, et tout échec devient un message en français", async () => {
  assert.equal(await chargerFiche("/outils/x/", reponse("<html><main>x</main></html>")), "<html><main>x</main></html>");
  await assert.rejects(chargerFiche("/outils/x/", reponse("non", 404)), /Les détails n'ont pas pu être chargés.*404/);
  await assert.rejects(chargerFiche("/outils/x/", async () => { throw new TypeError("Failed to fetch"); }), /Les détails n'ont pas pu être chargés/);
});

test("contenuFiche: le titre de la fiche et son contenu principal, sans le h1 ni le lien de retour", () => {
  const { document } = parseHTML('<html><body><header>en-tête</header><main id="contenu"><div data-section-entete><h1>Nuage &amp; Cie</h1><p>Libre</p></div><section data-section="description"><h2>Description</h2><p>Texte</p></section><p class="retour"><a href="/outils/">Retour</a></p></main><footer>pied</footer></body></html>');
  const { titre, html } = contenuFiche(document as unknown as Document);
  assert.equal(titre, "Nuage & Cie");
  assert.ok(html.includes('data-section="description"'));
  assert.ok(html.includes("<p>Libre</p>"));
  assert.ok(!html.includes("<h1"));
  assert.ok(!html.includes("Retour"));
  assert.ok(!html.includes("en-tête") && !html.includes("pied"));
});

test("contenuFiche refuse une page sans contenu principal", () => {
  const { document } = parseHTML("<html><body><p>rien</p></body></html>");
  assert.throws(() => contenuFiche(document as unknown as Document), /Les détails n'ont pas pu être chargés/);
});
