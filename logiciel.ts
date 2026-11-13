// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Le logiciel derrière un outil. Un service hébergé (Services FACiLes) est une instance d'un logiciel libre
// (`instance_de`): c'est sur ce logiciel que portent l'enrichissement, la vérification des critères et la recherche
// Open Hub (pageEnrichissement, nomLogiciel), et c'est par lui que les outils se renvoient les uns aux autres
// (`voir_aussi`: un outil Praxis « Mastodon » et le service « Jasette FACiLe », instance de Mastodon).
import type { Outil } from "./extract.ts";

/** Le nom du logiciel: celui dont l'outil est une instance, sinon le nom de l'outil. */
export const nomLogiciel = (o: Pick<Outil, "nom" | "instance_de">): string => o.instance_de?.nom ?? o.nom;

/** Forges où le dépôt est `organisation/dépôt` (deux segments). */
const FORGES_DEUX_SEGMENTS = new Set(["github.com", "codeberg.org", "bitbucket.org"]);
/** Forges GitLab (et forges auto-hébergées gitlab.*, git.*, forge.*, gitea.*): groupes et sous-groupes, puis `/-/…` (ou, dans l'ancienne forme, `/tags/…`, `/commits/…`). */
const FORGES_GITLAB = new Set(["gitlab.com", "framagit.org"]);
const PREFIXES_GITLAB = /^(?:gitlab|git|forge|gitea)\./;
const SUFFIXES_GITLAB = /\/(?:-|tags|commits|releases|tree|blob|issues|merge_requests)(?:\/.*)?$/;

/** La racine du dépôt (sans page de version, de tag ni de commit) quand `url` est sur une forge connue; null sinon. */
export function depotDepuis(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const hote = u.hostname.replace(/^www\./, "").toLowerCase();
  const segments = u.pathname.split("/").filter(Boolean);
  if (FORGES_DEUX_SEGMENTS.has(hote)) return segments.length >= 2 ? `https://${hote}/${segments[0]}/${segments[1]}` : null;
  if (FORGES_GITLAB.has(hote) || PREFIXES_GITLAB.test(hote)) {
    const chemin = `/${segments.join("/")}`.replace(SUFFIXES_GITLAB, "");
    return chemin.split("/").filter(Boolean).length >= 2 ? `https://${hote}${chemin}` : null;
  }
  return null;
}

/** `url` est-elle un dépôt (ou une page d'un dépôt) sur une forge connue. */
export const estDepot = (url: string): boolean => depotDepuis(url) !== null;

/** La page à lire pour enrichir et vérifier l'outil: le dépôt du logiciel (ou sa page) quand l'outil en est une instance, sinon son lien. */
export const pageEnrichissement = (o: Pick<Outil, "lien" | "instance_de">): string =>
  o.instance_de ? depotDepuis(o.instance_de.url) ?? o.instance_de.url : o.lien;

const cle = (nom: string) => nom.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Pose `voir_aussi` sur chaque outil actif: les noms des autres outils actifs du même logiciel, dans l'ordre du
 * fichier; absent quand il n'y en a pas (et sur les outils retirés). Les outils dont le renvoi ne change pas gardent
 * leur identité; `relies` compte les autres.
 */
export function lierVoirAussi<T extends Outil>(outils: readonly T[]): { outils: T[]; relies: number } {
  const groupes = new Map<string, string[]>();
  for (const o of outils) {
    if (o.removed) continue;
    const k = cle(nomLogiciel(o));
    groupes.set(k, [...(groupes.get(k) ?? []), o.nom]);
  }
  let relies = 0;
  const resultat = outils.map((o) => {
    const voisins = o.removed ? [] : (groupes.get(cle(nomLogiciel(o))) ?? []).filter((n) => n !== o.nom);
    const attendu = voisins.length ? voisins : undefined;
    if (JSON.stringify(o.voir_aussi) === JSON.stringify(attendu)) return o;
    relies++;
    const { voir_aussi: _ancien, ...sans } = o;
    return (attendu ? { ...sans, voir_aussi: attendu } : sans) as T;
  });
  return { outils: resultat, relies };
}
