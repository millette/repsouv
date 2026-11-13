// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Tests dans un navigateur, sur le site bâti (site/dist) servi par « astro preview ».
import { defineConfig, devices } from "@playwright/test";

const port = 4399;
const portBase = 4398;

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: `http://localhost:${port}`, locale: "fr-CA" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // --ignore-lock: toujours au premier plan. Lancé par un agent, « astro preview » se détache sinon en arrière-plan
      // et Playwright croit le serveur arrêté.
      command: `nub exec astro preview --port ${port} --ignore-lock`,
      url: `http://localhost:${port}`,
      reuseExistingServer: true,
    },
    {
      // Le site tel que GitHub Pages le publie, servi sous le chemin du dépôt (test/e2e/base.spec.ts). Il est bâti
      // avant les tests par « nub run build:base » (voir test:e2e dans package.json), pas ici: un build pendant que
      // les autres tests tournent les ralentit jusqu'à les faire échouer.
      command: `nub exec astro preview --outDir dist-base --port ${portBase} --ignore-lock`,
      url: `http://localhost:${portBase}/repsouv/`,
      reuseExistingServer: true,
      env: { SITE_URL: "https://millette.github.io", SITE_BASE: "/repsouv/" },
    },
  ],
});
