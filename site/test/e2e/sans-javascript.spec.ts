// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Sans JavaScript, tout le contenu reste lisible et aucune commande inutilisable n'est affichée.
import { expect, test } from "@playwright/test";
import { actifs, identifiant } from "./donnees.ts";

test.use({ javaScriptEnabled: false });

test("la page « Explorer » montre toutes les cartes et le total", async ({ page }) => {
  await page.goto("/explorer/");
  await expect(page.locator("[data-outil]:visible")).toHaveCount(actifs.length);
  await expect(page.locator(".compteur")).toContainText(String(actifs.length));
});

test("l'accueil présente le projet, et une ancienne adresse filtrée l'affiche sans erreur", async ({ page }) => {
  await page.goto("/?statut=libre");
  await expect(page.getByRole("heading", { name: "Genèse" })).toBeVisible();
  await page.getByRole("link", { name: "Voir, trier et comparer les outils" }).click();
  await expect(page.locator("[data-outil]:visible")).toHaveCount(actifs.length);
});

test("le lien d'une carte ouvre la fiche, qui montre tout son contenu, et son retour ramène à la liste", async ({ page }) => {
  const outil = actifs.find((o) => o.enrichi_le)!;
  await page.goto("/explorer/");
  await page.locator(`[data-outil="${identifiant(outil.nom)}"] a`).click();
  await expect(page.locator("h1")).toHaveText(outil.nom);
  await expect(page.locator('[data-section="description-longue"]')).toBeVisible();
  await expect(page.locator('[data-section="criteres"]')).toBeVisible();
  await expect(page.locator("footer")).toContainText("CC BY-SA 4.0");
  await page.getByRole("link", { name: "Retour à la liste des outils" }).click();
  await expect(page.locator("h1")).toHaveText("Explorer les outils");
});

test("l'ancienne adresse de la page « Outils » sert la page introuvable, qui ramène au site", async ({ page }) => {
  const reponse = await page.goto("/outils/");
  expect(reponse!.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page introuvable");
});
