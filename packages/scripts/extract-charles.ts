// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Extracteur de la source « charles »: les données de l'extension Chrome Charles (https://gitlab.com/yaniskerdjana/charles),
// qui propose des alternatives européennes aux services américains: data/alternatives.json (nom, lien, pays, catégorie,
// tarif, caractéristiques), data/sites-us.json (les sites américains et les alternatives qui les remplacent) et
// data/categories.json (les catégories de l'extension). La source n'a ni description, ni étoiles, ni date par outil:
//   - la description est composée en français depuis le pays, le tarif et les caractéristiques (tables PAYS, TARIF,
//     CARACTERISTIQUES; une caractéristique inconnue est signalée en avertissement et omise), avec les services remplacés;
//   - le score est estimé (score_estime, voir ajouter.ts) et la catégorie vient de CATEGORIE_PAR_CATEGORIE (par catégorie
//     Charles) et de CATEGORIE_PAR_ID (exceptions par alternative; null = exclue), à réviser à la main; LIEN_PAR_ID corrige
//     une URL morte de la source en attendant qu'elle soit corrigée en amont; cinq catégories
//     que le répertoire n'avait pas (CATEGORIES_CHARLES) sont ajoutées à categories.json avec leur source;
//   - alternative_a vient de sites-us.json inversé: l'URL de chaque site qui liste l'alternative; `pays` reprend country;
//   - les outils sont datés du dernier commit touchant data/ (API GitLab), sinon de l'heure de lecture.
// Une alternative qui porte le nom d'un outil actif d'une autre source (doublon, clé de logiciel.ts) n'est pas importée:
// `nom` est la clé unique de outils.json; les doublons sont listés dans le résumé.
//
// Usage: node extract-charles.ts [--dossier=/chemin/du/clone] [--sans-couleur] [outils.json] [url]
//   Sans chemin, le fichier est donnees/outils.json à la racine du dépôt (FICHIER_OUTILS).
//   Lit les fichiers bruts de la branche main du dépôt (ou un clone local par --dossier, daté de l'heure de lecture),
//   synchronise les outils de la source « charles » dans outils.json (comme update le fait pour Praxis: nouveau,
//   modification, retrait, comeback; les autres sources ne sont pas touchées), met sources.json et categories.json à
//   jour. Les outils nouveaux sont ensuite enrichis par `node update.ts`.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { enTetes } from "./agent.ts";
import { categoriesAvec, type Categorie } from "./categories.ts";
import { classer, type OutilClasse } from "./classify.ts";
import { lancer } from "./cli.ts";
import { couleursActives, creerCouleurs } from "./couleurs.ts";
import type { Outil } from "./extract.ts";
import { ecrireFichier, FICHIER_OUTILS, lireSiExiste } from "./fichiers.ts";
import { cleNom } from "./logiciel.ts";
import { sourcesAvec, type Source } from "./sources.ts";
import { horodatage } from "./temps.ts";
import { lignesResume, mettreAJour, type Resume } from "./update.ts";

export const ID_CHARLES = "charles";
export const URL_CHARLES = "https://gitlab.com/yaniskerdjana/charles";
export const SOURCE_CHARLES: Readonly<Source> = {
  id: ID_CHARLES,
  nom: "Charles, alternatives européennes aux services américains (extension Chrome, Yanis Kerdjana)",
  url: URL_CHARLES,
  extracteur: "charles",
  donnees: `${URL_CHARLES}/-/tree/main/data`,
};
const BRANCHE = "main";
const FICHIERS = ["alternatives", "sites-us", "categories"] as const;

// ---------- les données de l'extension ----------

export interface AlternativeCharles {
  id: string;
  name: string;
  url: string;
  /** ISO 3166-1 alpha-2, ou « EU » / « UK ». */
  country: string;
  category: string;
  pricing: string;
  features: string[];
}
export interface SiteCharles {
  id: string;
  name: string;
  domains: string[];
  alternatives: string[];
}
export interface DonneesCharles {
  alternatives: AlternativeCharles[];
  sites: SiteCharles[];
  categories: { id: string }[];
  /** Date du dernier commit touchant data/ (heure de Toronto), ou de la lecture si elle n'est pas connue. */
  modification: string;
}

