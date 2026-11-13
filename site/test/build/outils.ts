// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Outils des tests du site bâti: bâtit site/dist avec les vraies données quand il manque ou qu'il est périmé,
// et lit ses pages avec linkedom, sans exécuter de script (ce que voit un navigateur sans JavaScript).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { chargerDonnees, type Donnees } from "../../src/lib/donnees.ts";

export const DIST = "dist";
const FICHIERS_DONNEES = ["outils.json", "categories.json", "criteres.json", "tags.json", "sources.json"].map((f) => join("..", f));

function fichiersDe(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiersDe(join(dossier, e.name)) : [join(dossier, e.name)]));
}

/** Bâtit le site si dist/ manque ou est plus vieux que les données, les sources ou la configuration. */
export function batirAuBesoin(): void {
  const temoin = join(DIST, "index.html");
  const sources = [...FICHIERS_DONNEES, ...fichiersDe("src"), ...fichiersDe("postcss"), "astro.config.mjs", "postcss.config.mjs", "package.json"];
  const plusRecent = Math.max(...sources.map((f) => statSync(f).mtimeMs));
  if (existsSync(temoin) && statSync(temoin).mtimeMs >= plusRecent) return;
  // Sans DONNEES ni SITE_BASE: le site des vraies données, à la racine.
  const { DONNEES: _d, SITE_BASE: _b, SITE_URL: _u, ...env } = process.env;
  execFileSync("nub", ["run", "build"], { stdio: "pipe", env });
}

/** Toutes les pages HTML de dist/, par chemin relatif (« index.html », « outils/nextcloud/index.html »). */
export function pages(): string[] {
  return fichiersDe(DIST)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.slice(DIST.length + 1))
    .sort();
}

export function lirePage(chemin: string): Document {
  return parseHTML(readFileSync(join(DIST, chemin), "utf8")).document as unknown as Document;
}

/** Texte d'un élément, espaces réduits. */
export function texte(element: Element | null | undefined): string {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

let cache: Donnees | undefined;
export function donneesReelles(): Donnees {
  return (cache ??= chargerDonnees(".."));
}
