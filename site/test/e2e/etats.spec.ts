// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// L'explorateur dit toujours où il en est: chargement, erreur, absence de JavaScript (US5 de specs/002-explorateur-outils).
import { expect, test } from "@playwright/test";
import { affiches, attendus } from "./explorateur.ts";

test("pendant le chargement des données, un état de chargement est visible et annoncé", async ({ page }) => {
  let liberer: () => void = () => {};
  const attente = new Promise<void>((r) => (liberer = r));
  await page.route("**/explorateur.json", async (route) => {
    await attente;
    await route.continue();
  });
  await page.goto("/explorer/");
  const chargement = page.locator('[role="status"]', { hasText: "Chargement des outils…" });
  await expect(chargement.first()).toBeVisible();
  await expect(page.locator("[data-chargement]")).toBeVisible();
  liberer();
  await expect(page.locator("form[data-commandes]")).toBeVisible();
  await expect(page.locator("[data-chargement]")).toHaveCount(0);
});

for (const [cas, reponse] of [
  ["une réponse 500", { status: 500, body: "panne" }],
  ["un fichier illisible", { status: 200, contentType: "application/json", body: "<html>pas du json" }],
  ["un fichier sans ses tableaux", { status: 200, contentType: "application/json", body: '{"outils":[]}' }],
] as const) {
  test(`${cas}: un message d'erreur, « Réessayer » et un lien vers la page « Outils »`, async ({ page }) => {
    let panne = true;
    await page.route("**/explorateur.json", (route) => (panne ? route.fulfill(reponse) : route.continue()));
    await page.goto("/explorer/");
    const alerte = page.locator('main [role="alert"]');
    await expect(alerte).toContainText("Les outils n'ont pas pu être chargés");
    await expect(alerte.getByRole("link", { name: "Outils" })).toHaveAttribute("href", "/outils/");
    await expect(page.locator("form[data-commandes]")).toHaveCount(0);
    // Une fois la panne passée, « Réessayer » charge la liste.
    panne = false;
    await alerte.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.locator("form[data-commandes]")).toBeVisible();
    await expect.poll(() => affiches(page)).toEqual(attendus());
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);
  });
}

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("la page « Explorer » dit qu'elle demande JavaScript et renvoie à la page « Outils »; elle n'est pas vide", async ({ page }) => {
    await page.goto("/explorer/");
    await expect(page.locator("h1")).toHaveText("Explorer les outils");
    await expect(page.locator("main [data-attente]")).toContainText("L'explorateur demande JavaScript");
    await expect(page.locator("main [data-attente] a")).toHaveAttribute("href", "/outils/");
  });
});
