// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Greffon PostCSS: retire du CSS les variantes réactives de daisyUI (.sm:btn, .md:card, .2xl:alert, .max-sm:…).
// Le site n'emploie aucune de ces classes (voir test/styles.test.ts): sa mise en page réactive est écrite dans
// src/styles/global.css. Les retirer allège la feuille de style envoyée au navigateur.

/** Sélecteur qui porte un préfixe réactif; « 2xl » est échappé « \32 xl » dans le CSS de daisyUI. */
const PREFIXE_REACTIF = /\.(?:max-)?(?:sm|md|lg|xl|\\32 ?xl)\\:/;

/** @returns {import("postcss").Plugin} */
export default function sansVariantes() {
  return {
    postcssPlugin: "sans-variantes",
    OnceExit(racine) {
      racine.walkRules((regle) => {
        const gardes = regle.selectors.filter((s) => !PREFIXE_REACTIF.test(s));
        if (gardes.length === regle.selectors.length) return;
        if (gardes.length === 0) regle.remove();
        else regle.selectors = gardes;
      });
      // Une règle @media ou @layer vidée par le passage précédent n'a plus de raison d'être; de l'intérieur vers l'extérieur.
      let retire = true;
      while (retire) {
        retire = false;
        racine.walkAtRules((arobase) => {
          if (arobase.nodes && arobase.nodes.length === 0) {
            arobase.remove();
            retire = true;
          }
        });
      }
    },
  };
}
sansVariantes.postcss = true;
