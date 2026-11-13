// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Open Hub (openhub.net, ex-Ohloh): données publiques sur les projets libres, par l'API XML
// (https://github.com/blackducksoftware/ohloh_api; clé OPENHUB_API_KEY, 1 000 requêtes par jour). Pour chaque outil
// libre enrichi, on cherche le projet par son nom, on retient celui dont la page d'accueil, un lien ou un dépôt
// (enlistments) concorde avec `lien` ou `repo` (sinon les meilleurs candidats sont journalisés, sans rien écrire), puis on lit son analyse:
// organisation, activité, licences, langage, taille, contributeurs, commits. Inscrit dans `openhub_id` (vanity_name)
// et `openhub` (voir OpenHub dans extract.ts); `echecs_openhub` compte les échecs consécutifs, comme l'enrichissement.
import { DOMParser } from "linkedom";
import type { OutilClasse } from "./classify.ts";
import { MAX_ECHECS_PAR_DEFAUT } from "./enrichir.ts";
import type { OpenHub } from "./extract.ts";
import { horodatage } from "./temps.ts";
import { estDepot, nomLogiciel, pageEnrichissement } from "./logiciel.ts";

const API = "https://www.openhub.net";

/** Un projet Open Hub tel que lu dans le XML (la collection ne porte pas d'analyse; un projet seul, oui). */
export interface ProjetOpenHub {
  id: string;
  nom: string;
  vanity: string;
  page: string;
  accueil: string | null;
  liens: string[];
  licences: string[];
  organisation: string | null;
  activite: string | null;
  analyse?: {
    langage_principal: string | null;
    lignes_de_code: number | null;
    contributeurs_total: number | null;
    contributeurs_12_mois: number | null;
    commits_12_mois: number | null;
    premier_mois: string | null;
    dernier_mois: string | null;
  };
}

/** Ce qu'on lit d'un élément XML de linkedom (sans les types DOM, absents de la configuration TypeScript). */
type Noeud = { tagName: string; textContent: string | null; children: Iterable<Noeud> };
/** L'enfant direct `nom` d'un élément (linkedom ne gère pas le sélecteur :scope). */
const enfant = (e: Noeud | null | undefined, nom: string): Noeud | null => [...(e?.children ?? [])].find((c) => c.tagName.toLowerCase() === nom) ?? null;
const texte = (e: Noeud | null | undefined, selecteur: string): string | null => {
  const t = enfant(e, selecteur)?.textContent?.trim();
  return t ? t : null;
};
const nombre = (e: Noeud | null | undefined, selecteur: string): number | null => {
  const t = texte(e, selecteur);
  return t === null || Number.isNaN(Number(t)) ? null : Number(t);
};

/** Les projets d'une réponse XML d'Open Hub (collection `p.xml` ou projet seul `p/<id>.xml`); erreur si le statut n'est pas « success ». */
export function analyserProjets(xml: string): ProjetOpenHub[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const statut = doc.querySelector("response > status")?.textContent?.trim();
  if (statut !== "success") throw new Error(`Open Hub: ${doc.querySelector("response > error")?.textContent?.trim() || `statut ${statut ?? "absent"}`}`);
  return [...doc.querySelectorAll("response > result > project")].map((p: Noeud) => {
    const analyse = enfant(p, "analysis");
    return {
      id: texte(p, "id") ?? "",
      nom: texte(p, "name") ?? "",
      vanity: texte(p, "vanity_name") ?? texte(p, "id") ?? "",
      page: texte(p, "html_url") ?? "",
      accueil: texte(p, "homepage_url"),
      liens: [...(enfant(p, "links")?.children ?? [])].map((l) => texte(l, "url") ?? "").filter(Boolean),
      licences: [...(enfant(p, "licenses")?.children ?? [])].map((l) => texte(l, "name") ?? "").filter(Boolean),
      organisation: texte(enfant(p, "organization"), "name"),
      activite: texte(enfant(p, "project_activity_index"), "description"),
      ...(analyse && {
        analyse: {
          langage_principal: texte(analyse, "main_language_name"),
          lignes_de_code: nombre(analyse, "total_code_lines"),
          contributeurs_total: nombre(analyse, "total_contributor_count"),
          contributeurs_12_mois: nombre(analyse, "twelve_month_contributor_count"),
          commits_12_mois: nombre(analyse, "twelve_month_commit_count"),
          premier_mois: texte(analyse, "min_month"),
          dernier_mois: texte(analyse, "max_month"),
        },
      }),
    };
  });
}

