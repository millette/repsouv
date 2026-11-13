// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Ce que le pied de page dit du dépôt et du build: l'adresse du dépôt, déclarée dans le package.json de la racine,
// la version du dépôt dont le site est bâti (hash Git) et la date du build. Ce sont des faits du build, lus sans
// réseau: un fichier, une commande git locale, l'horloge. Les lectures sont injectées, pour tester sans dépôt Git.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface Paquet {
  repository?: string | { type?: string; url?: string; directory?: string };
}

/** Adresse Web du dépôt d'après le champ `repository` d'un package.json; rien si elle n'est pas reconnaissable. */
export function adresseDepot(paquet: Paquet): string | undefined {
  const brut = typeof paquet.repository === "string" ? paquet.repository : paquet.repository?.url;
  if (!brut) return undefined;
  const adresse = brut
    .replace(/^git\+/, "")
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/\.git$/, "");
  return /^https:\/\/[^/\s]+\/\S+$/.test(adresse) ? adresse : undefined;
}

export interface InfosBuild {
  /** Adresse Web du dépôt. */
  depot?: string;
  /** Hash du commit dont le site est bâti; absent hors d'un dépôt Git. */
  hash?: string;
  hashCourt?: string;
  /** Adresse du commit dans le dépôt. */
  commit?: string;
  /** Date du build, ISO 8601. */
  date: string;
}

export interface LecturesBuild {
  lirePaquet: () => Paquet;
  /** Rend le hash du commit en cours; lève une erreur hors d'un dépôt Git. */
  git: () => string;
  maintenant: () => Date;
}

/** Racine du dépôt: le parent de site/, d'où se lancent les commandes. */
const racine = () => resolve(process.cwd(), "..");

const LECTURES: LecturesBuild = {
  lirePaquet: () => JSON.parse(readFileSync(resolve(racine(), "package.json"), "utf8")) as Paquet,
  git: () => execFileSync("git", ["rev-parse", "HEAD"], { cwd: racine(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
  maintenant: () => new Date(),
};

export function infosBuild(lectures: LecturesBuild = LECTURES): InfosBuild {
  const depot = adresseDepot(lectures.lirePaquet());
  let hash: string | undefined;
  try {
    const sortie = lectures.git().trim();
    if (/^[0-9a-f]{40}$/.test(sortie)) hash = sortie;
  } catch {
    // Pas de dépôt Git (archive, copie des fichiers): le pied de page omet la version.
  }
  return {
    ...(depot ? { depot } : {}),
    ...(hash ? { hash, hashCourt: hash.slice(0, 7) } : {}),
    ...(depot && hash ? { commit: `${depot}/commit/${hash}` } : {}),
    date: lectures.maintenant().toISOString(),
  };
}

const JOUR = new Intl.DateTimeFormat("fr-CA", { dateStyle: "long", timeZone: "America/Toronto" });
const HEURE = new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit", hourCycle: "h23", timeZone: "America/Toronto" });

/** Date et heure d'un horodatage, en français, à l'heure de Toronto comme les dates des données. */
export function formaterDateHeure(iso: string): string {
  const date = new Date(iso);
  const parties = Object.fromEntries(HEURE.formatToParts(date).map((p) => [p.type, p.value]));
  return `${JOUR.format(date).replace(/^1 /, "1er ")} à ${Number(parties.hour)} h ${parties.minute}`;
}
