// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Le site bâti pour GitHub Pages, servi sous le chemin du dépôt (specs/004-deploiement-github-pages): tout y
// fonctionne comme à la racine, et aucune requête ne sort de ce chemin.
import { expect, test } from "@playwright/test";

const BASE = "/repsouv/";
test.use({ baseURL: "http://localhost:4398" });

test("la navigation mène aux quatre pages, sous le chemin du dépôt", async ({ page }) => {
  await page.goto(BASE);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  for (const [lien, titre, chemin] of [["Outils", "Outils", "outils/"], ["Explorer", "Explorer les outils", "explorer/"], ["Statistiques", "Statistiques", "statistiques/"], ["Accueil", /Répertoire d'outils/, ""]] as const) {
    await nav.getByRole("link", { name: lien, exact: true }).click();
    await expect(page.locator("h1")).toHaveText(titre);
    expect(new URL(page.url()).pathname).toBe(BASE + chemin);
  }
});

test("l'explorateur charge ses données, filtre, et sa boîte « Détails » montre la fiche d'un outil", async ({ page }) => {
  const horsBase: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.host === "localhost:4398" && !u.pathname.startsWith(BASE)) horsBase.push(u.pathname);
  });
  await page.goto(`${BASE}explorer/`);
  await expect(page.locator("form[data-commandes]")).toBeVisible();
  await expect(page.locator("[data-compteur]")).toContainText(/^\d+ outils affichés sur \d+/);
  await page.locator('input[name="statut"][value="libre"]').check();
  await expect(page).toHaveURL(/\/repsouv\/explorer\/\?statut=libre$/);
  const details = page.locator(".resultats button[data-details-de]").first();
  const id = await details.getAttribute("data-details-de");
  await details.click();
  await expect(page.locator("dialog [data-details-contenu]")).toBeVisible();
  await expect(page.locator("dialog").getByRole("link", { name: /Ouvrir la fiche/ })).toHaveAttribute("href", `${BASE}outils/${id}/`);
  // Un lien de la fiche affichée dans la boîte reste sous le chemin du dépôt.
  await expect(page.locator("dialog [data-section-entete] .fiche-meta a").first()).toHaveAttribute("href", new RegExp(`^${BASE}explorer/\\?categorie=`));
  expect(horsBase).toEqual([]);
});

test("un graphique de la page « Statistiques » devient interactif, et une ligne de tableau mène à l'explorateur", async ({ page }) => {
  await page.goto(`${BASE}statistiques/`);
  const f = page.locator('figure[data-graphique="statut-code-source"]');
  await f.scrollIntoViewIfNeeded();
  await expect(f.locator("[data-vue-prete]")).toBeVisible();
  await f.locator("summary").click();
  await f.getByRole("link", { name: "Libre", exact: true }).click();
  await expect(page).toHaveURL(/\/repsouv\/explorer\/\?statut=libre$/);
  await expect(page.locator("form[data-commandes]")).toBeVisible();
});

test("une fiche s'ouvre depuis la page « Outils », et son retour ramène à la liste", async ({ page }) => {
  await page.goto(`${BASE}outils/`);
  const lien = page.locator("[data-outil] a").first();
  const nom = await lien.textContent();
  await lien.click();
  await expect(page.locator("h1")).toHaveText(nom!);
  await page.getByRole("link", { name: "Retour à la liste des outils" }).click();
  expect(new URL(page.url()).pathname).toBe(`${BASE}outils/`);
});

test("une adresse inconnue sert la page introuvable, dont le lien ramène à l'accueil du site", async ({ page }) => {
  const reponse = await page.goto(`${BASE}inconnu/`);
  expect(reponse!.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page introuvable");
  await page.getByRole("link", { name: "Revenir à la liste des outils" }).click();
  expect(new URL(page.url()).pathname).toBe(BASE);
});
