// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Greffon PostCSS: applique le thème sombre de daisyUI quand le système le demande. La feuille daisyui.css ne
// l'active que par l'attribut data-theme="dark", qui demanderait un script; le site n'en a pas pour la lecture.
// Les déclarations du thème sombre sont donc recopiées sous une requête média, sans table de couleurs à tenir à jour.

const SELECTEUR_SOMBRE = "[data-theme=dark]";

/** @returns {import("postcss").Plugin} */
export default function themeSombre() {
  return {
    postcssPlugin: "theme-sombre",
    OnceExit(racine, { postcss }) {
      let sombre;
      racine.walkRules((regle) => {
        if (!sombre && regle.selectors.includes(SELECTEUR_SOMBRE) && regle.some((n) => n.type === "decl" && n.prop === "color-scheme" && n.value === "dark")) sombre = regle;
      });
      if (!sombre) return;
      const regle = postcss.rule({ selector: ":root:not([data-theme])", raws: { between: "", after: "", semicolon: false } });
      sombre.each((n) => {
        if (n.type === "decl") regle.append(n.clone({ raws: { before: "", between: ":" } }));
      });
      const media = postcss.atRule({ name: "media", params: "(prefers-color-scheme: dark)", raws: { before: "", between: "", after: "" } });
      media.append(regle);
      regle.raws.before = "";
      racine.append(media);
    },
  };
}
themeSombre.postcss = true;
