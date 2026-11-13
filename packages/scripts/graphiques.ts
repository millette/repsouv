// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Graphiques du sommaire: les spécifications Vega-Lite construites par packages/commun/graphiques.ts (calcul pur)
// sont converties ici en SVG par vl-convert (https://github.com/vega/vl-convert) et écrites sur le disque.
// vl-convert est appelé avec la locale fr-CA pour les axes.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { TopLevelSpec } from "vega-lite";
import { IDS_GRAPHIQUES, type Graphique } from "../commun/graphiques.ts";

// La construction des graphiques vit dans packages/commun; elle est réexportée ici pour les appelants du sommaire.
export { construireGraphiques, IDS_GRAPHIQUES } from "../commun/graphiques.ts";
export type { Graphique } from "../commun/graphiques.ts";

/** Version de Vega-Lite utilisée par vl-convert (voir `vl-convert vl2svg --help`). */
export const VERSION_VEGA_LITE = "6.1";

// ---------- conversion avec vl-convert ----------

export const COMMANDE_VL_CONVERT = "vl-convert";
export const AIDE_VL_CONVERT =
  "vl-convert est introuvable. L'installer (`cargo install vl-convert`, ou un binaire de https://github.com/vega/vl-convert/releases) ou utiliser --sans-graphiques";

function lancerVlConvert(commande: string, args: string[]): void {
  const r = spawnSync(commande, args, { encoding: "utf8" });
  if ((r.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") throw new Error(AIDE_VL_CONVERT);
  if (r.error) throw new Error(`${commande}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${commande} ${args[0]}: ${(r.stderr || r.stdout).trim() || `code ${r.status}`}`);
}

/** Vérifie que vl-convert est installé (à appeler avant tout travail coûteux). */
export function verifierVlConvert(commande: string = COMMANDE_VL_CONVERT): string {
  const r = spawnSync(commande, ["--version"], { encoding: "utf8" });
  if (r.error || r.status !== 0) throw new Error(AIDE_VL_CONVERT);
  return r.stdout.trim();
}

/**
 * Convertit une spécification Vega-Lite en SVG. Le SVG est autonome (texte, formes, aucun script ni
 * ressource externe), ce que GitHub et les autres forges affichent dans le Markdown; aucun PNG.
 */
export type Convertisseur = (spec: TopLevelSpec, cheminSvg: string) => void;

export function convertirAvecVlConvert(spec: TopLevelSpec, cheminSvg: string, commande: string = COMMANDE_VL_CONVERT): void {
  const dossier = mkdtempSync(join(tmpdir(), "vl-"));
  try {
    const entree = join(dossier, "spec.vl.json");
    writeFileSync(entree, JSON.stringify(spec));
    const communs = ["--vl-version", VERSION_VEGA_LITE, "--format-locale", "fr-CA", "--time-format-locale", "fr-CA"];
    lancerVlConvert(commande, ["vl2svg", "-i", entree, "-o", cheminSvg, ...communs]);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

export interface GraphiqueEcrit {
  id: string;
  titre: string;
  description: string;
  /** Chemin relatif au sommaire (ex. graphiques/statut-code-source.svg). */
  svg: string;
}

/**
 * Écrit chaque graphique en SVG dans `dossier`, et supprime les fichiers des graphiques connus qui ne
 * sont plus produits, ainsi que les PNG que les versions antérieures produisaient. Retourne les chemins
 * relatifs au dossier parent.
 */
/** Suivi de l'écriture, pour une barre de progression: avant chaque graphique, puis après, avec le nombre écrit. */
export interface SuiviGraphiques {
  debut?: (graphique: Graphique) => void;
  fin?: (ecrits: number) => void;
}

export function ecrireGraphiques(graphiques: Graphique[], dossier: string, convertir: Convertisseur = convertirAvecVlConvert, suivi: SuiviGraphiques = {}): GraphiqueEcrit[] {
  mkdirSync(dossier, { recursive: true });
  const produits = new Set(graphiques.map((g) => g.id));
  for (const id of IDS_GRAPHIQUES) {
    rmSync(join(dossier, `${id}.png`), { force: true });
    if (!produits.has(id)) rmSync(join(dossier, `${id}.svg`), { force: true });
  }
  const nom = basename(dossier);
  return graphiques.map((g, i) => {
    suivi.debut?.(g);
    convertir(g.spec, join(dossier, `${g.id}.svg`));
    suivi.fin?.(i + 1);
    return { id: g.id, titre: g.titre, description: g.description, svg: `${nom}/${g.id}.svg` };
  });
}
