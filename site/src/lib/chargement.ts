// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Lecture du fichier de données de l'explorateur, dans le navigateur. C'est le seul appel réseau du site: la lecture
// d'un fichier statique du site lui-même, à l'adresse reçue en paramètre. Sans Solid ni Astro: testable seul.
import { normaliserBase } from "./adresses.ts";
import type { DonneesExplorateur } from "./explorateur.ts";

const TABLEAUX = ["outils", "categories", "tags", "sources", "criteres", "pays"] as const;
const ECHEC = "Les outils n'ont pas pu être chargés";

/** Adresse du fichier de données, sous le chemin de base du site. */
export function adresseDonnees(base: string): string {
  return `${normaliserBase(base)}explorateur.json`;
}

/** Lit et vérifie le fichier; tout échec devient une erreur au message clair, que la page affiche. */
export async function chargerExplorateur(adresse: string, lire: (adresse: string) => Promise<Response> = (a) => fetch(a)): Promise<DonneesExplorateur> {
  let reponse: Response;
  try {
    reponse = await lire(adresse);
  } catch {
    throw new Error(`${ECHEC}: le fichier de données est injoignable.`);
  }
  if (!reponse.ok) throw new Error(`${ECHEC}: réponse ${reponse.status} du serveur.`);
  let contenu: unknown;
  try {
    contenu = await reponse.json();
  } catch {
    throw new Error(`${ECHEC}: le fichier de données est illisible.`);
  }
  const objet = contenu as Record<string, unknown> | null;
  for (const cle of TABLEAUX) {
    if (!objet || !Array.isArray(objet[cle])) throw new Error(`${ECHEC}: le fichier de données n'a pas de tableau « ${cle} ».`);
  }
  return objet as unknown as DonneesExplorateur;
}
