// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Accessibilité: aucune violation axe de niveau A ou AA (WCAG 2.1), en thème clair et en thème sombre, et un
// parcours complet au clavier seul.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { actifs, identifiant } from "./donnees.ts";
import { affiches, attendus, donnees, pret } from "./explorateur.ts";

const un = (critere: (o: (typeof actifs)[number]) => boolean) => `/outils/${identifiant(actifs.find(critere)!.nom)}/`;
const PAGES: [string, string][] = [
  ["accueil", "/"],
  ["fiche enrichie de Praxis", un((o) => o.source_repertoire_id === "praxis" && o.enrichi_le !== undefined)],
  ["fiche d'un service FACiL", un((o) => o.source_repertoire_id === "facil")],
  ["fiche d'une alternative de Charles", un((o) => o.source_repertoire_id === "charles" && o.enrichi_le !== undefined)],
  ["fiche non enrichie", un((o) => o.enrichi_le === undefined)],
  ["page introuvable", "/404.html"],
];
const quatre = donnees.outils.slice(0, 4).map((o) => `comparer=${o.id}`).join("&");
/** États de l'explorateur à contrôler: l'île doit être montée avant l'analyse. */
const EXPLORATEUR: [string, string][] = [
  ["explorateur en cartes, « Trier et filtrer » ouvert", "/explorer/"],
  ["explorateur en tableau, filtres ouverts", "/explorer/?vue=tableau&statut=libre&score=1&donnees=confirme&pays=FR&source=praxis&enrichi=oui&tag=chiffrement"],
  ["explorateur avec une comparaison de quatre outils", `/explorer/?${quatre}`],
  ["explorateur sans résultat", "/explorer/?q=zzzzzz"],
];
const detaille = donnees.outils.find((o) => o.verdicts && o.licence && o.tags.length > 0)!.id;