// ---------- tables (à réviser à la main) ----------

/** Les catégories que le répertoire n'avait pas, déclarées par cette source (id = slug du nom, voir categories.ts). */
export const CATEGORIES_CHARLES: readonly Readonly<Categorie>[] = [
  { id: "paiement-en-ligne", nom: "Paiement en ligne", icone: "💳", source_repertoire_id: ID_CHARLES },
  { id: "assistants-d-intelligence-artificielle", nom: "Assistants d’intelligence artificielle", icone: "🤖", source_repertoire_id: ID_CHARLES },
  { id: "hebergement-web-et-infrastructure", nom: "Hébergement Web et infrastructure", icone: "🖥️", source_repertoire_id: ID_CHARLES },
  { id: "commerce-en-ligne", nom: "Commerce en ligne", icone: "🛒", source_repertoire_id: ID_CHARLES },
  { id: "diffusion-audio-et-video", nom: "Diffusion audio et vidéo", icone: "🎬", source_repertoire_id: ID_CHARLES },
];

/** Catégorie du répertoire (categories.json) pour chaque catégorie de l'extension (data/categories.json). */
export const CATEGORIE_PAR_CATEGORIE: Readonly<Record<string, string>> = {
  search: "navigation-web",
  cloud: "stockage-infonuagique-et-sauvegarde",
  social: "communautes-reseaux-et-partage-des-connaissances",
  productivity: "bureautique-et-collaboration",
  communication: "communication-et-collaboration-d-equipe",
  ecommerce: "commerce-en-ligne",
  dev: "hebergement-web-et-infrastructure",
  analytics: "analyse-et-mesure",
  ged: "gestion-documentaire-et-signature-electronique",
  scheduling: "gestion-de-projets-et-des-taches",
  streaming: "diffusion-audio-et-video",
  payment: "paiement-en-ligne",
  esign: "gestion-documentaire-et-signature-electronique",
  project: "gestion-de-projets-et-des-taches",
  design: "creation-et-gestion-de-contenus-numeriques",
  automation: "gestion-de-projets-et-des-taches",
  security: "securite-et-gestion-des-acces",
  ai: "assistants-d-intelligence-artificielle",
  crm: "gestion-de-la-relation-des-membres-et-crm",
  email: "messagerie-electronique",
  browser: "navigation-web",
  maps: "navigation-web",
  forms: "gestion-de-la-relation-des-membres-et-crm",
  transfer: "stockage-infonuagique-et-sauvegarde",
};

/** Exceptions par alternative (id de data/alternatives.json): une catégorie du répertoire, ou null pour ne pas l'importer. */
export const CATEGORIE_PAR_ID: Readonly<Record<string, string | null>> = {
  anytype: "veille-et-gestion-de-l-information", // prise de notes, comme Obsidian
  gitlab: "gestion-de-projets-et-des-taches", // forges: même rangement que Code FACiLe
  codeberg: "gestion-de-projets-et-des-taches",
  coreupdate: "securite-et-gestion-des-acces", // gestion des correctifs
  appleplans: null, // Plans d'Apple: américain selon la source elle-même (country: US)
};

/** Lien corrigé par alternative (id), quand l'URL de la source est morte; à retirer dès que la source est corrigée (voir tickets/charles-amont.md). */
export const LIEN_PAR_ID: Readonly<Record<string, string>> = {
  infomaniak: "https://www.infomaniak.com/fr/ksuite/kdrive", // la source donne /kdrive, qui répond 404
  lasuite: "https://www.infomaniak.com/fr/ksuite", // la source donne /fr/la-suite, qui répond 404
};

