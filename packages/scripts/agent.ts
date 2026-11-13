// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// L'en-tête User-Agent de toutes les requêtes HTTP du projet: un navigateur courant (certains sites refusent les
// clients sans en-tête de navigateur), suivi du nom et de la version du projet (package.json de la racine du dépôt) et
// d'un contact (author de ce package.json), pour qu'un administrateur sache qui lit ses pages et puisse écrire.
import { readFileSync } from "node:fs";

interface Paquet {
  name: string;
  version: string;
  author?: { name?: string; email?: string; url?: string };
}

/** Navigateur annoncé en tête de l'en-tête. */
export const NAVIGATEUR = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";

/** Le contact de `author`: « Nom <courriel> », ou le nom, ou le courriel, ou rien. */
export const contact = (author: Paquet["author"]): string | null => {
  const nom = author?.name?.trim();
  const courriel = author?.email?.trim();
  if (nom && courriel) return `${nom} <${courriel}>`;
  return nom || courriel || null;
};

/** `Mozilla/5.0 (…) Chrome/… nom/version (contact)` d'après un package.json. */
export const userAgentDepuis = (p: Paquet): string => {
  const c = contact(p.author);
  return `${NAVIGATEUR} ${p.name}/${p.version}${c ? ` (${c})` : ""}`;
};

const PAQUET: Paquet = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

/** L'en-tête User-Agent du projet, lu dans package.json au chargement. */
export const USER_AGENT = userAgentDepuis(PAQUET);

/** Les en-têtes d'une requête du projet: User-Agent, puis ceux donnés. */
export const enTetes = (autres: Record<string, string> = {}): Record<string, string> => ({ "user-agent": USER_AGENT, ...autres });