/** Client de l'API: recherche par nom (sans analyses), dépôts d'un projet (enlistments, première page), lecture d'un projet (avec son analyse). */
export interface ClientOpenHub {
  rechercher(nom: string): Promise<ProjetOpenHub[]>;
  depots(idOuVanity: string): Promise<string[]>;
  projet(idOuVanity: string): Promise<ProjetOpenHub>;
}

/** Les URL des dépôts d'une réponse enlistments.xml. */
export function analyserDepots(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const statut = doc.querySelector("response > status")?.textContent?.trim();
  if (statut !== "success") throw new Error(`Open Hub: ${doc.querySelector("response > error")?.textContent?.trim() || `statut ${statut ?? "absent"}`}`);
  return [...doc.querySelectorAll("response > result > enlistment")].map((e: Noeud) => texte(enfant(e, "code_location"), "url") ?? "").filter(Boolean);
}

export function clientOpenHub(cle: string, telecharger: typeof fetch = fetch): ClientOpenHub {
  const lire = async (chemin: string, params: Record<string, string>) => {
    const url = new URL(chemin, API);
    url.search = new URLSearchParams({ api_key: cle, ...params }).toString();
    const reponse = await telecharger(url, { signal: AbortSignal.timeout(30_000) });
    if (!reponse.ok) throw new Error(`Open Hub HTTP ${reponse.status}`);
    return reponse.text();
  };
  return {
    rechercher: async (nom) => analyserProjets(await lire("/p.xml", { query: nom, sort: "relevance" })),
    depots: async (idOuVanity) => analyserDepots(await lire(`/p/${encodeURIComponent(idOuVanity)}/enlistments.xml`, {})),
    projet: async (idOuVanity) => {
      const [p] = analyserProjets(await lire(`/p/${encodeURIComponent(idOuVanity)}.xml`, {}));
      if (!p) throw new Error(`Open Hub: projet ${idOuVanity} introuvable`);
      return p;
    },
  };
}

// ---------- concordance ----------

