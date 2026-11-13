// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Sur un téléphone (360 px de large), les pages se lisent sans défilement horizontal.
import { expect, type Page, test } from "@playwright/test";
import { actifs, identifiant } from "./donnees.ts";
import { donnees } from "./explorateur.ts";

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

const quatre = donnees.outils.slice(0, 4).map((o) => `comparer=${o.id}`).join("&");
for (const [nom, adresse] of [
  ["l'explorateur en cartes", "/explorer/"],
  ["l'explorateur en tableau", "/explorer/?vue=tableau"],
  ["l'explorateur avec une comparaison de quatre outils", `/explorer/?${quatre}`],
] as const) {
  test(`${nom} ne déborde pas: un tableau large défile seul`, async ({ page }) => {
    await page.goto(adresse);
    await expect(page.locator("form[data-commandes]")).toBeVisible();
    expect(await deborde(page)).toBeLessThanOrEqual(0);
  });
}

test("sur téléphone, les filtres de l'explorateur restent utilisables", async ({ page }) => {
  await page.goto("/explorer/");
  await expect(page.locator("form[data-commandes]")).toBeVisible();
  await page.locator('details[data-groupe="tag"] summary').click();
  await page.locator('input[name="tag"][value="chiffrement"]').check();
  await expect(page).toHaveURL(/tag=chiffrement/);
  expect(await deborde(page)).toBeLessThanOrEqual(0);
});