export async function violations(page: Page): Promise<string[]> {
  const resultat = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return resultat.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} élément(s), ex. ${v.nodes[0]?.html.slice(0, 120)})`);
}

/** Luminosité moyenne du fond de page, de 0 (noir) à 255 (blanc). */
const clarte = (page: Page) =>
  page.evaluate(() => {
    const toile = document.createElement("canvas").getContext("2d")!;
    toile.fillStyle = getComputedStyle(document.documentElement).backgroundColor;
    toile.fillRect(0, 0, 1, 1);
    const [r, v, b] = toile.getImageData(0, 0, 1, 1).data;
    return (r! + v! + b!) / 3;
  });

for (const theme of ["light", "dark"] as const) {
  test.describe(`thème ${theme === "light" ? "clair" : "sombre"}`, () => {
    test.use({ colorScheme: theme });
    test("le thème demandé par le système est bien appliqué", async ({ page }) => {
      await page.goto("/");
      if (theme === "dark") expect(await clarte(page)).toBeLessThan(90);
      else expect(await clarte(page)).toBeGreaterThan(200);
    });
    for (const [nom, adresse] of PAGES) {
      test(`aucune violation axe A ou AA: ${nom}`, async ({ page }) => {
        await page.goto(adresse);
        await expect(page.locator("[data-theme-pret]")).toBeVisible();
        expect(await violations(page)).toEqual([]);
      });
    }
    for (const [nom, adresse] of EXPLORATEUR) {
      test(`aucune violation axe A ou AA: ${nom}`, async ({ page }) => {
        await page.goto(adresse);
        await pret(page);
        await expect(page.locator("[data-theme-pret]")).toBeVisible();
        expect(await violations(page)).toEqual([]);
      });
    }
    test("aucune violation axe A ou AA: page « Statistiques », images seules", async ({ page }) => {
      await page.goto("/statistiques/");
      await expect(page.locator("[data-theme-pret]")).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
    test("aucune violation axe A ou AA: page « Statistiques », vues montées et tableaux ouverts", async ({ page }) => {
      await page.goto("/statistiques/");
      for (const f of await page.locator("figure[data-graphique]").all()) {
        await f.locator(".graphique-interactif").scrollIntoViewIfNeeded();
        await expect(f.locator("[data-vue-prete]")).toBeVisible();
        await f.locator("summary").click();
      }
      await page.locator('figure[data-graphique="categories-statut"]').getByRole("button", { name: "Libre", exact: true }).click();
      expect(await violations(page)).toEqual([]);
    });
    test("aucune violation axe A ou AA: explorateur, « Trier et filtrer » replié", async ({ page }) => {
      await page.goto("/explorer/");
      await expect(page.locator("details[data-commandes-repli]")).toBeVisible();
      await expect(page.locator("[data-theme-pret]")).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
    test("aucune violation axe A ou AA: explorateur, boîte « Détails » ouverte", async ({ page }) => {
      await page.goto(`/explorer/?fiche=${detaille}`);
      await expect(page.locator("dialog [data-details-contenu]")).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
    test("aucune violation axe A ou AA: explorateur en erreur de chargement", async ({ page }) => {
      await page.route("**/explorateur.json", (route) => route.fulfill({ status: 500, body: "panne" }));
      await page.goto("/explorer/");
      await expect(page.locator('main [role="alert"]')).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  });
}

test("parcours au clavier seul: lien d'évitement, navigation, liste, fiche et retour", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-theme-pret]")).toBeVisible();

  // Premier arrêt: le lien d'évitement, visible quand il a le focus, qui mène au contenu.
  await page.keyboard.press("Tab");
  const evitement = page.getByRole("link", { name: "Aller au contenu" });
  await expect(evitement).toBeFocused();
  await expect(evitement).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenu$/);

  // La navigation principale mène à la liste; le lien qui a le focus a un contour visible.
  const explorer = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Explorer" });
  await explorer.focus();
  const contour = await explorer.evaluate((e) => getComputedStyle(e).outlineStyle !== "none" && parseFloat(getComputedStyle(e).outlineWidth) > 0);
  expect(contour).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText("Explorer les outils");
  await expect(page.locator("details[data-commandes-repli]")).toBeVisible();

  // Le bloc « Trier et filtrer » s'ouvre au clavier.
  await page.locator("details[data-commandes-repli] > summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("form[data-commandes]")).toBeVisible();

  // Le nom de la première carte ouvre ses détails à la touche Entrée; de là, la fiche s'ouvre, et son lien de retour ramène à la liste.
  const lien = page.locator(".resultats [data-outil] a").first();
  const nom = await lien.textContent();
  await lien.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog", { name: nom! }).getByRole("link", { name: /Ouvrir la fiche/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText(nom!);
  const retour = page.getByRole("link", { name: "Retour à la liste des outils" });
  await retour.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText("Explorer les outils");
});

test("explorateur au clavier seul: chercher, filtrer, trier, choisir deux outils, lire la comparaison, ouvrir une fiche", async ({ page }) => {
  await page.goto("/explorer/");
  await pret(page);

  // Chercher: le champ reçoit le focus par tabulation depuis le début du contenu, puis se vide.
  const recherche = page.getByLabel("Chercher un outil par son nom");
  await recherche.focus();
  await page.keyboard.type("a");
  await expect.poll(() => affiches(page)).toEqual(attendus({ q: "a" }));
  await page.keyboard.press("Backspace");

  // Trier: la liste suivante est à une tabulation; les flèches changent le tri.
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Trier par")).toBeFocused();
  await page.getByLabel("Trier par").selectOption("nom");
  await expect.poll(() => affiches(page)).toEqual(attendus({ tri: "nom" }));

  // Filtrer: une case se coche à la barre d'espace, avec un contour de focus visible.
  const libre = page.locator('input[name="statut"][value="libre"]');
  await libre.focus();
  const contour = await libre.evaluate((e) => getComputedStyle(e).outlineStyle !== "none" && parseFloat(getComputedStyle(e).outlineWidth) > 0);
  expect(contour).toBe(true);
  await page.keyboard.press("Space");
  const liste = attendus({ tri: "nom", statuts: ["libre"] });
  await expect.poll(() => affiches(page)).toEqual(liste);

  // Choisir deux outils à comparer, à la barre d'espace.
  for (const id of liste.slice(0, 2)) {
    await page.locator(`.resultats [data-outil="${id}"] input[name="comparer"]`).focus();
    await page.keyboard.press("Space");
  }
  await expect(page.locator("table.tableau-comparaison caption")).toHaveText("Comparaison de 2 outils");

  // Le tableau de comparaison, qui peut défiler, est atteignable au clavier.
  await page.getByRole("region", { name: "Tableau de comparaison" }).focus();
  await expect(page.getByRole("region", { name: "Tableau de comparaison" })).toBeFocused();

  // Ouvrir les détails du premier outil comparé, puis sa fiche, à la touche Entrée.
  const lien = page.locator("table.tableau-comparaison thead th a").first();
  const nom = await lien.textContent();
  await lien.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog", { name: nom! }).getByRole("link", { name: /Ouvrir la fiche/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText(nom!);
});

test("statistiques au clavier seul: atteindre un graphique, lire une valeur aux flèches, mettre une série en évidence", async ({ page }) => {
  await page.goto("/statistiques/");
  const f = page.locator('figure[data-graphique="categories-statut"]');
  await f.locator(".graphique-interactif").scrollIntoViewIfNeeded();
  await expect(f.locator("[data-vue-prete]")).toBeVisible();
  const parcours = f.locator(".graphique-parcours");
  await parcours.focus();
  const contour = await parcours.evaluate((e) => getComputedStyle(e).outlineStyle !== "none" && parseFloat(getComputedStyle(e).outlineWidth) > 0);
  expect(contour).toBe(true);
  await page.keyboard.press("ArrowRight");
  await expect(f.locator("[data-valeur]")).toContainText("Catégorie :");
  // De là, une tabulation mène aux boutons de la légende; Espace en presse un.
  await page.keyboard.press("Tab");
  const premier = f.getByRole("group", { name: "Mettre une série en évidence" }).getByRole("button").first();
  await expect(premier).toBeFocused();
  await page.keyboard.press("Space");
  await expect(premier).toHaveAttribute("aria-pressed", "true");
  // Puis au bloc « Voir les chiffres », qui s'ouvre à la touche Entrée.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await f.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(f.locator("table")).toBeVisible();
});