/** « d'origine … » selon le pays (data: country); la tournure « d'origine » est celle que classify.ts lit pour le critère contrôle. */
export const PAYS: Readonly<Record<string, string>> = {
  AT: "d'origine autrichienne",
  BE: "d'origine belge",
  CH: "d'origine suisse",
  CZ: "d'origine tchèque",
  DE: "d'origine allemande",
  DK: "d'origine danoise",
  EE: "d'origine estonienne",
  ES: "d'origine espagnole",
  EU: "d'origine européenne",
  FI: "d'origine finlandaise",
  FR: "d'origine française",
  IE: "d'origine irlandaise",
  IT: "d'origine italienne",
  LT: "d'origine lituanienne",
  LU: "d'origine luxembourgeoise",
  LV: "d'origine lettone",
  NL: "d'origine néerlandaise",
  NO: "d'origine norvégienne",
  NZ: "d'origine néo-zélandaise",
  PL: "d'origine polonaise",
  PT: "d'origine portugaise",
  SE: "d'origine suédoise",
  UK: "d'origine britannique",
  US: "d'origine américaine",
};

/** Le tarif (data: pricing), au féminin (« alternative … »). */
export const TARIF: Readonly<Record<string, string>> = {
  free: "gratuite",
  freemium: "gratuite avec des options payantes",
  paid: "payante",
  marketplace: "en place de marché",
};

/** Les caractéristiques (data: features) en français; les mots-clés de classify.ts (auto-hébergeable, open source, décentralisé, chiffrement de bout en bout, sans compte, local-first, hors ligne) sont repris tels quels. */
export const CARACTERISTIQUES: Readonly<Record<string, string>> = {
  "ad-free": "sans publicité",
  affordable: "abordable",
  agentless: "sans agent à installer",
  "ai-assistant": "assistant d'intelligence artificielle",
  "ai-coding": "assistant de programmation par IA",
  analytics: "analyse d'audience",
  "browser-based": "fonctionne dans le navigateur",
  business: "destiné aux entreprises",
  "carbon-neutral": "neutre en carbone",
  "certified-anssi": "certifié par l'ANSSI",
  chatbot: "robot conversationnel",
  "ci-cd": "intégration et déploiement continus",
  "cloud-hosting": "hébergement infonuagique",
  collaborative: "collaboratif",
  "conversational-ai": "IA conversationnelle",
  crm: "gestion de la relation client (CRM)",
  customizable: "personnalisable",
  database: "bases de données",
  decentralized: "décentralisé",
  "diverse-products": "produits variés",
  "document-management": "gestion documentaire",
  "e-signature": "signature électronique",
  "eco-friendly": "écoresponsable",
  education: "éducation et formation",
  "end-to-end-encryption": "chiffrement de bout en bout",
  "enterprise-search": "recherche d'entreprise",
  "eu-datacenters": "centres de données en Europe",
  "eu-hosted": "hébergé dans l'Union européenne",
  "french-hosted": "hébergé en France",
  "french-marketplace": "place de marché française",
  "french-retailer": "détaillant français",
  "gdpr-compliant": "conforme au RGPD",
  "german-datacenters": "centres de données en Allemagne",
  "german-hosted": "hébergé en Allemagne",
  "git-hosting": "hébergement de dépôts Git",
  "large-files": "fichiers volumineux",
  "libreoffice-based": "basé sur LibreOffice",
  lightweight: "léger",
  "local-first": "local-first (les données restent d'abord sur l'appareil)",
  "matrix-protocol": "protocole Matrix",
  "multi-channel": "multicanal",
  "nextcloud-based": "basé sur Nextcloud",
  "no-account": "utilisable sans compte",
  "no-ads": "sans publicité",
  "no-code": "sans code",
  "no-tracking": "sans pistage",
  "non-profit": "porté par un organisme sans but lucratif",
  "office-suite": "suite bureautique",
  "offline-maps": "cartes hors ligne",
  "open-models": "modèles ouverts",
  "open-source": "open source",
  "open-source-based": "basé sur des logiciels open source",
  openstreetmap: "basé sur OpenStreetMap",
  paas: "plateforme en tant que service (PaaS)",
  "patch-management": "gestion des correctifs",
  privacy: "axé sur la vie privée",
  "privacy-focused": "axé sur la vie privée",
  "professional-network": "réseau professionnel",
  "public-broadcaster": "diffuseur public",
  "push-notifications": "notifications poussées",
  refurbished: "matériel reconditionné",
  scheduling: "prise de rendez-vous",
  secnumcloud: "qualifié SecNumCloud",
  "self-hosted": "auto-hébergeable",
  "slack-alternative": "alternative à Slack",
  "smart-scheduling": "planification intelligente",
  sovereign: "souverain",
  "sovereign-ai": "IA souveraine",
  "swiss-hosted": "hébergé en Suisse",
  "team-collaboration": "collaboration d'équipe",
  "tech-culture": "technologie et culture",
  telephony: "téléphonie",
  translation: "traduction",
  "video-conferencing": "visioconférence",
  warranty: "avec garantie",
};

