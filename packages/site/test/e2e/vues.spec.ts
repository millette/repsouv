// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les mêmes résultats en cartes ou en tableau (US3 de specs/002-explorateur-outils).
import { expect, test } from "@playwright/test";
import { affiches, attendus, cocher, donnees, ouvrir } from "./explorateur.ts";

test.beforeEach(async ({ page }) => {
  await ouvrir(page);
});

test("le tableau a une légende et ses sept colonnes", async ({ page }) => {
  await page.getByRole("radio", { name: "Tableau" }).check();
  const table = page.locator("table.tableau-outils");
  await expect(table.locator("caption")).toContainText("Outils du répertoire");
  await expect(table.locator("thead th")).toHaveCount(7);
  const entetes = await table.locator("thead th").allTextContents();
  expect(entetes.map((e) => e.replace(/\s+/g, " ").trim())).toEqual(["Comparer", "Nom", "Catégorie", "Score", "Statut du code source Produit par IA, à vérifier", "Pays", "Source"]);
});

test("mêmes outils et même ordre qu'en cartes, après un tri et un filtre", async ({ page }) => {
  await cocher(page, "statut", "libre");
  await page.getByLabel("Trier par").selectOption("score");
  await page.getByLabel("Ordre").selectOption("desc");
  const choix = { statuts: ["libre"], tri: "score" as const, sens: "desc" as const };
  await expect.poll(() => affiches(page)).toEqual(attendus(choix));
  await expect(page.locator('[data-vue="cartes"]')).toBeVisible();
  await page.getByRole("radio", { name: "Tableau" }).check();
  await expect(page.locator('[data-vue="tableau"]')).toBeVisible();
  await expect.poll(() => affiches(page)).toEqual(attendus(choix));
  await page.getByRole("radio", { name: "Cartes" }).check();
  await expect.poll(() => affiches(page)).toEqual(attendus(choix));
});

test("une ligne: nom lié à la fiche, catégorie, score, statut, pays, source; score estimé dit estimé", async ({ page }) => {
  await page.getByRole("radio", { name: "Tableau" }).check();
  const o = donnees.outils.find((x) => x.scoreEstime && x.pays && x.statut !== "non-enrichi")!;
  const ligne = page.locator(`table.tableau-outils tr[data-outil="${o.id}"]`);
  await expect(ligne.locator("th a")).toHaveAttribute("href", `/outils/${o.id}/`);
  await expect(ligne.locator("th a")).toHaveText(o.nom);
  await expect(ligne).toContainText(donnees.categories.find((c) => c.id === o.categorie)!.nom);
  await expect(ligne).toContainText("score estimé");
  await expect(ligne).toContainText(donnees.pays.find((p) => p.code === o.pays)!.nom);
  await expect(ligne).toContainText(donnees.sources.find((s) => s.id === o.source)!.nom);
  const sansPays = donnees.outils.find((x) => !x.pays && !x.scoreEstime)!;
  const autre = page.locator(`table.tableau-outils tr[data-outil="${sansPays.id}"]`);
  await expect(autre).toContainText("Non connu");
  await expect(autre).not.toContainText("score estimé");
});

test("la colonne triée porte aria-sort", async ({ page }) => {
  await page.getByRole("radio", { name: "Tableau" }).check();
  const entete = (nom: string) => page.locator("table.tableau-outils thead th", { hasText: new RegExp(`^\\s*${nom}\\s*$`) });
  await expect(entete("Catégorie")).toHaveAttribute("aria-sort", "ascending");
  await page.getByLabel("Trier par").selectOption("score");
  await page.getByLabel("Ordre").selectOption("desc");
  await expect(entete("Score")).toHaveAttribute("aria-sort", "descending");
  await expect(entete("Catégorie")).not.toHaveAttribute("aria-sort", /.+/);
});

test("un outil choisi à comparer en cartes l'est encore en tableau", async ({ page }) => {
  const [a, b] = attendus().slice(0, 2);
  for (const id of [a, b]) await page.locator(`.resultats [data-outil="${id}"] input[name="comparer"]`).check();
  await page.getByRole("radio", { name: "Tableau" }).check();
  for (const id of [a, b]) await expect(page.locator(`table.tableau-outils tr[data-outil="${id}"] input[name="comparer"]`)).toBeChecked();
  await expect(page.locator("table.tableau-comparaison caption")).toHaveText("Comparaison de 2 outils");
});
