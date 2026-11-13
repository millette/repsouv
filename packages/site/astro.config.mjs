// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Site statique du répertoire. L'adresse publique et le chemin de base viennent de l'environnement
// (SITE_URL, SITE_BASE), pour qu'une copie du dépôt se publie à sa propre adresse (GitHub Pages les fournit au flux de publication).
import solid from "@astrojs/solid-js";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: process.env.SITE_URL || undefined,
  base: process.env.SITE_BASE || "/",
  trailingSlash: "always",
  compressHTML: true,
  integrations: [solid()],
});
