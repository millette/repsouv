// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Outils des tests de l'explorateur: les données du site bâti, et ce que les fonctions pures en attendent.
import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { connuesDe, ecrireEtat, type Etat, etatParDefaut } from "../../src/lib/etat.ts";
import type { DonneesExplorateur } from "../../src/lib/explorateur.ts";
import { retenu } from "../../src/lib/selection.ts";
import { trier } from "../../src/lib/tri.ts";

export const donnees = JSON.parse(readFileSync("dist/explorateur.json", "utf8")) as DonneesExplorateur;
export const connues = connuesDe(donnees);
export const total = donnees.outils.length;

export const etat = (choix: Partial<Etat> = {}): Etat => ({ ...etatParDefaut(), ...choix });

/** Identifiants attendus pour un état, dans l'ordre que la règle de tri donne. */
export function attendus(choix: Partial<Etat> = {}): string[] {
  const e = etat(choix);
  return trier(donnees.outils.filter((o) => retenu(o, e)), e.tri, e.sens, connues.categories).map((o) => o.id);
}

export const adresse = (choix: Partial<Etat> = {}): string => {
  const p = ecrireEtat(etat(choix), connues);
  return "/explorer/" + (p ? `?${p}` : "");
};

/** Identifiants des résultats affichés (cartes ou lignes du tableau), dans l'ordre de la page. */
export const affiches = (page: Page): Promise<string[]> => page.locator(".resultats [data-outil]").evaluateAll((e) => e.map((x) => x.getAttribute("data-outil")!));

export async function ouvrir(page: Page, chemin = "/explorer/"): Promise<void> {
  await page.goto(chemin);
  await expect(page.locator("form[data-commandes]")).toBeVisible();
}

/** Ouvre le groupe repliable d'un filtre s'il est fermé. */
export async function deplier(page: Page, groupe: string): Promise<void> {
  const details = page.locator(`details[data-groupe="${groupe}"]`);
  if (!(await details.evaluate((d) => (d as HTMLDetailsElement).open))) await details.locator("summary").click();
}

export async function cocher(page: Page, nom: string, valeur: string): Promise<void> {
  await deplier(page, nom);
  await page.locator(`input[name="${nom}"][value="${valeur}"]`).check();
}

export const compteur = (page: Page) => page.locator("[data-compteur]");
export const texteCompteur = (n: number) => new RegExp(`^${n} outils? affichés? sur ${total}`);
