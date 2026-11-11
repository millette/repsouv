// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Lecture et écriture des fichiers de données (outils.json, criteres.json, tags.json).
//
// Chaque fichier est un objet: ses métadonnées dans le champ « meta », puis son tableau de données.
//   { "meta": { "data_license": "CC-BY-SA-4.0", "created_at": "...", "updated_at": "..." }, "<cle>": [ ... ] }
// Les scripts maintiennent ces champs:
//   - data_license: toujours CC-BY-SA-4.0 (corrigée si un fichier en porte une autre ou aucune);
//   - created_at: fixé à la création du fichier, puis conservé, même quand le contenu est remplacé;
//   - updated_at: mis à jour seulement quand le contenu change réellement.
// Les dates sont en heure de Toronto (voir temps.ts). Un ancien fichier (simple tableau, ou métadonnées
// au premier niveau plutôt que dans « meta ») est reconnu et converti à la prochaine écriture.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { horodatage } from "./temps.ts";

export const LICENCE_DONNEES = "CC-BY-SA-4.0";
export interface Metadonnees {
  data_license: string;
  created_at: string;
  updated_at: string;
}

/** Un fichier lu. `aCorriger`: ses métadonnées manquent ou sont incorrectes (la prochaine écriture les rétablit). */
export interface Lu<T> {
  donnees: T[];
  meta: Metadonnees;
  aCorriger: boolean;
}

const HORODATAGE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
const memesDonnees = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Lit un fichier de données; accepte les anciens formats (simple tableau, ou métadonnées au premier
 * niveau). `normaliser` met les données au format courant (ex. dates sans décalage); si elle y change
 * quelque chose, le fichier est « à corriger ». Lève une erreur si la structure est invalide.
 */
export function lireFichier<T>(
  chemin: string,
  cle: string,
  maintenant: string = horodatage(),
  normaliser?: (donnees: T[]) => T[],
): Lu<T> {
  const brut: unknown = JSON.parse(readFileSync(chemin, "utf8"));
  const nouvelles: Metadonnees = { data_license: LICENCE_DONNEES, created_at: maintenant, updated_at: maintenant };
  let donnees: T[];
  let aCorriger: boolean;
  let meta = nouvelles;
  if (Array.isArray(brut)) {
    donnees = brut;
    aCorriger = true;
  } else {
    const objet = brut as Record<string, unknown> | null;
    if (typeof objet !== "object" || objet === null || !Array.isArray(objet[cle])) {
      throw new Error(`${chemin}: tableau « ${cle} » manquant`);
    }
    donnees = objet[cle] as T[];
    const present = typeof objet.meta === "object" && objet.meta !== null;
    const source = (present ? objet.meta : objet) as Record<string, unknown>;
    const valide = (v: unknown): v is string => typeof v === "string" && HORODATAGE.test(v);
    meta = {
      data_license: LICENCE_DONNEES,
      created_at: valide(source.created_at) ? source.created_at : maintenant,
      updated_at: valide(source.updated_at) ? source.updated_at : maintenant,
    };
    aCorriger =
      !present || source.data_license !== LICENCE_DONNEES || meta.created_at !== source.created_at || meta.updated_at !== source.updated_at;
  }
  if (normaliser) {
    const normalisees = normaliser(donnees);
    if (!memesDonnees(donnees, normalisees)) aCorriger = true;
    donnees = normalisees;
  }
  return { donnees, meta, aCorriger };
}

/** Comme lireFichier, mais retourne null si le fichier n'existe pas ou n'est pas lisible. */
export function lireSiExiste<T>(chemin: string, cle: string, normaliser?: (donnees: T[]) => T[]): Lu<T> | null {
  if (!existsSync(chemin)) return null;
  try {
    return lireFichier<T>(chemin, cle, horodatage(), normaliser);
  } catch {
    return null;
  }
}

/**
 * Écrit un fichier de données avec ses métadonnées. `avant` est l'état précédent du fichier (ou null
 * s'il est nouveau): `created_at` en est conservé, et `updated_at` aussi si le contenu n'a pas changé.
 * Retourne le nouvel état, à passer comme `avant` à l'écriture suivante.
 */
export function ecrireFichier<T>(
  chemin: string,
  cle: string,
  donnees: T[],
  avant: Lu<unknown> | null = null,
  maintenant: string = horodatage(),
): Lu<T> {
  const inchange = avant !== null && !avant.aCorriger && memesDonnees(avant.donnees, donnees);
  const meta: Metadonnees = {
    data_license: LICENCE_DONNEES,
    created_at: avant?.meta.created_at ?? maintenant,
    updated_at: inchange ? avant.meta.updated_at : maintenant,
  };
  writeFileSync(chemin, JSON.stringify({ meta, [cle]: donnees }, null, 2) + "\n");
  return { donnees, meta, aCorriger: false };
}
