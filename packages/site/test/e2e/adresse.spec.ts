// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// L'adresse porte tout l'état de l'explorateur (US4 de specs/002-explorateur-outils, contracts/adresse.md).
import { expect, test } from "@playwright/test";
import { adresse, affiches, attendus, cocher, deplier, donnees, etat, ouvrir, total, pret } from "./explorateur.ts";

const [a, b] = donnees.outils.filter((o) => o.statut === "libre").map((o) => o.id);
const pays = donnees.pays[0]!.code;
const choix = { statuts: ["libre", "partiel"], pays: [] as string[], scoreMin: 1, verdicts: { donnees: "confirme" as const }, tri: "score" as const, sens: "desc" as const, vue: "tableau" as const, comparer: [a!, b!] };

test("sans choix, l'adresse est celle de la page", async ({ page }) => {
  await ouvrir(page);
  await cocher(page, "statut", "libre");
  await expect(page).toHaveURL(/\/explorer\/\?statut=libre$/);
  await page.locator('input[name="statut"][value="libre"]').uncheck();
  await expect(page).toHaveURL(/\/explorer\/$/);
});

test("l'adresse reflète le tri, les filtres, la vue et la comparaison; l'ouvrir ailleurs restaure tout", async ({ page, context }) => {
  await ouvrir(page);
  await cocher(page, "statut", "libre");
  await cocher(page, "statut", "partiel");
  await cocher(page, "score", "1");
  await deplier(page, "verdicts");
  await page.locator('select[name="donnees"]').selectOption("confirme");
  await page.getByLabel("Trier par").selectOption("score");
  await page.getByLabel("Ordre").selectOption("desc");
  for (const id of [a, b]) await page.locator(`.resultats [data-outil="${id}"] input[name="comparer"]`).check();
  await page.getByRole("radio", { name: "Tableau" }).check();
  await expect(page).toHaveURL(new RegExp(adresse(choix).replace(/[?]/g, "\\?") + "$"));
  const liste = await affiches(page);
  expect(liste).toEqual(attendus(choix));

  const autre = await context.newPage();
  await ouvrir(autre, adresse(choix));
  await expect.poll(() => affiches(autre)).toEqual(liste);
  await expect(autre.locator('[data-vue="tableau"]')).toBeVisible();
  await expect(autre.getByRole("radio", { name: "Tableau" })).toBeChecked();
  await expect(autre.getByLabel("Trier par")).toHaveValue("score");
  await expect(autre.getByLabel("Ordre")).toHaveValue("desc");
  await expect(autre.locator('input[name="statut"][value="libre"]')).toBeChecked();
  await expect(autre.locator('input[name="statut"][value="partiel"]')).toBeChecked();
  await expect(autre.locator('input[name="score"][value="1"]')).toBeChecked();
  await expect(autre.locator('select[name="donnees"]')).toHaveValue("confirme");
  await expect(autre.locator("table.tableau-comparaison thead th a")).toHaveText([a, b].map((id) => donnees.outils.find((o) => o.id === id)!.nom));
});

test("le bouton précédent ramène pas à pas aux états d'avant", async ({ page }) => {
  await ouvrir(page);
  await cocher(page, "statut", "libre");
  await page.getByLabel("Trier par").selectOption("nom");
  await page.getByRole("radio", { name: "Tableau" }).check();
  await expect.poll(() => affiches(page)).toEqual(attendus({ statuts: ["libre"], tri: "nom" }));
  await page.goBack();
  await expect(page.locator('[data-vue="cartes"]')).toBeVisible();
  await expect.poll(() => affiches(page)).toEqual(attendus({ statuts: ["libre"], tri: "nom" }));
  await page.goBack();
  await expect(page.getByLabel("Trier par")).toHaveValue("categorie");
  await expect.poll(() => affiches(page)).toEqual(attendus({ statuts: ["libre"] }));
  await page.goBack();
  await expect(page.locator('input[name="statut"][value="libre"]')).not.toBeChecked();
  await expect.poll(() => affiches(page)).toEqual(attendus());
  await page.goForward();
  await expect.poll(() => affiches(page)).toEqual(attendus({ statuts: ["libre"] }));
});

test("la frappe dans la recherche n'ajoute pas d'entrée d'historique", async ({ page }) => {
  await ouvrir(page);
  const avant = await page.evaluate(() => history.length);
  await page.getByLabel("Chercher un outil par son nom").pressSequentially("next");
  await expect(page).toHaveURL(/\?q=next$/);
  expect(await page.evaluate(() => history.length)).toBe(avant);
});

test("une adresse abîmée affiche la liste complète, sans erreur", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(String(e)));
  await ouvrir(page, "/explorer/?categorie=inconnue&tri=bidon&comparer=absent&score=9&donnees=oui&vue=x");
  await expect.poll(() => affiches(page)).toEqual(attendus());
  await expect(page.locator("[data-compteur]")).toContainText(`${total} outils affichés sur ${total}`);
  expect(erreurs).toEqual([]);
});

test("plus de quatre outils à comparer dans l'adresse: quatre sont retenus", async ({ page }) => {
  const cinq = donnees.outils.slice(0, 5).map((o) => o.id);
  await ouvrir(page, "/explorer/?" + cinq.map((id) => `comparer=${id}`).join("&"));
  await expect(page.locator("table.tableau-comparaison thead th a")).toHaveCount(4);
  expect(etat({ comparer: cinq.slice(0, 4) }).comparer).toHaveLength(4);
});

test("les liens de catégorie et de tag d'une fiche ouvrent l'explorateur filtré", async ({ page }) => {
  const outil = donnees.outils.find((o) => o.tags.length > 0)!;
  await page.goto(`/outils/${outil.id}/`);
  await page.locator('[data-section="tags"] dt a').first().click();
  await pret(page);
  await expect.poll(() => affiches(page)).toEqual(attendus({ tags: [outil.tags[0]!] }));
  await expect(page.locator(`input[name="tag"][value="${outil.tags[0]}"]`)).toBeChecked();
  await page.goto(`/outils/${outil.id}/`);
  await page.locator("[data-section-entete] .fiche-meta a").first().click();
  await expect.poll(() => affiches(page)).toEqual(attendus({ categories: [outil.categorie] }));
  void pays;
});
