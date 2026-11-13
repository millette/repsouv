// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Sur un téléphone (360 px de large), les pages se lisent sans défilement horizontal.
import { expect, type Page, test } from "@playwright/test";
import { actifs, identifiant } from "./donnees.ts";

test.use({ viewport: { width: 360, height: 740 } });

export const deborde = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const [nom, adresse] of [
  ["l'accueil", "/"],
  ["la page « Outils »", "/outils/"],
  ["une fiche enrichie avec Open Hub", `/outils/${identifiant(actifs.find((o) => "openhub" in o)!.nom)}/`],
  ["une fiche non enrichie", `/outils/${identifiant(actifs.find((o) => o.enrichi_le === undefined)!.nom)}/`],
] as const) {
  test(`${nom} ne déborde pas`, async ({ page }) => {
    await page.goto(adresse);
    await expect(page.locator("[data-theme-pret]")).toBeVisible();
    expect(await deborde(page)).toBeLessThanOrEqual(0);
  });
}