// ---------- extraction ----------

export interface ExtractionCharles {
  outils: OutilClasse[];
  source: Source;
  /** Les catégories de CATEGORIES_CHARLES qu'au moins un outil extrait utilise. */
  categories: Categorie[];
  /** Alternatives exclues par CATEGORIE_PAR_ID (nom et raison). */
  exclus: string[];
  /** Ce que la source dit et que l'extracteur ne sait pas convertir: à ajouter aux tables ci-dessus. */
  avertissements: string[];
}

/** « a, b et c ». */
const enumerer = (items: readonly string[]): string => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} et ${items.at(-1)}`);
/** Les éléments sans doublon, dans l'ordre. */
const uniques = <T>(items: readonly T[]): T[] => [...new Set(items)];

/** La description composée d'une alternative; les caractéristiques inconnues sont rapportées dans `inconnues`. */
export function composerDescription(a: AlternativeCharles, remplace: readonly string[], inconnues: string[] = []): string {
  const pays = PAYS[a.country];
  const tarif = TARIF[a.pricing];
  if (!pays) inconnues.push(`pays « ${a.country} »`);
  if (!tarif) inconnues.push(`tarif « ${a.pricing} »`);
  const caracteristiques: string[] = [];
  for (const f of a.features) {
    const c = CARACTERISTIQUES[f];
    if (c) caracteristiques.push(c);
    else inconnues.push(`caractéristique « ${f} »`);
  }
  const phrases = [`${a.name} est une alternative européenne recensée par Charles${pays ? `, ${pays}` : ""}${tarif ? `, ${tarif}` : ""}.`];
  if (caracteristiques.length) phrases.push(`Caractéristiques : ${uniques(caracteristiques).join(", ")}.`);
  if (remplace.length) phrases.push(`Proposée en remplacement de ${enumerer(remplace)}.`);
  return phrases.join(" ");
}

/** La catégorie du répertoire d'une alternative: exception par id, sinon par catégorie Charles; null = exclue; undefined = inconnue. */
export const categoriePour = (a: Pick<AlternativeCharles, "id" | "category">): string | null | undefined =>
  a.id in CATEGORIE_PAR_ID ? CATEGORIE_PAR_ID[a.id] : CATEGORIE_PAR_CATEGORIE[a.category];

/** Les outils des données de Charles. Lève une erreur si une catégorie, un site ou un nom est incohérent. */
export function extraireCharles(donnees: DonneesCharles): ExtractionCharles {
  const { alternatives, sites } = donnees;
  if (!alternatives.length) throw new Error("données Charles: aucune alternative");
  const connues = new Set(donnees.categories.map((c) => c.id));
  const parId = new Map(alternatives.map((a) => [a.id, a]));
  if (parId.size !== alternatives.length) throw new Error("données Charles: deux alternatives portent le même id");
  const sansTable = new Set<string>();
  const inconnues: string[] = [];
  for (const a of alternatives) {
    if (!connues.has(a.category)) inconnues.push(`${a.name}: catégorie « ${a.category} » absente de data/categories.json`);
    else if (categoriePour(a) === undefined) sansTable.add(a.category);
  }
  if (inconnues.length) throw new Error(`données Charles: ${inconnues.join("; ")}`);
  if (sansTable.size) throw new Error(`données Charles: catégorie sans correspondance dans CATEGORIE_PAR_CATEGORIE (extract-charles.ts): ${[...sansTable].sort().join(", ")}`);
  // sites-us inversé: pour chaque alternative, les sites qu'elle remplace (nom et URL du premier domaine).
  const remplace = new Map<string, { nom: string; url: string }[]>();
  for (const s of sites) {
    const domaine = s.domains[0];
    if (!domaine) throw new Error(`données Charles: le site « ${s.id} » n'a pas de domaine`);
    for (const id of s.alternatives) {
      if (!parId.has(id)) throw new Error(`données Charles: le site « ${s.id} » renvoie à une alternative inconnue « ${id} »`);
      remplace.set(id, [...(remplace.get(id) ?? []), { nom: s.name, url: `https://${domaine}/` }]);
    }
  }
  const avertissements: string[] = [];
  const exclus: string[] = [];
  const outils: OutilClasse[] = [];
  const categoriesUtilisees = new Set<string>();
  for (const a of alternatives) {
    const categorie = categoriePour(a);
    if (categorie === null) {
      exclus.push(`${a.name} (${a.id}: exclue par CATEGORIE_PAR_ID)`);
      continue;
    }
    const lien = LIEN_PAR_ID[a.id] ?? a.url;
    if (!a.name.trim() || !/^https?:\/\/\S+$/.test(lien)) throw new Error(`données Charles: alternative « ${a.id} » sans nom ou sans URL http(s)`);
    const sitesRemplaces = remplace.get(a.id) ?? [];
    if (!sitesRemplaces.length) avertissements.push(`${a.name}: aucun site de sites-us.json ne la propose en alternative`);
    const manques: string[] = [];
    const description = composerDescription(a, uniques(sitesRemplaces.map((s) => s.nom)), manques);
    for (const m of manques) avertissements.push(`${a.name}: ${m} inconnu(e) (à ajouter aux tables de extract-charles.ts)`);
    const classement = classer(description);
    const alternative_a = uniques(sitesRemplaces.map((s) => s.url));
    categoriesUtilisees.add(categorie!);
    outils.push({
      categorie: categorie!, nom: a.name.trim(), score: classement.criteres.length, score_estime: true, lien, description,
      derniere_modification: "", changement: null, source_repertoire_id: ID_CHARLES, pays: a.country,
      ...(alternative_a.length && { alternative_a }),
      ...classement,
    });
  }
  const noms = outils.map((o) => cleNom(o.nom));
  if (new Set(noms).size !== noms.length) throw new Error("données Charles: deux alternatives portent le même nom");
  const categories = CATEGORIES_CHARLES.filter((c) => categoriesUtilisees.has(c.id)).map((c) => ({ ...c }));
  return { outils, source: { ...SOURCE_CHARLES }, categories, exclus, avertissements };
}

