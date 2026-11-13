// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Accessibilité (FR-029, FR-030, SC-008): aucune violation axe de niveau A ou AA (WCAG 2.1), en thème clair et en
// thème sombre, et un parcours complet au clavier seul.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { actifs, identifiant } from "./donnees.ts";

const un = (critere: (o: (typeof actifs)[number]) => boolean) => `/outils/${identifiant(actifs.find(critere)!.nom)}/`;
const PAGES: [string, string][] = [
  ["accueil", "/"],
  ["accueil filtré", "/?statut=libre&q=a"],
  ["fiche enrichie de Praxis", un((o) => o.source_repertoire_id === "praxis" && o.enrichi_le !== undefined)],
  ["fiche d'un service FACiL", un((o) => o.source_repertoire_id === "facil")],
  ["fiche d'une alternative de Charles", un((o) => o.source_repertoire_id === "charles" && o.enrichi_le !== undefined)],
  ["fiche non enrichie", un((o) => o.enrichi_le === undefined)],
  ["page introuvable", "/404.html"],
];

async function violations(page: Page): Promise<string[]> {
  const resultat = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return resultat.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} élément(s), ex. ${v.nodes[0]?.html.slice(0, 120)})`);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`thème ${theme === "light" ? "clair" : "sombre"}`, () => {
    test.use({ colorScheme: theme });
    test("le thème demandé par le système est bien appliqué", async ({ page }) => {
      await page.goto("/");
      // Luminosité du fond de page: sombre en thème sombre, claire en thème clair.
      const clarte = await page.evaluate(() => {
        const toile = document.createElement("canvas").getContext("2d")!;
        toile.fillStyle = getComputedStyle(document.documentElement).backgroundColor;
        toile.fillRect(0, 0, 1, 1);
        const [r, v, b] = toile.getImageData(0, 0, 1, 1).data;
        return (r! + v! + b!) / 3;
      });
      if (theme === "dark") expect(clarte).toBeLessThan(90);
      else expect(clarte).toBeGreaterThan(200);
    });
    for (const [nom, adresse] of PAGES) {
      test(`aucune violation axe A ou AA: ${nom}`, async ({ page }) => {
        await page.goto(adresse);
        if (adresse.startsWith("/?") || adresse === "/") await expect(page.locator("form[data-filtres]")).toBeVisible();
        expect(await violations(page)).toEqual([]);
      });
    }
  });
}

test("parcours au clavier seul: lien d'évitement, filtres, carte, fiche et retour", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("form[data-filtres]")).toBeVisible();

  // Premier arrêt: le lien d'évitement, visible quand il a le focus, qui mène au contenu.
  await page.keyboard.press("Tab");
  const evitement = page.getByRole("link", { name: "Aller au contenu" });
  await expect(evitement).toBeFocused();
  await expect(evitement).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenu$/);

  // Le champ de recherche se remplit au clavier et filtre la liste.
  const recherche = page.getByLabel("Chercher un outil par son nom");
  await recherche.focus();
  await page.keyboard.type("next");
  await expect(page.locator("[data-outil]:visible").first()).toBeVisible();

  // Une case se coche à la barre d'espace.
  const libre = page.locator('input[name="statut"][value="libre"]');
  await libre.focus();
  await page.keyboard.press("Space");
  await expect(libre).toBeChecked();

  // Chaque élément qui reçoit le focus a un contour visible.
  const contour = await libre.evaluate((e) => getComputedStyle(e).outlineStyle !== "none" && parseFloat(getComputedStyle(e).outlineWidth) > 0);
  expect(contour).toBe(true);

  // La première carte visible s'ouvre à la touche Entrée, et le lien de retour ramène à la liste.
  const lien = page.locator("[data-outil]:visible a").first();
  const nom = await lien.textContent();
  await lien.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText(nom!);
  const retour = page.getByRole("link", { name: "Retour à la liste des outils" });
  await retour.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toContainText("Répertoire d'outils");
});