const hote = (url: string | null | undefined): string | null => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "").toLowerCase() : null;
  } catch {
    return null;
  }
};
const normaliser = (url: string | null | undefined): string | null => {
  try {
    if (!url) return null;
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "").replace(/\.git$/, "")}`.toLowerCase();
  } catch {
    return null;
  }
};

/** Forges où le premier segment du chemin est une organisation: deux dépôts de la même organisation y désignent le même projet. */
const FORGES = new Set(["github.com", "gitlab.com", "codeberg.org", "framagit.org", "bitbucket.org", "git.sr.ht"]);
const organisation = (url: string | null | undefined): string | null => {
  const n = normaliser(url);
  if (!n) return null;
  const [hoteN, org] = n.split("/");
  return hoteN && org && FORGES.has(hoteN) ? `${hoteN}/${org}` : null;
};

/** Une URL d'Open Hub concorde-t-elle avec `repo`: même dépôt, ou même organisation sur une forge. */
const memeDepot = (url: string, repo: string): boolean => normaliser(url) === normaliser(repo) || (organisation(url) !== null && organisation(url) === organisation(repo));
/** Les dépôts à comparer: `repo`, et `lien` quand il est lui-même sur une forge (l'hôte d'une forge ne distingue rien). */
const depotsDe = (outil: { lien: string; repo?: string | null }): string[] => [outil.repo, estDepot(outil.lien) ? outil.lien : null].filter((u): u is string => !!u);

/**
 * Le projet qui concorde directement avec l'outil (sans requête de plus): même hôte entre la page d'accueil Open Hub
 * et `lien`, ou même dépôt (ou même organisation de forge) entre un lien Open Hub ou la page d'accueil et `repo`.
 */
export function concordance(candidats: readonly ProjetOpenHub[], outil: { lien: string; repo?: string | null }): ProjetOpenHub | null {
  const hoteOutil = hote(outil.lien);
  const depots = depotsDe(outil);
  return candidats.find((c) => {
    if (hoteOutil && !estDepot(outil.lien) && hote(c.accueil) === hoteOutil) return true;
    return depots.some((d) => [c.accueil, ...c.liens].some((u) => !!u && memeDepot(u, d)));
  }) ?? null;
}

/**
 * Concordance directe, sinon par les dépôts (enlistments) des `n` premiers candidats, comparés à `repo` (même dépôt
 * ou même organisation de forge): une requête par candidat examiné. Null sans concordance sûre.
 */
export async function trouverConcordance(client: Pick<ClientOpenHub, "depots">, candidats: readonly ProjetOpenHub[], outil: { lien: string; repo?: string | null }, n = 3): Promise<ProjetOpenHub | null> {
  const direct = concordance(candidats, outil);
  const depots = depotsDe(outil);
  if (direct || !depots.length) return direct;
  for (const c of candidats.slice(0, n)) {
    const siens = await client.depots(c.vanity || c.id);
    if (siens.some((u) => depots.some((d) => memeDepot(u, d)))) return c;
  }
  return null;
}

/** Les meilleurs candidats, pour le journal quand rien ne concorde. */
export const candidatsPourJournal = (candidats: readonly ProjetOpenHub[], n = 5): string =>
  candidats.slice(0, n).map((c) => `${c.nom} (${c.vanity}, ${c.accueil ?? c.page})`).join("; ") || "aucun";

export function champOpenHub(p: ProjetOpenHub, consulteLe: string): OpenHub {
  return {
    organisation: p.organisation,
    activite: p.activite,
    licences: p.licences,
    langage_principal: p.analyse?.langage_principal ?? null,
    lignes_de_code: p.analyse?.lignes_de_code ?? null,
    contributeurs_total: p.analyse?.contributeurs_total ?? null,
    contributeurs_12_mois: p.analyse?.contributeurs_12_mois ?? null,
    commits_12_mois: p.analyse?.commits_12_mois ?? null,
    premier_mois: p.analyse?.premier_mois ?? null,
    dernier_mois: p.analyse?.dernier_mois ?? null,
    consulte_le: consulteLe,
  };
}

// ---------- boucle ----------

const SOURCES_LIBRES = new Set(["libre", "partiel", "source-disponible"]);

/** Un outil enrichi dont le code est public, sans données Open Hub, et pas abandonné. */
export const aCompleterOpenHub = (o: OutilClasse, maxEchecs: number = MAX_ECHECS_PAR_DEFAUT): boolean =>
  !o.removed && o.source !== undefined && SOURCES_LIBRES.has(o.source) && o.openhub === undefined && (o.echecs_openhub ?? 0) < maxEchecs;

export const abandonneOpenHub = (o: OutilClasse, maxEchecs: number = MAX_ECHECS_PAR_DEFAUT): boolean =>
  !o.removed && o.source !== undefined && SOURCES_LIBRES.has(o.source) && o.openhub === undefined && (o.echecs_openhub ?? 0) >= maxEchecs;

export interface OptionsOpenHub {
  client: ClientOpenHub;
  maxEchecs?: number;
  horloge?: () => string;
  apresChaque?: (outils: OutilClasse[]) => void;
  debut?: (nom: string) => void;
  progression?: (traites: number) => void;
  journal?: (message: string, niveau?: "info" | "succes" | "avertissement" | "erreur") => void;
}

export interface ResultatOpenHub {
  completes: string[];
  erreurs: { nom: string; message: string }[];
  /** Outils sans concordance sûre cette fois (compté dans erreurs aussi), avec leurs candidats. */
  sansConcordance: { nom: string; candidats: string }[];
  abandonnes: string[];
}

/** Complète, en place, les outils à compléter (voir aCompleterOpenHub): deux requêtes par outil (recherche, puis projet avec analyse). */
export async function completerOpenHub(outils: OutilClasse[], options: OptionsOpenHub): Promise<ResultatOpenHub> {
  const { client, maxEchecs = MAX_ECHECS_PAR_DEFAUT, horloge = horodatage } = options;
  const journal = options.journal ?? (() => {});
  const resultat: ResultatOpenHub = { completes: [], erreurs: [], sansConcordance: [], abandonnes: [] };
  let traites = 0;
  for (const [i, outil] of outils.entries()) {
    if (abandonneOpenHub(outil, maxEchecs)) {
      resultat.abandonnes.push(outil.nom);
      continue;
    }
    if (!aCompleterOpenHub(outil, maxEchecs)) continue;
    options.debut?.(outil.nom);
    try {
      // Un service instance d'un logiciel: on cherche le logiciel, et on concorde sur son dépôt plutôt que sur l'hôte du service.
      const cible = { lien: pageEnrichissement(outil), repo: outil.repo ?? null };
      const candidats = await client.rechercher(nomLogiciel(outil));
      const trouve = await trouverConcordance(client, candidats, cible);
      if (!trouve) {
        const liste = candidatsPourJournal(candidats);
        resultat.sansConcordance.push({ nom: outil.nom, candidats: liste });
        throw new Error(`aucune concordance sûre avec ${cible.lien}${cible.repo ? ` ni ${cible.repo}` : ""}; candidats: ${liste}`);
      }
      const projet = await client.projet(trouve.vanity || trouve.id);
      const { echecs_openhub: _echecs, ...sansCompteur } = outil;
      outils[i] = { ...sansCompteur, openhub_id: projet.vanity || projet.id, openhub: champOpenHub(projet, horloge()) };
      resultat.completes.push(outil.nom);
      const o = outils[i]!.openhub!;
      journal(`  ${outil.nom}: ${projet.nom} (${outils[i]!.openhub_id}), ${o.activite ?? "activité inconnue"}, ${o.contributeurs_12_mois ?? "?"} contributeur(s) sur 12 mois, licences Open Hub: ${o.licences.join(", ") || "aucune"}`, "succes");
    } catch (e) {
      const echecs = (outil.echecs_openhub ?? 0) + 1;
      outils[i] = { ...outil, echecs_openhub: echecs };
      resultat.erreurs.push({ nom: outil.nom, message: (e as Error).message });
      const suite = echecs >= maxEchecs ? `; abandonné après ${echecs} échec(s) consécutif(s), ne sera plus tenté sans --max-echecs plus élevé` : ` (échec ${echecs} sur ${maxEchecs})`;
      journal(`  ${outil.nom}: Open Hub: ${(e as Error).message}${suite}`, "avertissement");
    }
    options.apresChaque?.(outils);
    options.progression?.(++traites);
  }
  return resultat;
}

/** Requêtes prévues pour `--dry-run`, borne haute: recherche, jusqu'à trois lectures de dépôts, projet (gratuites, dans la limite quotidienne d'Open Hub). */
export const requetesOpenHub = (outils: readonly OutilClasse[], maxEchecs: number = MAX_ECHECS_PAR_DEFAUT): number =>
  outils.filter((o) => aCompleterOpenHub(o, maxEchecs)).length * 5;
