// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { depuisRacine } from "./racine.ts";
import { contact, enTetes, NAVIGATEUR, USER_AGENT, userAgentDepuis } from "../agent.ts";

test("userAgentDepuis: navigateur Chrome sur Linux, puis nom/version du paquet et le contact entre parenthèses", () => {
  const ua = userAgentDepuis({ name: "x", version: "1.2.3", author: { name: "Robin Millette", email: "robin@example.com", url: "https://robin.example/" } });
  assert.equal(ua, "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 x/1.2.3 (Robin Millette <robin@example.com>)");
  assert.equal(userAgentDepuis({ name: "x", version: "0.1.0" }), `${NAVIGATEUR} x/0.1.0`, "sans auteur, pas de parenthèses");
  assert.equal(contact({ name: "Robin" }), "Robin");
  assert.equal(contact({ email: "r@example.com" }), "r@example.com");
  assert.equal(contact({ name: " ", email: "" }), null);
});

test("USER_AGENT: celui de package.json, avec le courriel de l'auteur; enTetes l'ajoute aux en-têtes donnés", () => {
  const p = JSON.parse(readFileSync(depuisRacine("package.json"), "utf8"));
  assert.equal(USER_AGENT, userAgentDepuis(p));
  assert.match(USER_AGENT, /^Mozilla\/5\.0 \(X11; Linux x86_64\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/157\.0\.0\.0 Safari\/537\.36 outils-souverainete-numerique\/\d+\.\d+\.\d+ \(Robin Millette <robin@millette\.info>\)$/);
  assert.deepEqual(enTetes({ accept: "text/html" }), { "user-agent": USER_AGENT, accept: "text/html" });
  assert.deepEqual(enTetes(), { "user-agent": USER_AGENT });
});