// ---------- lecture ----------

/** Les trois fichiers de data/ dans un clone local; datés de l'heure de lecture. */
export function lireDossierCharles(dossier: string, maintenant: string = horodatage()): DonneesCharles {
  const lire = (nom: string) => {
    const chemin = join(dossier, "data", `${nom}.json`);
    if (!existsSync(chemin)) throw new Error(`${chemin}: fichier introuvable`);
    return JSON.parse(readFileSync(chemin, "utf8")) as Record<string, unknown>;
  };
  return assembler(lire("alternatives"), lire("sites-us"), lire("categories"), maintenant);
}

function assembler(alternatives: Record<string, unknown>, sites: Record<string, unknown>, categories: Record<string, unknown>, modification: string): DonneesCharles {
  if (!Array.isArray(alternatives.alternatives)) throw new Error("alternatives.json: tableau « alternatives » attendu");
  if (!Array.isArray(sites.sites)) throw new Error("sites-us.json: tableau « sites » attendu");
  if (!Array.isArray(categories.categories)) throw new Error("categories.json: tableau « categories » attendu");
  return { alternatives: alternatives.alternatives as AlternativeCharles[], sites: sites.sites as SiteCharles[], categories: categories.categories as { id: string }[], modification };
}

/** L'URL d'un fichier brut de data/ et celle de l'API des commits, pour un dépôt GitLab `https://hôte/groupe/projet`. */
export function urlsCharles(depot: string = URL_CHARLES): { brut: (nom: string) => string; commits: string } {
  const u = new URL(depot);
  const chemin = u.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/, "");
  if (chemin.split("/").length < 2) throw new Error(`${depot}: URL d'un dépôt GitLab attendue (https://hôte/groupe/projet)`);
  return {
    brut: (nom: string) => `${u.origin}/${chemin}/-/raw/${BRANCHE}/data/${nom}.json`,
    commits: `${u.origin}/api/v4/projects/${encodeURIComponent(chemin)}/repository/commits?path=data&ref_name=${BRANCHE}&per_page=1`,
  };
}

