// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Sans JavaScript, tout le contenu reste lisible et les filtres ne s'affichent pas comme utilisables (FR-026, FR-027).
import { expect, test } from "@playwright/test";
import { actifs, identifiant } from "./donnees.ts";

test.use({ javaScriptEnabled: false });

test("l'accueil montre toutes les cartes et le total, sans formulaire de filtres", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-outil]:visible")).toHaveCount(actifs.length);
  await expect(page.locator("form[data-filtres]")).toBeHidden();
  await expect(page.locator("[data-compteur]")).toContainText(String(actifs.length));
});

test("une adresse qui porte des filtres affiche la liste complète", async ({ page }) => {
  await page.goto("/?statut=libre");
  await expect(page.locator("[data-outil]:visible")).toHaveCount(actifs.length);
});

test("le lien d'une carte ouvre la fiche, qui montre tout son contenu", async ({ page }) => {
  const outil = actifs.find((o) => o.enrichi_le)!;
  await page.goto("/");
  await page.locator(`[data-outil="${identifiant(outil.nom)}"] a`).click();
  await expect(page.locator("h1")).toHaveText(outil.nom);
  await expect(page.locator('[data-section="description-longue"]')).toBeVisible();
  await expect(page.locator('[data-section="criteres"]')).toBeVisible();
  await expect(page.locator("footer")).toContainText("CC BY-SA 4.0");
});
