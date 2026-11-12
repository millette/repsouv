// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Lecture et écriture des fichiers de données (outils.json, criteres.json, tags.json).
//
// Chaque fichier est un objet: ses métadonnées dans le champ « meta », puis son tableau de données.
//   { "meta": { "data_license": "CC-BY-SA-4.0", "created_at": "...", "updated_at": "..." }, "<cle>": [ ... ] }
// Les scripts maintiennent ces champs:
//   - data_license: toujours CC-BY-SA-4.0 (rétablie à l'écriture si le fichier en portait une autre);
//   - created_at: fixé à la création du fichier, puis conservé, même quand le contenu est remplacé;
//   - updated_at: mis à jour seulement quand le contenu (ou la licence) change réellement.
// Les dates sont en heure de Toronto (voir temps.ts). Le format est strict: un fichier qui n'a pas
// cette structure est refusé avec un message clair.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { horodatage } from "./temps.ts";

export const LICENCE_DONNEES = "CC-BY-SA-4.0";

export interface Metadonnees {
  data_license: string;
  created_at: string;
  updated_at: string;
}

/** Un fichier lu: ses données et ses métadonnées telles qu'elles sont dans le fichier. */
export interface Lu<T> {
  donnees: T[];
  meta: Metadonnees;
}

const HORODATAGE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
const memesDonnees = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Lit un fichier de données. Lève une erreur si « meta » ou le tableau « cle » manque ou si les dates sont invalides. */
export function lireFichier<T>(chemin: string, cle: string): Lu<T> {
  const brut = JSON.parse(readFileSync(chemin, "utf8")) as { meta?: Partial<Metadonnees>; [cle: string]: unknown } | null;
  const meta = brut?.meta;
  if (typeof meta !== "object" || meta === null || !Array.isArray(brut?.[cle])) {
    throw new Error(`${chemin}: format invalide (attendu: un objet avec « meta » et le tableau « ${cle} »)`);
  }
  const { data_license, created_at, updated_at } = meta;
  if (typeof data_license !== "string" || !HORODATAGE.test(created_at ?? "") || !HORODATAGE.test(updated_at ?? "")) {
    throw new Error(`${chemin}: « meta » invalide (data_license, et created_at et updated_at en ISO 8601 avec décalage, attendus)`);
  }
  return { donnees: brut![cle] as T[], meta: { data_license, created_at: created_at!, updated_at: updated_at! } };
}

/** Comme lireFichier, mais retourne null si le fichier n'existe pas ou n'est pas lisible. */
export function lireSiExiste<T>(chemin: string, cle: string): Lu<T> | null {
  if (!existsSync(chemin)) return null;
  try {
    return lireFichier<T>(chemin, cle);
  } catch {
    return null;
  }
}

/**
 * Écrit un fichier de données avec ses métadonnées. `avant` est l'état précédent du fichier (ou null
 * s'il est nouveau): `created_at` en est conservé, et `updated_at` aussi si rien n'a changé.
 * Retourne le nouvel état, à passer comme `avant` à l'écriture suivante.
 */
export function ecrireFichier<T>(
  chemin: string,
  cle: string,
  donnees: T[],
  avant: Lu<unknown> | null = null,
  maintenant: string = horodatage(),
): Lu<T> {
  const inchange = avant !== null && avant.meta.data_license === LICENCE_DONNEES && memesDonnees(avant.donnees, donnees);
  const meta: Metadonnees = {
    data_license: LICENCE_DONNEES,
    created_at: avant?.meta.created_at ?? maintenant,
    updated_at: inchange ? avant.meta.updated_at : maintenant,
  };
  writeFileSync(chemin, JSON.stringify({ meta, [cle]: donnees }, null, 2) + "\n");
  // Copie: l'appelant peut modifier `donnees` en place avant la prochaine écriture (enrichissement outil par
  // outil); comparer avec le même tableau dirait toujours « inchangé » et updated_at n'avancerait jamais.
  return { donnees: structuredClone(donnees), meta };
}
