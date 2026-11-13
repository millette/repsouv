// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// La page « Explorer » dit toujours où elle en est, et montre toujours la liste (specs/002-explorateur-outils, second
// amendement): pendant le chargement, en cas d'échec et sans JavaScript, la liste complète reste affichée.
import { expect, type Page, test } from "@playwright/test";
import { affiches, attendus, pret, total } from "./explorateur.ts";

const statique = (page: Page) => page.locator("[data-liste-statique]");
const repli = (page: Page) => page.locator("details[data-commandes-repli]");

test("pendant le chargement des données, la liste complète reste lisible et un état de chargement est annoncé", async ({ page }) => {
  let liberer: () => void = () => {};
  const attente = new Promise<void>((r) => (liberer = r));
  await page.route("**/explorateur.json", async (route) => {
    await attente;
    await route.continue();
  });
  await page.goto("/explorer/");
  await expect(page.locator('[role="status"][data-chargement]')).toHaveText("Chargement des outils…");
  await expect(statique(page).locator("[data-outil]")).toHaveCount(total);
  await expect(statique(page)).toBeVisible();
  await expect(repli(page)).toBeHidden();
  liberer();
  await expect(repli(page)).toBeVisible();
  await expect(page.locator("[data-chargement]")).toHaveCount(0);
});

test("une fois les données lues, les résultats remplacent la liste statique: aucune carte en double", async ({ page }) => {
  await page.goto("/explorer/");
  await expect(repli(page)).toBeVisible();
  await expect(statique(page)).toBeHidden();
  await expect(page.locator("[data-outil]:visible")).toHaveCount(total);
  await expect.poll(() => affiches(page)).toEqual(attendus());
});

test("le bloc « Trier et filtrer » est replié au départ, et ouvert quand l'adresse porte déjà un filtre ou un tri", async ({ page }) => {
  await page.goto("/explorer/");
  await expect(repli(page)).toBeVisible();
  await expect(repli(page).locator("> summary")).toHaveText("Trier et filtrer");
  expect(await repli(page).evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
  await expect(page.locator("form[data-commandes]")).toBeHidden();
  await repli(page).locator("> summary").click();
  await expect(page.locator("form[data-commandes]")).toBeVisible();
  for (const adresse of ["/explorer/?statut=libre", "/explorer/?tri=nom", "/explorer/?vue=tableau"]) {
    await page.goto(adresse);
    await expect(repli(page)).toBeVisible();
    expect(await repli(page).evaluate((d) => (d as HTMLDetailsElement).open)).toBe(true);
  }
});

for (const [cas, reponse] of [
  ["une réponse 500", { status: 500, body: "panne" }],
  ["un fichier illisible", { status: 200, contentType: "application/json", body: "<html>pas du json" }],
  ["un fichier sans ses tableaux", { status: 200, contentType: "application/json", body: '{"outils":[]}' }],
] as const) {
  test(`${cas}: un message d'erreur et « Réessayer », la liste complète restant affichée`, async ({ page }) => {
    let panne = true;
    await page.route("**/explorateur.json", (route) => (panne ? route.fulfill(reponse) : route.continue()));
    await page.goto("/explorer/");
    const alerte = page.locator('main [role="alert"]');
    await expect(alerte).toContainText("Les outils n'ont pas pu être chargés");
    await expect(alerte).toContainText("La liste complète reste affichée");
    await expect(statique(page)).toBeVisible();
    await expect(statique(page).locator("[data-outil]")).toHaveCount(total);
    await expect(repli(page)).toBeHidden();
    // Une fois la panne passée, « Réessayer » charge l'explorateur.
    panne = false;
    await alerte.getByRole("button", { name: "Réessayer" }).click();
    await pret(page);
    await expect.poll(() => affiches(page)).toEqual(attendus());
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);
    await expect(statique(page)).toBeHidden();
  });
}

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("la page « Explorer » montre la liste complète, par catégorie, sans formulaire", async ({ page }) => {
    await page.goto("/explorer/?statut=libre");
    await expect(page.locator("h1")).toHaveText("Explorer les outils");
    await expect(page.locator("[data-outil]:visible")).toHaveCount(total);
    await expect(statique(page).locator("section[data-categorie] h2").first()).toBeVisible();
    await expect(repli(page)).toBeHidden();
    await expect(page.locator("form[data-commandes]")).toBeHidden();
    await expect(page.locator("[data-chargement]")).toHaveCount(0);
  });
});