export interface TelechargementCharles {
  donnees: DonneesCharles;
  /** Vide si la date du dernier commit a été obtenue; sinon, pourquoi les outils sont datés de l'heure de lecture. */
  avertissements: string[];
}

/** Télécharge les trois fichiers de data/ (User-Agent du projet) et la date du dernier commit de data/ (API GitLab, sans clé). */
export async function telechargerCharles(depot: string = URL_CHARLES, telecharger: typeof fetch = fetch, maintenant: string = horodatage()): Promise<TelechargementCharles> {
  const urls = urlsCharles(depot);
  const lire = async (url: string): Promise<unknown> => {
    const reponse = await telecharger(url, { headers: enTetes({ accept: "application/json" }), signal: AbortSignal.timeout(30_000) });
    if (!reponse.ok) throw new Error(`Téléchargement impossible (${url}): HTTP ${reponse.status}`);
    return reponse.json();
  };
  const [alternatives, sites, categories] = await Promise.all(FICHIERS.map((nom) => lire(urls.brut(nom)) as Promise<Record<string, unknown>>));
  const avertissements: string[] = [];
  let modification = maintenant;
  try {
    const commits = (await lire(urls.commits)) as { committed_date?: string }[];
    const date = commits[0]?.committed_date;
    if (!date || Number.isNaN(Date.parse(date))) throw new Error("réponse sans committed_date");
    modification = horodatage(new Date(date));
  } catch (e) {
    avertissements.push(`date du dernier commit inconnue (${(e as Error).message}): outils datés de l'heure de lecture`);
  }
  return { donnees: assembler(alternatives!, sites!, categories!, modification), avertissements };
}

// ---------- synchronisation ----------

export interface SynchronisationCharles {
  resume: Resume;
  /** Alternatives non importées parce qu'un outil actif d'une autre source porte leur nom: « Nom (source) ». */
  doublons: string[];
  exclus: string[];
  ecrit: boolean;
  sourcesEcrites: boolean;
  categoriesEcrites: boolean;
  avertissements: string[];
}

