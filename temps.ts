// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Dates et heures du projet: toujours locales, en heure de Toronto (America/Toronto, heure d'été
// comprise), au format ISO 8601 avec le décalage: 2026-11-11T16:42:07-05:00 (hiver), -04:00 (été).

export const FUSEAU = "America/Toronto";

const pad = (n: number) => String(n).padStart(2, "0");

function formatDecalage(minutes: number): string {
  const signe = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${signe}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

const formateur = (fuseau: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: fuseau, hourCycle: "h23", timeZoneName: "longOffset",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

/** Décalage du fuseau par rapport à UTC, en minutes, à un instant donné (ms depuis l'époque). */
function decalageMinutes(instant: number, fuseau: string): number {
  const nom = formateur(fuseau).formatToParts(new Date(instant)).find((p) => p.type === "timeZoneName")!.value;
  const m = /^GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(nom);
  if (!m) throw new Error(`Décalage inattendu pour ${fuseau}: ${nom}`);
  if (!m[1]) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** « 2026-11-11T16:42:07-05:00 »: la date et l'heure en heure de Toronto, avec le décalage. */
export function horodatage(date: Date = new Date(), fuseau: string = FUSEAU): string {
  const parties = Object.fromEntries(formateur(fuseau).formatToParts(date).map((p) => [p.type, p.value]));
  const decalage = formatDecalage(decalageMinutes(date.getTime(), fuseau));
  return `${parties.year}-${parties.month}-${parties.day}T${parties.hour}:${parties.minute}:${parties.second}${decalage}`;
}

/** Une date et une heure déjà exprimées en heure de Toronto, auxquelles on ajoute le décalage qui s'applique ce jour-là. */
export function localVersIso(
  annee: number, mois: number, jour: number, heure: number, minute: number, seconde = 0, fuseau: string = FUSEAU,
): string {
  const commeUtc = Date.UTC(annee, mois - 1, jour, heure, minute, seconde);
  let decalage = decalageMinutes(commeUtc, fuseau);
  decalage = decalageMinutes(commeUtc - decalage * 60_000, fuseau); // le décalage est celui de l'instant réel
  return `${annee}-${pad(mois)}-${pad(jour)}T${pad(heure)}:${pad(minute)}:${pad(seconde)}${formatDecalage(decalage)}`;
}

const SANS_DECALAGE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Ajoute le décalage de Toronto à une date locale qui n'en a pas (ancien format 2026-11-05T09:53); sinon la laisse telle quelle. */
export function versHeureLocale(valeur: string, fuseau: string = FUSEAU): string {
  const m = SANS_DECALAGE.exec(valeur);
  if (!m) return valeur;
  return localVersIso(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0), fuseau);
}
