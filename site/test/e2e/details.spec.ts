// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Boîte « Détails d'un outil » de l'explorateur (US7 de specs/002-explorateur-outils): tous les détails de la fiche,
// sans quitter la page; la fiche reste la page de l'outil.
import { expect, type Page, test } from "@playwright/test";
import { affiches, attendus, cocher, donnees, ouvrir } from "./explorateur.ts";

const enrichi = donnees.outils.find((o) => o.verdicts && o.licence && o.tags.length > 0)!;
const nonEnrichi = donnees.outils.find((o) => o.statut === "non-enrichi")!;
const boite = (page: Page) => page.locator("dialog[data-details]");
const details = (page: Page, id: string, dans = ".resultats") => page.locator(`${dans} a[data-details-de="${id}"]`);

/** Sections de la fiche d'un outil, lues sur sa page. */
async function sectionsDeLaFiche(page: Page, id: string): Promise<string[]> {
  const autre = await page.context().newPage();
  await autre.goto(`/outils/${id}/`);
  const sections = await autre.locator("main [data-section]").evaluateAll((s) => s.map((e) => e.getAttribute("data-section")!));
  await autre.close();
  return sections;
}

test.beforeEach(async ({ page }) => {
  await ouvrir(page);
});

test("le nom d'un outil, sur une carte, ouvre une boîte modale nommée par l'outil, avec les sections de sa fiche et leur provenance", async ({ page }) => {
  await expect(boite(page)).toBeHidden();
  // Le nom reste un lien vers la fiche: sans JavaScript, ou par un clic modifié, il y mène.
  await expect(details(page, enrichi.id)).toHaveAttribute("href", `/outils/${enrichi.id}/`);
  await expect(details(page, enrichi.id)).toHaveText(enrichi.nom);
  await details(page, enrichi.id).click();
  await expect(boite(page)).toBeVisible();
  await expect(page.getByRole("dialog", { name: enrichi.nom })).toBeVisible();
  expect(await boite(page).evaluate((d) => (d as HTMLDialogElement).matches(":modal"))).toBe(true);
  await expect(boite(page).locator("[data-details-contenu]")).toBeVisible();
  const sections = await boite(page).locator("[data-section]").evaluateAll((s) => s.map((e) => e.getAttribute("data-section")!));
  expect(sections).toEqual(await sectionsDeLaFiche(page, enrichi.id));
  await expect(boite(page)).toContainText("Produit par IA, à vérifier");
  await expect(boite(page)).toContainText("Déduit par ce dépôt");
  await expect(boite(page).locator("h1")).toHaveCount(0);
  await expect(boite(page)).not.toContainText("Retour à la liste des outils");
});

test("un outil non enrichi: la boîte montre ses champs de source et ses critères déduits, sans libellé d'IA", async ({ page }) => {
  await cocher(page, "enrichi", "non");
  await details(page, nonEnrichi.id).click();
  await expect(boite(page).locator("[data-details-contenu]")).toBeVisible();
  await expect(boite(page).locator('[data-lecture="deduits"]')).toBeVisible();
  await expect(boite(page).locator("[data-details-contenu]")).not.toContainText("Produit par IA");
});

test("pendant la lecture de la fiche, la boîte dit qu'elle charge", async ({ page }) => {
  let liberer: () => void = () => {};
  const attente = new Promise<void>((r) => (liberer = r));
  await page.route(`**/outils/${enrichi.id}/`, async (route) => {
    await attente;
    await route.continue();
  });
  await details(page, enrichi.id).click();
  await expect(boite(page).locator("[data-chargement-details]")).toBeVisible();
  liberer();
  await expect(boite(page).locator("[data-details-contenu]")).toBeVisible();
});

test("si la fiche ne se charge pas, la boîte le dit et renvoie à la fiche; elle n'est pas vide", async ({ page }) => {
  await page.route(`**/outils/${enrichi.id}/`, (route) => route.fulfill({ status: 500, body: "panne" }));
  await details(page, enrichi.id).click();
  await expect(boite(page).getByRole("alert")).toContainText("Les détails n'ont pas pu être chargés");
  await expect(boite(page).getByRole("link", { name: /Ouvrir la fiche/ })).toHaveAttribute("href", `/outils/${enrichi.id}/`);
  // Un autre outil s'ouvre ensuite normalement.
  await boite(page).getByRole("button", { name: "Fermer", exact: true }).click();
  await details(page, donnees.outils.find((o) => o.id !== enrichi.id && o.enrichi)!.id).click();
  await expect(boite(page).locator("[data-details-contenu]")).toBeVisible();
  await expect(boite(page).getByRole("alert")).toHaveCount(0);
});

