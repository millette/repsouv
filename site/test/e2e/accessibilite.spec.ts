// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Accessibilité: aucune violation axe de niveau A ou AA (WCAG 2.1), en thème clair et en thème sombre, et un
// parcours complet au clavier seul.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { actifs, identifiant } from "./donnees.ts";

const un = (critere: (o: (typeof actifs)[number]) => boolean) => `/outils/${identifiant(actifs.find(critere)!.nom)}/`;
const PAGES: [string, string][] = [
  ["accueil", "/"],
  ["page « Outils »", "/outils/"],
  ["fiche enrichie de Praxis", un((o) => o.source_repertoire_id === "praxis" && o.enrichi_le !== undefined)],
  ["fiche d'un service FACiL", un((o) => o.source_repertoire_id === "facil")],
  ["fiche d'une alternative de Charles", un((o) => o.source_repertoire_id === "charles" && o.enrichi_le !== undefined)],
  ["fiche non enrichie", un((o) => o.enrichi_le === undefined)],
  ["page introuvable", "/404.html"],
];

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
  const outils = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Outils" });
  await outils.focus();
  const contour = await outils.evaluate((e) => getComputedStyle(e).outlineStyle !== "none" && parseFloat(getComputedStyle(e).outlineWidth) > 0);
  expect(contour).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText("Outils");

  // La première carte s'ouvre à la touche Entrée, et le lien de retour ramène à la liste.
  const lien = page.locator("[data-outil] a").first();
  const nom = await lien.textContent();
  await lien.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText(nom!);
  const retour = page.getByRole("link", { name: "Retour à la liste des outils" });
  await retour.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText("Outils");
});
