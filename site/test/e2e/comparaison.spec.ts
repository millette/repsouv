// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Comparaison côte à côte de deux à quatre outils (US2 de specs/002-explorateur-outils).
import { expect, type Page, test } from "@playwright/test";
import { lignesComparaison } from "../../src/lib/comparaison.ts";
import { affiches, attendus, cocher, donnees, ouvrir } from "./explorateur.ts";

const outil = (id: string) => donnees.outils.find((o) => o.id === id)!;
const enrichi = donnees.outils.find((o) => o.verdicts && o.licence && !o.scoreEstime)!;
const estime = donnees.outils.find((o) => o.scoreEstime && o.verdicts)!;
const nonEnrichi = donnees.outils.find((o) => o.statut === "non-enrichi")!;
const autres = donnees.outils.filter((o) => ![enrichi.id, estime.id, nonEnrichi.id].includes(o.id)).slice(0, 2);
const comparer = (page: Page, id: string) => page.locator(`.resultats [data-outil="${id}"] input[name="comparer"]`).check();
const table = (page: Page) => page.locator("table.tableau-comparaison");

/** Texte de chaque ligne du tableau de comparaison: [titre de la ligne, ...cases]. */
const lignes = (page: Page) =>
  table(page)
    .locator("tbody tr")
    .evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => (td.textContent ?? "").replace(/\s+/g, " ").trim())));

test.beforeEach(async ({ page }) => {
  await ouvrir(page);
});

test("avec un seul outil choisi, la page dit qu'il en faut deux", async ({ page }) => {
  await comparer(page, enrichi.id);
  await expect(page.locator("[data-un-seul]")).toContainText("Choisir au moins deux outils pour les comparer.");
  await expect(table(page)).toHaveCount(0);
});

test("deux outils: un tableau avec légende, un outil par colonne lié à sa fiche, les lignes attendues", async ({ page }) => {
  await comparer(page, enrichi.id);
  await comparer(page, nonEnrichi.id);
  await expect(table(page).locator("caption")).toHaveText("Comparaison de 2 outils");
  await expect(table(page).locator("thead th a")).toHaveText([enrichi.nom, nonEnrichi.nom]);
  await expect(table(page).locator(`thead th[data-compare="${enrichi.id}"] a`)).toHaveAttribute("href", `/outils/${enrichi.id}/`);
  const attendues = lignesComparaison([enrichi, nonEnrichi], donnees);
  await expect(table(page).locator("tbody th")).toHaveCount(attendues.length);
  const vues = await lignes(page);
  attendues.forEach((ligne, i) => {
    // La ligne du score montre les étoiles et leur équivalent textuel; les autres, le texte de la case.
    if (ligne.id === "score") ligne.cellules.forEach((c, j) => expect(vues[i]![j]).toContain(c.split(",")[0]!));
    else expect(vues[i]).toEqual(ligne.cellules);
  });
});

test("un outil non enrichi comparé à un outil enrichi: les cases disent ce qui manque", async ({ page }) => {
  await comparer(page, enrichi.id);
  await comparer(page, nonEnrichi.id);
  const colonne = (await lignes(page)).map((l) => l[1]);
  expect(colonne).toContain("Non vérifié");
  expect(colonne).toContain("Pas encore enrichi");
  expect(colonne).toContain("Non connue");
  for (const c of (await lignes(page)).flat()) expect(c.length).toBeGreaterThan(0);
});

test("la provenance est écrite dans le tableau: IA, déduction du dépôt, score estimé", async ({ page }) => {
  await comparer(page, enrichi.id);
  await comparer(page, estime.id);
  await expect(table(page).locator('tr[data-ligne="statut"] th')).toContainText("Produit par IA, à vérifier");
  await expect(table(page).locator('tr[data-ligne="licence"] th')).toContainText("Produit par IA, à vérifier");
  await expect(table(page).locator('tr[data-ligne="verdict-donnees"] th')).toContainText("Produit par IA, à vérifier");
  await expect(table(page).locator('tr[data-ligne="deduits"] th')).toContainText("Déduit par ce dépôt");
  await expect(table(page).locator('tr[data-ligne="score"] td').nth(1)).toContainText("score estimé");
  await expect(table(page).locator('tr[data-ligne="score"] td').nth(0)).not.toContainText("score estimé");
});

test("quatre outils, puis un cinquième refusé avec un message", async ({ page }) => {
  for (const o of [enrichi, estime, nonEnrichi, autres[0]!]) await comparer(page, o.id);
  await expect(table(page).locator("caption")).toHaveText("Comparaison de 4 outils");
  await page.locator(`.resultats [data-outil="${autres[1]!.id}"] input[name="comparer"]`).click();
  await expect(page.locator("[data-avis]")).toHaveText("La comparaison est limitée à quatre outils.");
  await expect(table(page).locator("thead th a")).toHaveCount(4);
  await expect(page.locator(`.resultats [data-outil="${autres[1]!.id}"] input[name="comparer"]`)).not.toBeChecked();
});

test("retirer un outil met le tableau à jour; à un seul outil il se referme; vider la comparaison", async ({ page }) => {
  for (const o of [enrichi, estime, nonEnrichi]) await comparer(page, o.id);
  await page.getByRole("button", { name: `Retirer ${estime.nom}`, exact: true }).click();
  await expect(table(page).locator("thead th a")).toHaveText([enrichi.nom, nonEnrichi.nom]);
  await expect(page.locator(`.resultats [data-outil="${estime.id}"] input[name="comparer"]`)).not.toBeChecked();
  await page.getByRole("button", { name: `Retirer ${nonEnrichi.nom}`, exact: true }).click();
  await expect(table(page)).toHaveCount(0);
  await expect(page.locator("[data-un-seul]")).toBeVisible();
  await comparer(page, nonEnrichi.id);
  await page.getByRole("button", { name: "Vider la comparaison" }).click();
  await expect(table(page)).toHaveCount(0);
  await expect(page.locator("[data-un-seul]")).toHaveCount(0);
});

test("un outil comparé reste dans la comparaison quand un filtre l'écarte des résultats", async ({ page }) => {
  await comparer(page, enrichi.id);
  await comparer(page, estime.id);
  await cocher(page, "enrichi", "non");
  await expect.poll(() => affiches(page)).toEqual(attendus({ enrichi: "non" }));
  expect(attendus({ enrichi: "non" })).not.toContain(enrichi.id);
  await expect(table(page).locator("thead th a")).toHaveText([enrichi.nom, estime.nom]);
  expect(outil(enrichi.id).enrichi).toBe(true);
});
