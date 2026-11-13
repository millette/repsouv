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

/** Lit un fichier JSON statique du site (la spécification compilée d'un graphique); tout échec devient une erreur. */
export async function chargerJson<T>(adresse: string, lire: (adresse: string) => Promise<Response> = (a) => fetch(a)): Promise<T> {
  const reponse = await lire(adresse);
  if (!reponse.ok) throw new Error(`Fichier illisible (${reponse.status}): ${adresse}`);
  return (await reponse.json()) as T;
}

const ECHEC_DETAILS = "Les détails n'ont pas pu être chargés";

/** Lit la page statique de la fiche d'un outil (son HTML), pour la boîte « Détails » de l'explorateur. */
export async function chargerFiche(adresse: string, lire: (adresse: string) => Promise<Response> = (a) => fetch(a)): Promise<string> {
  let reponse: Response;
  try {
    reponse = await lire(adresse);
  } catch {
    throw new Error(`${ECHEC_DETAILS}: la fiche est injoignable.`);
  }
  if (!reponse.ok) throw new Error(`${ECHEC_DETAILS}: réponse ${reponse.status} du serveur.`);
  return reponse.text();
}

/**
 * Titre et contenu principal d'une fiche, tirés de sa page: ce que la boîte « Détails » affiche. C'est du HTML produit
 * par le site lui-même au build. Le <h1> devient le titre de la boîte; le lien de retour vers la liste n'y a pas sa place.
 */
export function contenuFiche(document: Document): { titre: string; html: string } {
  const principal = document.querySelector("main");
  const titre = principal?.querySelector("h1");
  if (!principal || !titre) throw new Error(`${ECHEC_DETAILS}: la fiche n'a pas le contenu attendu.`);
  const copie = principal.cloneNode(true) as Element;
  copie.querySelector("h1")?.remove();
  copie.querySelector(".retour")?.remove();
  return { titre: (titre.textContent ?? "").trim(), html: copie.innerHTML };
}
