// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Interrupteur de thème de l'en-tête (clair ou sombre): il part du thème du système, s'applique, se retient d'une
// page à l'autre et l'emporte ensuite sur le système.
import { expect, type Page, test } from "@playwright/test";

/** Luminosité moyenne du fond de page, de 0 (noir) à 255 (blanc). */
const clarte = (page: Page) =>
  page.evaluate(() => {
    const toile = document.createElement("canvas").getContext("2d")!;
    toile.fillStyle = getComputedStyle(document.documentElement).backgroundColor;
    toile.fillRect(0, 0, 1, 1);
    const [r, v, b] = toile.getImageData(0, 0, 1, 1).data;
    return (r! + v! + b!) / 3;
  });
const sombre = (page: Page) => page.getByRole("checkbox", { name: "Thème sombre" });
const estClair = (page: Page) => expect.poll(() => clarte(page)).toBeGreaterThan(200);
const estSombre = (page: Page) => expect.poll(() => clarte(page)).toBeLessThan(90);
const pret = (page: Page) => expect(page.locator("[data-theme-pret]")).toBeVisible();
// La case est sans apparence dans un « swap »: on clique son étiquette, comme une personne le ferait.
const basculer = (page: Page) => page.locator("label.interrupteur-theme").click();

test.describe("système clair", () => {
  test.use({ colorScheme: "light" });

  test("au départ le thème est clair; l'interrupteur passe au sombre, qui reste après rechargement et sur une autre page", async ({ page }) => {
    await page.goto("/");
    await pret(page);
    await expect(sombre(page)).not.toBeChecked();
    await estClair(page);
    await basculer(page);
    await expect(sombre(page)).toBeChecked();
    await estSombre(page);
    await page.reload();
    await pret(page);
    await expect(sombre(page)).toBeChecked();
    await estSombre(page);
    await page.goto("/outils/nextcloud/");
    await pret(page);
    await expect(sombre(page)).toBeChecked();
    await estSombre(page);
  });

  test("revenir au clair est retenu aussi", async ({ page }) => {
    await page.goto("/");
    await pret(page);
    await basculer(page);
    await estSombre(page);
    await basculer(page);
    await estClair(page);
    await page.reload();
    await pret(page);
    await expect(sombre(page)).not.toBeChecked();
    await estClair(page);
  });

  test("l'interrupteur s'utilise au clavier, avec un focus visible", async ({ page }) => {
    await page.goto("/");
    await pret(page);
    await sombre(page).focus();
    const contour = await page.locator("label.interrupteur-theme").evaluate((e) => getComputedStyle(e).outlineStyle !== "none" && parseFloat(getComputedStyle(e).outlineWidth) > 0);
    expect(contour).toBe(true);
    await page.keyboard.press("Space");
    await expect(sombre(page)).toBeChecked();
    await estSombre(page);
  });
});

test.describe("système sombre", () => {
  test.use({ colorScheme: "dark" });

  test("au départ le thème est sombre et l'interrupteur le montre; le clair l'emporte ensuite sur le système", async ({ page }) => {
    await page.goto("/");
    await pret(page);
    await expect(sombre(page)).toBeChecked();
    await estSombre(page);
    await basculer(page);
    await expect(sombre(page)).not.toBeChecked();
    await estClair(page);
    await page.reload();
    await pret(page);
    await expect(sombre(page)).not.toBeChecked();
    await estClair(page);
  });
});

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false, colorScheme: "dark" });

  test("la page suit le système et l'interrupteur, qui ne pourrait rien retenir, n'est pas affiché", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("label.interrupteur-theme")).toBeHidden();
    expect(await clarte(page)).toBeLessThan(90);
  });
});
