// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Sur un téléphone (360 px de large), l'accueil et une fiche se lisent sans défilement horizontal (FR-031).
import { expect, type Page, test } from "@playwright/test";
import { actifs, identifiant } from "./donnees.ts";

test.use({ viewport: { width: 360, height: 740 } });

const deborde = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("l'accueil ne déborde pas et les filtres restent utilisables", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("form[data-filtres]")).toBeVisible();
  expect(await deborde(page)).toBeLessThanOrEqual(0);
  await page.locator('details[data-groupe="tag"] summary').click();
  await page.locator('input[name="tag"][value="chiffrement"]').check();
  await expect(page).toHaveURL(/tag=chiffrement/);
  expect(await deborde(page)).toBeLessThanOrEqual(0);
});

for (const [nom, critere] of [
  ["enrichie avec Open Hub", (o: (typeof actifs)[number]) => "openhub" in o],
  ["non enrichie", (o: (typeof actifs)[number]) => o.enrichi_le === undefined],
] as const) {
  test(`une fiche ${nom} ne déborde pas`, async ({ page }) => {
    await page.goto(`/outils/${identifiant(actifs.find(critere)!.nom)}/`);
    expect(await deborde(page)).toBeLessThanOrEqual(0);
  });
}
