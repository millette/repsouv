// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Explorateur: tous les outils, triés et filtrés sans rechargement (US1 de specs/002-explorateur-outils).
import { expect, test } from "@playwright/test";
import { affiches, attendus, cocher, compteur, deplier, donnees, ouvrir, texteCompteur, total } from "./explorateur.ts";

test.beforeEach(async ({ page }) => {
  await ouvrir(page);
});

test("au départ: tous les outils, par catégorie puis par nom, et le compteur le dit", async ({ page }) => {
  await expect.poll(() => affiches(page)).toEqual(attendus());
  await expect(compteur(page)).toHaveText(texteCompteur(total));
  await expect(page.locator("[data-tri]")).toContainText("Tri : catégorie, ordre croissant");
});

test("tri par score décroissant, puis par nom: l'ordre change sans recharger la page et le tri est écrit", async ({ page }) => {
  await page.evaluate(() => ((window as unknown as { temoin: boolean }).temoin = true));
  await page.getByLabel("Trier par").selectOption("score");
  await page.getByLabel("Ordre").selectOption("desc");
  await expect.poll(() => affiches(page)).toEqual(attendus({ tri: "score", sens: "desc" }));
  await expect(page.locator("[data-tri]")).toContainText("Tri : score, ordre décroissant");
  await page.getByLabel("Trier par").selectOption("nom");
  await page.getByLabel("Ordre").selectOption("asc");
  await expect.poll(() => affiches(page)).toEqual(attendus({ tri: "nom" }));
  // La page n'a pas été rechargée: le témoin posé avant les choix est toujours là.
  expect(await page.evaluate(() => (window as unknown as { temoin?: boolean }).temoin)).toBe(true);
});

test("score minimal", async ({ page }) => {
  await cocher(page, "score", "2");
  await expect.poll(() => affiches(page)).toEqual(attendus({ scoreMin: 2 }));
  await expect(compteur(page)).toHaveText(texteCompteur(attendus({ scoreMin: 2 }).length));
});

test("verdict d'un critère vérifié", async ({ page }) => {
  await deplier(page, "verdicts");
  await page.locator('select[name="donnees"]').selectOption("confirme");
  await expect.poll(() => affiches(page)).toEqual(attendus({ verdicts: { donnees: "confirme" } }));
  await page.locator('select[name="controle"]').selectOption("infirme");
  await expect.poll(() => affiches(page)).toEqual(attendus({ verdicts: { donnees: "confirme", controle: "infirme" } }));
  await page.locator('select[name="donnees"]').selectOption("indetermine");
  const indetermines = attendus({ verdicts: { donnees: "indetermine", controle: "infirme" } });
  await expect.poll(() => affiches(page)).toEqual(indetermines);
  // Aucun outil non vérifié parmi eux.
  for (const id of indetermines) expect(donnees.outils.find((o) => o.id === id)!.verdicts).toBeDefined();
});

test("pays, source, enrichissement", async ({ page }) => {
  const pays = donnees.pays.slice(0, 2).map((p) => p.code);
  for (const code of pays) await cocher(page, "pays", code);
  await expect.poll(() => affiches(page)).toEqual(attendus({ pays }));
  await page.getByRole("button", { name: "Effacer les choix" }).click();
  await cocher(page, "source", "facil");
  await expect.poll(() => affiches(page)).toEqual(attendus({ sources: ["facil"] }));
  await page.getByRole("button", { name: "Effacer les choix" }).click();
  await cocher(page, "enrichi", "non");
  await expect.poll(() => affiches(page)).toEqual(attendus({ enrichi: "non" }));
  expect(attendus({ enrichi: "non" }).length).toBeGreaterThan(0);
});

test("catégorie, tag, statut et recherche, puis leur combinaison", async ({ page }) => {
  const categorie = donnees.outils.find((o) => o.statut === "libre")!.categorie;
  await cocher(page, "categorie", categorie);
  await expect.poll(() => affiches(page)).toEqual(attendus({ categories: [categorie] }));
  await cocher(page, "statut", "libre");
  await cocher(page, "statut", "partiel");
  await expect.poll(() => affiches(page)).toEqual(attendus({ categories: [categorie], statuts: ["libre", "partiel"] }));
  await page.getByRole("button", { name: "Effacer les choix" }).click();
  await cocher(page, "tag", "chiffrement");
  await expect.poll(() => affiches(page)).toEqual(attendus({ tags: ["chiffrement"] }));
  await page.getByLabel("Chercher un outil par son nom").fill("PRO");
  await expect.poll(() => affiches(page)).toEqual(attendus({ tags: ["chiffrement"], q: "pro" }));
});

test("aucun résultat: un message, et « Effacer les choix » rétablit la liste en gardant le tri", async ({ page }) => {
  await page.getByLabel("Trier par").selectOption("nom");
  await page.getByLabel("Chercher un outil par son nom").fill("zzzzzz");
  await expect(page.getByText("Aucun outil ne correspond à ces choix.")).toBeVisible();
  await expect(compteur(page)).toHaveText(texteCompteur(0));
  await page.locator(".resultats").getByRole("button", { name: "Effacer les choix" }).click();
  await expect.poll(() => affiches(page)).toEqual(attendus({ tri: "nom" }));
  await expect(page.getByLabel("Chercher un outil par son nom")).toHaveValue("");
});

test("le nom d'un résultat est un lien vers sa fiche, qui ouvre ses détails dans une boîte d'où la fiche s'ouvre", async ({ page }) => {
  const premier = donnees.outils.find((o) => o.id === attendus()[0])!;
  const nom = page.locator(`.resultats [data-outil="${premier.id}"] a`);
  await expect(nom).toHaveAttribute("href", `/outils/${premier.id}/`);
  await nom.click();
  await page.getByRole("dialog", { name: premier.nom }).getByRole("link", { name: /Ouvrir la fiche/ }).click();
  await expect(page.locator("h1")).toHaveText(premier.nom);
});

test("les champs produits par IA et les scores estimés sont signalés en texte", async ({ page }) => {
  const estime = donnees.outils.find((o) => o.scoreEstime && o.statut !== "non-enrichi")!;
  const carte = page.locator(`.resultats [data-outil="${estime.id}"]`);
  await expect(carte).toContainText("score estimé");
  await expect(carte).toContainText("Produit par IA, à vérifier");
  const nonEnrichi = donnees.outils.find((o) => o.statut === "non-enrichi")!;
  await expect(page.locator(`.resultats [data-outil="${nonEnrichi.id}"]`)).not.toContainText("Produit par IA");
  for (const groupe of ["statut", "tag", "verdicts"]) {
    await deplier(page, groupe);
    await expect(page.locator(`details[data-groupe="${groupe}"]`)).toContainText("Produit par IA, à vérifier");
  }
});

test("un filtre s'applique en moins de 100 ms", async ({ page }) => {
  const duree = await page.evaluate(async () => {
    const libre = document.querySelector<HTMLInputElement>('input[name="statut"][value="libre"]')!;
    const debut = performance.now();
    libre.click();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    return performance.now() - debut;
  });
  expect(duree).toBeLessThan(100);
});

test("la page ne lance aucune requête qui échoue", async ({ page }) => {
  const echecs: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) echecs.push(`${r.status()} ${r.url()}`);
  });
  await ouvrir(page);
  await expect.poll(() => affiches(page)).toEqual(attendus());
  await page.waitForLoadState("networkidle");
  expect(echecs).toEqual([]);
});
