// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Lecture des cinq fichiers de données du dépôt, tels quels, au moment de bâtir le site. Le site ne les écrit jamais.
// La forme complète est garantie par les schémas JSON du dépôt (nub run test à la racine); ici, seulement ce dont
// les pages ont besoin pour ne pas publier un site partiel: un message clair qui nomme le fichier fautif.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Categorie } from "../../../scripts/categories.ts";
import type { OutilClasse } from "../../../scripts/classify.ts";
import type { Tag } from "../../../scripts/enrichir.ts";
import type { Critere } from "../../../scripts/extract.ts";
import type { Metadonnees } from "../../../scripts/fichiers.ts";
import type { Source } from "../../../scripts/sources.ts";
import { depuisRacine } from "./chemins.ts";

export type { Categorie, Critere, Metadonnees, OutilClasse, Source, Tag };

export interface Donnees {
  /** Métadonnées de outils.json (licence, dates). */
  meta: Metadonnees;
  outils: OutilClasse[];
  categories: Categorie[];
  criteres: Critere[];
  tags: Tag[];
  sources: Source[];
}

const CHAMPS_OBLIGATOIRES = ["nom", "categorie", "score", "lien", "description", "source_repertoire_id"] as const;

/** Dossier des données: DONNEES (tests sur fixtures), sinon donnees/ à la racine du dépôt. */
export function dossierDonnees(): string {
  return process.env.DONNEES ? resolve(process.env.DONNEES) : depuisRacine("donnees");
}

function lireTableau<T>(dossier: string, fichier: string, cle: string): { meta: Metadonnees; donnees: T[] } {
  const chemin = join(dossier, fichier);
  let brut: string;
  try {
    brut = readFileSync(chemin, "utf8");
  } catch (erreur) {
    throw new Error(`${fichier}: fichier illisible (${chemin}): ${(erreur as Error).message}`);
  }
  let contenu: unknown;
  try {
    contenu = JSON.parse(brut);
  } catch (erreur) {
    throw new Error(`${fichier}: JSON invalide: ${(erreur as Error).message}`);
  }
  const objet = contenu as Record<string, unknown> | null;
  if (!objet || typeof objet !== "object" || typeof objet.meta !== "object" || objet.meta === null) throw new Error(`${fichier}: champ « meta » manquant`);
  const tableau = objet[cle];
  if (!Array.isArray(tableau)) throw new Error(`${fichier}: tableau « ${cle} » manquant`);
  if (tableau.length === 0) throw new Error(`${fichier}: tableau « ${cle} » vide`);
  return { meta: objet.meta as Metadonnees, donnees: tableau as T[] };
}

/** Charge et vérifie les cinq fichiers; lève une erreur qui nomme le fichier, et l'outil quand un renvoi est inconnu. */
export function chargerDonnees(dossier: string = dossierDonnees()): Donnees {
  const { meta, donnees: outils } = lireTableau<OutilClasse>(dossier, "outils.json", "outils");
  const categories = lireTableau<Categorie>(dossier, "categories.json", "categories").donnees;
  const criteres = lireTableau<Critere>(dossier, "criteres.json", "criteres").donnees;
  const tags = lireTableau<Tag>(dossier, "tags.json", "tags").donnees;
  const sources = lireTableau<Source>(dossier, "sources.json", "sources").donnees;

  const idsCategories = new Set(categories.map((c) => c.id));
  const idsSources = new Set(sources.map((s) => s.id));
  const idsTags = new Set(tags.map((t) => t.id));
  outils.forEach((outil, i) => {
    const o = outil as unknown as Record<string, unknown>;
    for (const champ of CHAMPS_OBLIGATOIRES) {
      if (o[champ] === undefined || o[champ] === null || o[champ] === "") throw new Error(`outils.json: outil nº ${i + 1} (${String(o.nom ?? "sans nom")}): champ « ${champ} » manquant`);
    }
    if (!idsCategories.has(outil.categorie)) throw new Error(`outils.json: ${outil.nom}: catégorie « ${outil.categorie} » absente de categories.json`);
    if (!idsSources.has(outil.source_repertoire_id)) throw new Error(`outils.json: ${outil.nom}: source « ${outil.source_repertoire_id} » absente de sources.json`);
    for (const tag of outil.tags ?? []) if (!idsTags.has(tag)) throw new Error(`outils.json: ${outil.nom}: tag « ${tag} » absent de tags.json`);
  });
  return { meta, outils, categories, criteres, tags, sources };
}
