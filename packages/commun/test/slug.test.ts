// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { slug } from "../slug.ts";

test("slug: minuscules sans accents, mots séparés par un tiret", () => {
  assert.equal(slug("Analyse et mesure"), "analyse-et-mesure");
  assert.equal(slug("Gestion d’événements et billetterie"), "gestion-d-evenements-et-billetterie");
  assert.equal(slug("Communautés, réseaux et partage des connaissances"), "communautes-reseaux-et-partage-des-connaissances");
});
test("slug: ni tiret au début ou à la fin, ni tirets répétés", () => {
  assert.equal(slug("  Sécurité & accès (2026)  "), "securite-acces-2026");
  assert.equal(slug("Nextcloud -- Hub 10"), "nextcloud-hub-10");
});
test("slug: un slug est son propre slug", () => {
  assert.equal(slug("gestion-d-evenements-et-billetterie"), "gestion-d-evenements-et-billetterie");
});
test("slug: un nom sans lettre ni chiffre donne une chaîne vide, que l'appelant refuse", () => {
  assert.equal(slug("!!!"), "");
  assert.equal(slug(""), "");
});
