// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Tests dans un navigateur, sur le site bâti (site/dist) servi par « astro preview ».
import { defineConfig, devices } from "@playwright/test";

const port = 4399;

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: `http://localhost:${port}`, locale: "fr-CA" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `nub run preview --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
});
