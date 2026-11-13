// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Page « Statistiques » dans un navigateur (specs/003-page-statistiques/contracts): images sans JavaScript, puis vue
// interactive (survol, flèches, légende, thème), liens vers l'explorateur, et image conservée si la vue échoue.
import { expect, type Locator, type Page, test } from "@playwright/test";

const figure = (page: Page, id: string) => page.locator(`figure[data-graphique="${id}"]`);

/** Fait défiler jusqu'au graphique et attend que sa vue interactive ait remplacé l'image. */
async function vue(page: Page, id: string): Promise<Locator> {
  const f = figure(page, id);
  await f.scrollIntoViewIfNeeded();
  await expect(f.locator("[data-vue-prete]")).toBeVisible();
  return f;
}

/** Texte des lignes du tableau d'un graphique, comme l'île les annonce. */
async function lignes(f: Locator): Promise<string[]> {
  return f.locator("table").evaluate((table) => {
    const entetes = [...table.querySelectorAll("thead th")].map((th) => (th.textContent ?? "").trim());
    return [...table.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td, i) => `${entetes[i]} : ${(td.textContent ?? "").trim()}`).join(" ; "));
  });
}

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false, colorScheme: "light" });

  test("chaque graphique montre son image avec son texte de remplacement, et « Voir les chiffres » ouvre le tableau", async ({ page }) => {
    await page.goto("/statistiques/");
    await expect(page.locator("figure[data-graphique]")).toHaveCount(9);
    for (const f of await page.locator("figure[data-graphique]").all()) {
      const image = f.locator("img.graphique-clair");
      await expect(image).toBeVisible();
      await expect(f.locator("img.graphique-sombre")).toBeHidden();
      expect((await image.getAttribute("alt"))!.length).toBeGreaterThan(20);
      await expect(f.locator("[data-vue-prete]")).toHaveCount(0);
    }
    const statut = figure(page, "statut-code-source");
    await expect(statut.locator("table")).toBeHidden();
    await statut.locator("summary").click();
    await expect(statut.locator("table")).toBeVisible();
    // Les images se chargent vraiment: largeur naturelle non nulle.
    const image = statut.locator("img.graphique-clair");
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });
});

test.describe("sans JavaScript, système en thème sombre", () => {
  test.use({ javaScriptEnabled: false, colorScheme: "dark" });

  test("l'image visible est celle du thème sombre", async ({ page }) => {
    await page.goto("/statistiques/");
    const f = figure(page, "statut-code-source");
    await expect(f.locator("img.graphique-sombre")).toBeVisible();
    await expect(f.locator("img.graphique-clair")).toBeHidden();
  });
});

