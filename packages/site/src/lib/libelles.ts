// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Textes d'interface tirés des données: étoiles, statuts, pays, nombres et dates, en français.
import type { Statut } from "./repertoire.ts";

/** Équivalent textuel du score, lu par les lecteurs d'écran à la place des étoiles. */
export function texteEtoiles(score: number): string {
  return `${score} ${score > 1 ? "étoiles" : "étoile"} sur 3`;
}

export const LIBELLES_STATUT: Record<Statut, string> = {
  libre: "Libre",
  partiel: "Partiellement libre",
  "source-disponible": "Code source disponible",
  proprietaire: "Propriétaire",
  "non-enrichi": "Pas encore enrichi",
};

const PAYS = new Intl.DisplayNames("fr", { type: "region", fallback: "none" });

/** Nom français d'un pays d'après son code (ISO 3166-1 alpha-2, ou EU, UK); un code inconnu est rendu tel quel. */
export function nomPays(code: string): string {
  try {
    return PAYS.of(code) ?? code;
  } catch {
    return code;
  }
}

const NOMBRE = new Intl.NumberFormat("fr-CA");

export function formaterNombre(n: number): string {
  return NOMBRE.format(n);
}

const DATE = new Intl.DateTimeFormat("fr-CA", { dateStyle: "long", timeZone: "UTC" });

/** Date d'un horodatage ISO, telle qu'écrite (heure de Toronto): le jour est lu dans la chaîne, sans conversion de fuseau. */
export function formaterDate(iso: string): string {
  const [annee, mois, jour] = iso.slice(0, 10).split("-").map(Number);
  // Intl écrit « 1 novembre »; l'usage français veut « 1er ».
  return DATE.format(new Date(Date.UTC(annee!, mois! - 1, jour!))).replace(/^1 /, "1er ");
}

/** Nom d'hôte d'une adresse, sans « www. »: texte du lien vers un service remplacé. */
export function nomHote(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
