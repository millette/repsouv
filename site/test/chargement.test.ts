// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Lecture, dans le navigateur, du fichier de données de l'explorateur: tout échec devient un message clair.
import assert from "node:assert/strict";
import { test } from "node:test";
import { adresseDonnees, chargerExplorateur, chargerJson } from "../src/lib/chargement.ts";

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
