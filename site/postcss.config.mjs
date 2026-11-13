// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Chargé par Vite (Astro) pour toutes les feuilles de style du site.
import sansVariantes from "./postcss/sans-variantes.mjs";

export default { plugins: [sansVariantes()] };
