// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Sans JavaScript, tout le contenu reste lisible et les filtres ne s'affichent pas comme utilisables (FR-026, FR-027).
import { expect, test } from "@playwright/test";
import { actifs, identifiant } from "./donnees.ts";

test.use({ javaScriptEnabled: false });

test("la page « Outils » montre toutes les cartes et le total", async ({ page }) => {
  await page.goto("/outils/");
  await expect(page.locator("[data-outil]:visible")).toHaveCount(actifs.length);
  await expect(page.locator(".compteur")).toContainText(String(actifs.length));
});

test("l'accueil présente le projet, et une ancienne adresse filtrée l'affiche sans erreur", async ({ page }) => {
  await page.goto("/?statut=libre");
  await expect(page.getByRole("heading", { name: "Genèse" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir tous les outils" })).toBeVisible();
});

test("la page « Explorer » dit qu'elle demande JavaScript et renvoie à la page « Outils »", async ({ page }) => {
  await page.goto("/explorer/");
  await expect(page.locator("main")).toContainText("L'explorateur demande JavaScript");
  await page.locator("main").getByRole("link", { name: "Outils" }).click();
  await expect(page.locator("[data-outil]:visible")).toHaveCount(actifs.length);
});

test("le lien d'une carte ouvre la fiche, qui montre tout son contenu", async ({ page }) => {
  const outil = actifs.find((o) => o.enrichi_le)!;
  await page.goto("/outils/");
  await page.locator(`[data-outil="${identifiant(outil.nom)}"] a`).click();
  await expect(page.locator("h1")).toHaveText(outil.nom);
  await expect(page.locator('[data-section="description-longue"]')).toBeVisible();
  await expect(page.locator('[data-section="criteres"]')).toBeVisible();
  await expect(page.locator("footer")).toContainText("CC BY-SA 4.0");
});