test("il n'y a plus de bouton « Détails »: le nom de l'outil est la seule commande qui ouvre la boîte", async ({ page }) => {
  const [a, b] = attendus().slice(0, 2);
  for (const id of [a, b]) await page.locator(`.resultats [data-outil="${id}"] input[name="comparer"]`).check();
  await expect(page.locator(".explorateur").getByRole("button", { name: /Détails/ })).toHaveCount(0);
  await page.getByRole("radio", { name: "Tableau" }).check();
  await expect(page.locator(".explorateur").getByRole("button", { name: /Détails/ })).toHaveCount(0);
});

test("un clic modifié sur le nom (Ctrl) suit le lien dans un nouvel onglet, sans ouvrir la boîte", async ({ page, context }) => {
  const onglet = context.waitForEvent("page");
  await details(page, enrichi.id).click({ modifiers: ["Control"] });
  const fiche = await onglet;
  await expect(fiche.locator("h1")).toHaveText(enrichi.nom);
  await expect(boite(page)).toBeHidden();
  await expect(page).not.toHaveURL(/fiche=/);
});

test("au clavier, Entrée sur le nom ouvre la boîte", async ({ page }) => {
  await details(page, enrichi.id).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: enrichi.nom })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`fiche=${enrichi.id}$`));
});

test("« Ouvrir la fiche » mène à la page de l'outil", async ({ page }) => {
  await details(page, enrichi.id).click();
  await boite(page).getByRole("link", { name: /Ouvrir la fiche/ }).click();
  await expect(page).toHaveURL(new RegExp(`/outils/${enrichi.id}/$`));
  await expect(page.locator("h1")).toHaveText(enrichi.nom);
});

test("la boîte se ferme par « Fermer », par Échap et par un clic hors d'elle; le focus revient et l'explorateur n'a pas bougé", async ({ page }) => {
  await cocher(page, "statut", "libre");
  await page.getByLabel("Trier par").selectOption("nom");
  const choix = { statuts: ["libre"], tri: "nom" as const };
  const id = attendus(choix)[0]!;
  const autre = attendus(choix)[1]!;
  await page.locator(`.resultats [data-outil="${autre}"] input[name="comparer"]`).check();
  const fermetures = [
    () => boite(page).getByRole("button", { name: "Fermer", exact: true }).click(),
    () => page.keyboard.press("Escape"),
    () => page.mouse.click(5, 5),
  ];
  for (const fermer of fermetures) {
    await details(page, id).click();
    await expect(boite(page)).toBeVisible();
    await fermer();
    await expect(boite(page)).toBeHidden();
    await expect(details(page, id)).toBeFocused();
    await expect.poll(() => affiches(page)).toEqual(attendus(choix));
    await expect(page.locator(`.resultats [data-outil="${autre}"] input[name="comparer"]`)).toBeChecked();
    await expect(page).not.toHaveURL(/fiche=/);
  }
});

test("le focus reste dans la boîte à la tabulation", async ({ page }) => {
  await details(page, enrichi.id).click();
  await expect(boite(page).locator("[data-details-contenu]")).toBeVisible();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest("dialog") !== null || document.activeElement === document.body)).toBe(true);
  }
});

test("la boîte s'ouvre aussi depuis une ligne du tableau et depuis une colonne de la comparaison", async ({ page }) => {
  await page.getByRole("radio", { name: "Tableau" }).check();
  await details(page, enrichi.id).click();
  await expect(page.getByRole("dialog", { name: enrichi.nom })).toBeVisible();
  await page.keyboard.press("Escape");
  const [a, b] = attendus().slice(0, 2);
  for (const id of [a, b]) await page.locator(`.resultats [data-outil="${id}"] input[name="comparer"]`).check();
  await details(page, a!, ".comparaison").click();
  await expect(page.getByRole("dialog", { name: donnees.outils.find((o) => o.id === a)!.nom })).toBeVisible();
});

test("l'adresse porte l'outil ouvert: un lien copié rouvre la boîte, et le bouton précédent la ferme", async ({ page, context }) => {
  await cocher(page, "statut", "libre");
  const libre = donnees.outils.find((o) => o.id === attendus({ statuts: ["libre"] })[0])!;
  await details(page, libre.id).click();
  await expect(page).toHaveURL(new RegExp(`statut=libre&fiche=${libre.id}$`));
  const autre = await context.newPage();
  await autre.goto(page.url());
  await expect(autre.getByRole("dialog", { name: libre.nom })).toBeVisible();
  await expect(autre.locator("dialog [data-details-contenu]")).toBeVisible();
  await expect(autre.locator('input[name="statut"][value="libre"]')).toBeChecked();
  await page.goBack();
  await expect(boite(page)).toBeHidden();
  await expect(page).not.toHaveURL(/fiche=/);
  await page.goForward();
  await expect(boite(page)).toBeVisible();
});

test("un outil inconnu dans l'adresse n'ouvre rien", async ({ page }) => {
  await ouvrir(page, "/explorer/?fiche=inconnu");
  await expect(boite(page)).toBeHidden();
  await expect.poll(() => affiches(page)).toEqual(attendus());
});