test.describe("avec JavaScript", () => {
  test.use({ colorScheme: "light" });

  test("la vue interactive remplace l'image quand le graphique devient visible", async ({ page }) => {
    await page.goto("/statistiques/");
    const f = await vue(page, "statut-code-source");
    await expect(f.locator("img.graphique-clair")).toBeHidden();
    await expect(f.locator("[data-vue] svg")).toBeVisible();
    await expect(f.locator("[data-vue] svg")).toHaveAttribute("role", "img");
    expect((await f.locator("[data-vue] svg").getAttribute("aria-label"))!.length).toBeGreaterThan(20);
  });

  test("survoler une barre affiche sa valeur exacte dans une infobulle, sans attribut title", async ({ page }) => {
    await page.goto("/statistiques/");
    const f = await vue(page, "statut-code-source");
    const attendues = await lignes(f);
    await f.locator("[data-vue] svg path[aria-roledescription='bar'], [data-vue] svg .mark-rect path").first().hover();
    await expect(f.locator("[data-infobulle]")).toBeVisible();
    expect(attendues).toContain((await f.locator("[data-infobulle]").textContent())!.trim());
    await expect(f.locator("[data-vue] [title]")).toHaveCount(0);
  });

  test("un seul arrêt de tabulation par graphique, puis les flèches donnent chaque valeur", async ({ page }) => {
    await page.goto("/statistiques/");
    const f = await vue(page, "statut-code-source");
    const attendues = await lignes(f);
    const parcours = f.locator(".graphique-parcours");
    await parcours.focus();
    const valeur = f.locator("[data-valeur]");
    await expect(valeur).toHaveText("");
    await page.keyboard.press("ArrowRight");
    await expect(valeur).toHaveText(attendues[0]!);
    await page.keyboard.press("ArrowDown");
    await expect(valeur).toHaveText(attendues[1]!);
    await page.keyboard.press("ArrowLeft");
    await expect(valeur).toHaveText(attendues[0]!);
    await page.keyboard.press("End");
    await expect(valeur).toHaveText(attendues.at(-1)!);
    await page.keyboard.press("Home");
    await expect(valeur).toHaveText(attendues[0]!);
    await page.keyboard.press("Escape");
    await expect(valeur).toHaveText("");
    await expect(valeur).toHaveAttribute("aria-live", "polite");
    // La tabulation suivante quitte le graphique: elle ne s'arrête sur aucune barre.
    await page.keyboard.press("Tab");
    await expect(parcours).not.toBeFocused();
    expect(await f.locator("[data-vue] [tabindex]").count()).toBe(0);
  });

  test("la légende met une série en évidence, puis rétablit l'affichage", async ({ page }) => {
    await page.goto("/statistiques/");
    const f = await vue(page, "categories-statut");
    const libre = f.getByRole("button", { name: "Libre", exact: true });
    await expect(libre).toHaveAttribute("aria-pressed", "false");
    const estompees = () => f.locator("[data-vue] svg path").evaluateAll((p) => p.filter((e) => Number(getComputedStyle(e).opacity) < 0.5 || Number(e.getAttribute("opacity") ?? 1) < 0.5 || Number(e.getAttribute("fill-opacity") ?? 1) < 0.5).length);
    expect(await estompees()).toBe(0);
    await libre.click();
    await expect(libre).toHaveAttribute("aria-pressed", "true");
    await expect.poll(estompees).toBeGreaterThan(0);
    await libre.click();
    await expect(libre).toHaveAttribute("aria-pressed", "false");
    await expect.poll(estompees).toBe(0);
    // Un graphique sans série à isoler n'a pas ces boutons.
    await expect(figure(page, "forges").getByRole("group", { name: "Mettre une série en évidence" })).toHaveCount(0);
  });

  test("basculer le thème de la page fait passer les graphiques au sombre", async ({ page }) => {
    await page.goto("/statistiques/");
    const f = await vue(page, "statut-code-source");
    // Dans le navigateur, vega pose le fond du graphique en style sur l'élément SVG.
    const fond = () => f.locator("[data-vue] svg").evaluate((svg) => getComputedStyle(svg).backgroundColor);
    expect(await fond()).toBe("rgb(255, 255, 255)");
    await page.locator("label.interrupteur-theme").click();
    await expect.poll(fond).toBe("rgb(29, 35, 42)");
    // Les couleurs des séries, elles, ne changent pas.
    const couleurs = await f.locator("[data-vue] svg path").evaluateAll((p) => p.map((e) => (e.getAttribute("fill") ?? "").toLowerCase()));
    expect(couleurs).toContain("#009e73");
  });

  test("une ligne du tableau des statuts mène à l'explorateur, qui montre autant d'outils", async ({ page }) => {
    await page.goto("/statistiques/");
    const f = figure(page, "statut-code-source");
    await f.locator("summary").click();
    const ligne = f.locator("tbody tr", { has: page.getByRole("link", { name: "Libre", exact: true }) });
    const outils = (await ligne.locator("td").nth(1).textContent())!.trim();
    await ligne.getByRole("link", { name: "Libre", exact: true }).click();
    await expect(page.locator("form[data-commandes]")).toBeVisible();
    await expect(page.locator("[data-compteur]")).toContainText(new RegExp(`^${outils} outils affichés`));
  });

  test("si la spécification d'un graphique ne se charge pas, son image reste affichée", async ({ page }) => {
    await page.route("**/graphiques/forges-*.json", (route) => route.fulfill({ status: 500, body: "panne" }));
    await page.goto("/statistiques/");
    const f = figure(page, "forges");
    await f.scrollIntoViewIfNeeded();
    await vue(page, "tags");
    await expect(f.locator("img.graphique-clair")).toBeVisible();
    await expect(f.locator("[data-vue-prete]")).toHaveCount(0);
  });
});
