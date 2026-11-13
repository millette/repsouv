// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// description_longue est du Markdown produit par IA à partir de pages tierces. Il est rendu au build par Sätteri
// (https://satteri.bruits.org/), avec deux greffons: les titres passent sous ceux de la fiche (h1 du nom, h2 des
// sections), et le HTML brut devient du texte, parce que le site n'insère jamais de HTML venu des données.
import { defineMdastPlugin, markdownToHtml } from "satteri";

/** Un « # » de la description devient un h3; rien ne dépasse h6. */
const DECALAGE = 2;

const decalerTitres = defineMdastPlugin({
  name: "decaler-titres",
  heading(noeud, ctx) {
    const profondeur = Math.min(6, noeud.depth + DECALAGE) as 1 | 2 | 3 | 4 | 5 | 6;
    if (profondeur !== noeud.depth) ctx.replaceNode(noeud, { type: "heading", depth: profondeur, children: [...noeud.children] });
  },
});

const neutraliserHtml = defineMdastPlugin({
  name: "neutraliser-html",
  html(noeud, ctx) {
    ctx.replaceNode(noeud, { type: "text", value: noeud.value });
  },
  link(noeud, ctx) {
    // Seules les adresses Web et de courriel restent des liens.
    if (!/^(https?:|mailto:)/i.test(noeud.url)) ctx.replaceNode(noeud, [...noeud.children]);
  },
});

/** Rend une description longue en HTML prêt à insérer dans une fiche. */
export function rendreDescription(markdown: string): string {
  return markdownToHtml(markdown, { mdastPlugins: [decalerTitres, neutraliserHtml] }).html;
}
