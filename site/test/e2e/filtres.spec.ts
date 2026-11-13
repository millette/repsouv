// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Filtres, recherche et adresse dans un navigateur (contracts/filtres.md), sur le site bâti avec les vraies données.
import { expect, type Page, test } from "@playwright/test";
import { actifs, attendus, identifiant } from "./donnees.ts";

/** Identifiants des cartes visibles, triés. */
async function visibles(page: Page): Promise<string[]> {
  const ids = await page.locator("[data-outil]:visible").evaluateAll((cartes) => cartes.map((c) => c.getAttribute("data-outil")!));
  return ids.sort();
}

async function cocher(page: Page, type: "categorie" | "tag" | "statut", valeur: string): Promise<void> {
  const groupe = page.locator(`details[data-groupe="${type}"]`);
  if ((await groupe.count()) > 0 && !(await groupe.evaluate((d) => (d as HTMLDetailsElement).open))) await groupe.locator("summary").click();
  await page.locator(`input[name="${type}"][value="${valeur}"]`).check();
}

const compteur = (page: Page) => page.locator("[data-compteur]");
const total = actifs.length;
// Une catégorie qui a des outils libres et d'autres qui ne le sont pas, pour que le filtre combiné soit parlant.
const categorie = actifs.find((o) => o.source === "libre" && actifs.some((a) => a.categorie === o.categorie && a.source === "proprietaire"))!.categorie;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("form[data-filtres]")).toBeVisible();
});

test("au départ, tous les outils sont affichés et le compteur le dit", async ({ page }) => {
  await expect.poll(() => visibles(page)).toEqual(attendus({}));
  await expect(compteur(page)).toHaveText(`${total} outils affichés sur ${total}`);
});

test("deux statuts et une catégorie: « ou » dans un type, « et » entre les types", async ({ page }) => {
  await cocher(page, "statut", "libre");
  await cocher(page, "statut", "partiel");
  await cocher(page, "categorie", categorie);
  const etat = { statuts: ["libre", "partiel"], categories: [categorie] };
  expect(attendus(etat).length).toBeGreaterThan(0);
  await expect.poll(() => visibles(page)).toEqual(attendus(etat));
  await expect(compteur(page)).toHaveText(new RegExp(`^${attendus(etat).length} outils? affichés? sur ${total}$`));
  // Les catégories sans outil affiché sont masquées avec leur titre.
  await expect(page.locator("section[data-categorie]:visible")).toHaveCount(1);
});

test("un tag choisi exclut les outils non enrichis", async ({ page }) => {
  await cocher(page, "tag", "chiffrement");
  await expect.poll(() => visibles(page)).toEqual(attendus({ tags: ["chiffrement"] }));
});

test("la recherche ignore la casse et les accents", async ({ page }) => {
  await page.getByLabel("Chercher un outil par son nom").fill("ELOD");
  await expect.poll(() => visibles(page)).toEqual(attendus({ q: "elod" }));
  expect(await visibles(page)).toContain(identifiant("Élodia"));
});

test("aucun résultat: un message, et « Effacer les filtres » rétablit la liste", async ({ page }) => {
  await page.getByLabel("Chercher un outil par son nom").fill("zzzzzz");
  await expect(page.getByText("Aucun outil ne correspond à ces choix.")).toBeVisible();
  await expect(compteur(page)).toHaveText(`0 outil affiché sur ${total}`);
  await page.getByRole("button", { name: "Effacer les filtres" }).click();
  await expect.poll(() => visibles(page)).toEqual(attendus({}));
  await expect(page.getByLabel("Chercher un outil par son nom")).toHaveValue("");
  await expect(page.getByText("Aucun outil ne correspond à ces choix.")).toBeHidden();
});

test("l'adresse reflète les choix, et l'ouvrir ailleurs restaure la même liste et les mêmes cases", async ({ page, context }) => {
  await cocher(page, "statut", "libre");
  await cocher(page, "tag", "chiffrement");
  await page.getByLabel("Chercher un outil par son nom").fill("a");
  const etat = { statuts: ["libre"], tags: ["chiffrement"], q: "a" };
  await expect(page).toHaveURL(/\?tag=chiffrement&statut=libre&q=a$/);
  const liste = await visibles(page);
  expect(liste).toEqual(attendus(etat));

  const autre = await context.newPage();
  await autre.goto(page.url());
  await expect(autre.locator("form[data-filtres]")).toBeVisible();
  await expect.poll(() => visibles(autre)).toEqual(liste);
  await expect(autre.locator('input[name="statut"][value="libre"]')).toBeChecked();
  await expect(autre.locator('input[name="tag"][value="chiffrement"]')).toBeChecked();
  await expect(autre.getByLabel("Chercher un outil par son nom")).toHaveValue("a");
});

test("sans choix, l'adresse redevient celle de l'accueil", async ({ page }) => {
  await cocher(page, "statut", "libre");
  await expect(page).toHaveURL(/\?statut=libre$/);
  await page.locator('input[name="statut"][value="libre"]').uncheck();
  await expect(page).toHaveURL(/\/$/);
});

test("le bouton précédent ramène à l'état précédent des filtres", async ({ page }) => {
  await cocher(page, "statut", "libre");
  await cocher(page, "statut", "partiel");
  await expect.poll(() => visibles(page)).toEqual(attendus({ statuts: ["libre", "partiel"] }));
  await page.goBack();
  await expect(page.locator('input[name="statut"][value="partiel"]')).not.toBeChecked();
  await expect(page.locator('input[name="statut"][value="libre"]')).toBeChecked();
  await expect.poll(() => visibles(page)).toEqual(attendus({ statuts: ["libre"] }));
  await page.goForward();
  await expect.poll(() => visibles(page)).toEqual(attendus({ statuts: ["libre", "partiel"] }));
});

test("une valeur inconnue dans l'adresse est ignorée, les autres s'appliquent", async ({ page }) => {
  await page.goto("/?categorie=inconnue&statut=libre");
  await expect(page.locator("form[data-filtres]")).toBeVisible();
  await expect.poll(() => visibles(page)).toEqual(attendus({ statuts: ["libre"] }));
});

test("les liens de catégorie et de tag d'une fiche ouvrent l'accueil filtré", async ({ page }) => {
  const outil = actifs.find((o) => (o.tags ?? []).length > 0)!;
  await page.goto(`/outils/${identifiant(outil.nom)}/`);
  await page.locator('[data-section="tags"] dt a').first().click();
  await expect(page.locator("form[data-filtres]")).toBeVisible();
  await expect.poll(() => visibles(page)).toEqual(attendus({ tags: [outil.tags![0]!] }));
  await page.goto(`/outils/${identifiant(outil.nom)}/`);
  await page.locator("[data-section-entete] .fiche-meta a").first().click();
  await expect.poll(() => visibles(page)).toEqual(attendus({ categories: [outil.categorie] }));
});

test("filtrer les cartes prend moins de 100 ms", async ({ page }) => {
  const duree = await page.evaluate(async () => {
    const case_ = document.querySelector<HTMLInputElement>('input[name="statut"][value="libre"]')!;
    const debut = performance.now();
    case_.click();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    return performance.now() - debut;
  });
  expect(duree).toBeLessThan(100);
});