/** Synchronise les outils de la source « charles » dans `fichier` (outils.json), la source dans sources.json et ses catégories dans categories.json. */
export function synchroniserCharles(fichier: string, donnees: DonneesCharles): SynchronisationCharles {
  const lu = lireSiExiste<OutilClasse>(fichier, "outils");
  if (!lu) throw new Error(`${fichier} absent: lancer « node update.ts » d'abord (import initial de Praxis)`);
  const cheminCategories = join(dirname(fichier), "categories.json");
  const categoriesLues = lireSiExiste<Categorie>(cheminCategories, "categories");
  if (!categoriesLues) throw new Error(`${cheminCategories} absent: lancer « node update.ts » d'abord`);
  const { outils: page, source, categories, exclus, avertissements } = extraireCharles(donnees);
  const pris = new Map(lu.donnees.filter((o) => !o.removed && o.source_repertoire_id !== ID_CHARLES).map((o) => [cleNom(o.nom), o.source_repertoire_id]));
  const doublons = page.filter((o) => pris.has(cleNom(o.nom))).map((o) => `${o.nom} (${pris.get(cleNom(o.nom))})`);
  const retenus = page.filter((o) => !pris.has(cleNom(o.nom)));
  const { outils, resume, relies } = mettreAJour(lu.donnees, retenus as Outil[], donnees.modification, ID_CHARLES);
  const total = Object.values(resume).reduce((n, noms) => n + noms.length, 0);
  const ecrit = total > 0 || relies > 0;
  if (ecrit) ecrireFichier(fichier, "outils", outils, lu);
  const cheminSources = join(dirname(fichier), "sources.json");
  const sourcesLues = lireSiExiste<Source>(cheminSources, "sources");
  const sources = sourcesAvec(sourcesLues?.donnees ?? [], source);
  const sourcesEcrites = JSON.stringify(sources) !== JSON.stringify(sourcesLues?.donnees ?? []);
  if (sourcesEcrites) ecrireFichier(cheminSources, "sources", sources, sourcesLues);
  const utilisees = new Set(retenus.map((o) => o.categorie));
  const categoriesApres = categoriesAvec(categoriesLues.donnees, categories.filter((c) => utilisees.has(c.id)));
  const categoriesEcrites = JSON.stringify(categoriesApres) !== JSON.stringify(categoriesLues.donnees);
  if (categoriesEcrites) ecrireFichier(cheminCategories, "categories", categoriesApres, categoriesLues);
  return { resume, doublons, exclus, ecrit, sourcesEcrites, categoriesEcrites, avertissements };
}

if (import.meta.main) {
  await lancer(async () => {
    const args = process.argv.slice(2);
    const dossier = args.find((a) => a.startsWith("--dossier="))?.slice("--dossier=".length);
    const inconnue = args.find((a) => a.startsWith("--") && !a.startsWith("--dossier=") && a !== "--sans-couleur");
    if (inconnue) throw new Error(`Option inconnue: ${inconnue.split("=")[0]}`);
    const positionnels = args.filter((a) => !a.startsWith("--"));
    const url = positionnels.find((a) => /^https?:\/\//.test(a)) ?? URL_CHARLES;
    const fichier = positionnels.find((a) => !/^https?:\/\//.test(a)) ?? FICHIER_OUTILS;
    const sortie = creerCouleurs(couleursActives(process.stdout, process.env, args.includes("--sans-couleur")));
    if (dossier && !existsSync(dossier)) throw new Error(`${dossier}: dossier introuvable`);
    const maintenant = horodatage();
    const lecture = dossier ? { donnees: lireDossierCharles(dossier, maintenant), avertissements: [] } : await telechargerCharles(url, fetch, maintenant);
    const r = synchroniserCharles(fichier, lecture.donnees);
    console.log(sortie.attenue(`Source charles (${dossier ?? url}), lue le ${maintenant}`));
    for (const ligne of lignesResume(r.resume, lecture.donnees.modification, sortie)) console.log(ligne);
    if (r.doublons.length) console.log(`  ${sortie.attenue("déjà au répertoire, non importés")}: ${r.doublons.join(", ")}`);
    if (r.exclus.length) console.log(`  ${sortie.attenue("exclus")}: ${r.exclus.join(", ")}`);
    for (const a of [...lecture.avertissements, ...r.avertissements]) console.error(sortie.jaune(`Avertissement: ${a}`));
    if (r.ecrit) console.log(`${sortie.vert(fichier)} mis à jour`);
    if (r.sourcesEcrites) console.log(`${sortie.vert(join(dirname(fichier), "sources.json"))} mis à jour`);
    if (r.categoriesEcrites) console.log(`${sortie.vert(join(dirname(fichier), "categories.json"))} mis à jour`);
    if (r.resume.nouveau.length) console.log(sortie.attenue(`Lancer « node update.ts » pour enrichir les ${r.resume.nouveau.length} outil(s) nouveau(x).`));
  });
}
