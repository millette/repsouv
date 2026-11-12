// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// extract.ts: les catégories de la page (id, nom, icône) et le champ categorie des outils (identifiant).
import assert from "node:assert/strict";
import { test } from "node:test";
import { extraire } from "../extract.ts";

const PAGE = `<html><body>
<p class="overline-col">Modification</p><p class="text-col">5 novembre 2026 09:53</p>
<blockquote><h3>📊 Analyse et mesure</h3><p><strong><a href="https://x.example/">X</a> ★★☆</strong></p><p>Une description.</p>
<p><strong><a href="https://y.example/">Y</a> ★★★</strong></p><p>Autre description.</p></blockquote>
<blockquote><h3>🎟️ Gestion d’événements et billetterie</h3><p><strong><a href="https://z.example/">Z</a> ★★☆</strong></p><p>Troisième.</p></blockquote>
</body></html>`;

test("extraire: une catégorie par h3, avec id (slug du nom), nom et icône; les outils portent l'id", () => {
  const r = extraire(PAGE);
  assert.deepEqual(r.categories, [
    { id: "analyse-et-mesure", nom: "Analyse et mesure", icone: "📊" },
    { id: "gestion-d-evenements-et-billetterie", nom: "Gestion d’événements et billetterie", icone: "🎟️" },
  ]);
  assert.deepEqual(r.outils.map((o) => [o.nom, o.categorie]), [["X", "analyse-et-mesure"], ["Y", "analyse-et-mesure"], ["Z", "gestion-d-evenements-et-billetterie"]]);
  assert.ok(!("icone" in r.outils[0]!), "plus de champ icone sur les outils");
});
