// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les sources d'outils (sources.json): le répertoire Praxis, extrait par extract.ts; d'autres collections (FACiL,
// à venir) avec leur propre extracteur; et les outils ajoutés à la main (ajouter.ts), dont la source dit qui les a
// soumis. Chaque outil de outils.json renvoie à une source par `source_repertoire_id`.
import { URL_REPERTOIRE } from "./extract.ts";
import { ID_PRAXIS } from "./ids.ts";
import { ecrireFichier, lireFichier, lireSiExiste, type Lu } from "./fichiers.ts";

/** Qui a soumis une collection ajoutée à la main; seul le nom est obligatoire. */
export interface SoumisPar {
  nom: string;
  url?: string;
  email?: string;
}

export type Extracteur = "praxis" | "facil" | "manuel";

export interface Source {
  /** Identifiant (slug), référencé par outils[].source_repertoire_id. */
  id: string;
  nom: string;
  /** Page de la collection d'outils. */
  url: string;
  /** Qui sait lire cette source: un extracteur du dépôt, ou « manuel » pour les outils saisis par ajouter.ts. */
  extracteur: Extracteur;
  /** Politique de confidentialité de la collection, si elle en publie une. */
  pdc?: string;
  /** Page sur les données (collecte, hébergement), si elle en publie une. */
  donnees?: string;
  soumis_par?: SoumisPar;
}

export { ID_PRAXIS };
export const SOURCE_PRAXIS: Readonly<Source> = {
  id: ID_PRAXIS,
  nom: "Répertoire d'outils favorisant la souveraineté numérique (Praxis, La bande numérique)",
  url: URL_REPERTOIRE,
  extracteur: "praxis",
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const URL_HTTP = /^https?:\/\/\S+$/;
/** Adresse de courriel (addr-spec de la RFC 5322, forme courante: partie locale, @, domaine avec un point). */
export const COURRIEL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

/** Les problèmes d'une source (vide si elle est valide). */
export function problemesSource(s: Source): string[] {
  const problemes: string[] = [];
  if (!SLUG.test(s.id)) problemes.push(`id « ${s.id} »: minuscules, chiffres et tirets attendus`);
  if (!s.nom.trim()) problemes.push("nom vide");
  if (!URL_HTTP.test(s.url)) problemes.push(`url « ${s.url} »: URL http(s) attendue`);
  if (!["praxis", "facil", "manuel"].includes(s.extracteur)) problemes.push(`extracteur « ${s.extracteur} » inconnu`);
  if (s.pdc !== undefined && !URL_HTTP.test(s.pdc)) problemes.push(`pdc « ${s.pdc} »: URL http(s) attendue`);
  if (s.donnees !== undefined && !URL_HTTP.test(s.donnees)) problemes.push(`donnees « ${s.donnees} »: URL http(s) attendue`);
  if (s.soumis_par) {
    if (!s.soumis_par.nom.trim()) problemes.push("soumis_par.nom vide");
    if (s.soumis_par.url !== undefined && !URL_HTTP.test(s.soumis_par.url)) problemes.push(`soumis_par.url « ${s.soumis_par.url} »: URL http(s) attendue`);
    if (s.soumis_par.email !== undefined && !COURRIEL.test(s.soumis_par.email)) problemes.push(`soumis_par.email « ${s.soumis_par.email} »: adresse de courriel attendue`);
  }
  return problemes;
}

/**
 * La liste avec `source` ajoutée ou, si son identifiant existe déjà, mise à jour (les champs donnés remplacent les
 * anciens, les autres restent). L'ordre des sources existantes est conservé.
 */
export function sourcesAvec(existantes: readonly Source[], source: Source): Source[] {
  const problemes = problemesSource(source);
  if (problemes.length) throw new Error(`source invalide: ${problemes.join("; ")}`);
  const i = existantes.findIndex((s) => s.id === source.id);
  if (i < 0) return [...existantes, source];
  return existantes.map((s, j) => (j === i ? { ...s, ...source } : s));
}

export const chargerSources = (fichier: string): Source[] => lireFichier<Source>(fichier, "sources").donnees;

/** Écrit sources.json; `avant` est son état précédent (lireSiExiste), pour maintenir `meta`. */
export const sauverSources = (fichier: string, sources: Source[], avant: Lu<Source> | null = lireSiExiste<Source>(fichier, "sources")): Lu<Source> =>
  ecrireFichier(fichier, "sources", sources, avant);
