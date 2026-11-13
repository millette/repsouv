// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Extrait les outils et les critères du répertoire de souveraineté numérique vers du JSON,
// à partir de la page en ligne (téléchargée à chaque exécution).
// Source: https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/
// Usage: node packages/scripts/extract.ts [--force] <outils.json> [criteres.json] [url]
// categories.json est écrit à côté de outils.json (identifiant, nom et icône de chaque catégorie; les descriptions existantes sont conservées).
// Les outils sont écrits sans classification; lancer ensuite classify.ts. Les fichiers écrits portent
// leurs métadonnées (data_license, created_at, updated_at): voir fichiers.ts.
// ATTENTION: le fichier de sortie est remplacé en entier. Sans --force, le script refuse d'écraser
// un outils.json qui contient du travail impossible à retrouver (enrichissement, historique des
// changements). Pour suivre la page sans rien perdre, utiliser update.ts.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseHTML } from "linkedom";
import { enTetes } from "./agent.ts";
import { lancer } from "./cli.ts";
import { ecrireFichier, lireFichier, lireSiExiste, type Lu } from "./fichiers.ts";
import { ID_PRAXIS } from "../commun/ids.ts";
import { localVersIso } from "./temps.ts";
import { categoriesDepuis, slug, type Categorie } from "./categories.ts";
import { ID_PAR_ICONE } from "../commun/ids.ts";
import type { Critere, Outil } from "../commun/modele.ts";

export type { Changement, ConfianceEvaluation, Critere, CriteresConfirmes, EvaluationEnrichie, OpenHub, Outil } from "../commun/modele.ts";

export interface Repertoire {
  outils: Outil[];
  /** Les catégories de la page (id, nom, icône), sans description. */
  categories: Categorie[];
  criteres: Critere[];
  /** Date de modification affichée sur la page, en ISO avec décalage (ex.: 2026-11-05T09:53:00-05:00). */
  modification: string;
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/**
 * « 5 novembre 2026 09:53 » → « 2026-11-05T09:53:00-05:00 ». La page affiche l'heure de l'Est (Toronto):
 * on lui ajoute le décalage de Toronto qui s'applique ce jour-là (heure d'été comprise).
 */
export function dateIso(affichee: string): string {
  const m = /^(\d{1,2}) (\S+) (\d{4}) (\d{2}):(\d{2})$/.exec(affichee.trim());
  const mois = m ? MOIS.indexOf(m[2]!.toLowerCase()) + 1 : 0;
  if (!m || !mois) throw new Error(`Date inattendue: « ${affichee} »`);
  return localVersIso(Number(m[3]), mois, Number(m[1]), Number(m[4]), Number(m[5]));
}

const texte = (n: { textContent: string | null } | null | undefined) => n?.textContent?.trim() ?? "";
const separerIcone = (s: string) => {
  const [icone = "", ...reste] = s.split(" ");
  return { icone, reste: reste.join(" ") };
};

export const URL_REPERTOIRE = "https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/";

export const estUrl = (s: string) => /^https?:\/\//.test(s);

/** Télécharge la page du répertoire et en extrait les outils, les critères et la date de modification. */
export async function telechargerRepertoire(url: string = URL_REPERTOIRE): Promise<Repertoire> {
  let reponse: Response;
  try {
    reponse = await fetch(url, { headers: enTetes({ accept: "text/html" }), signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    const cause = (e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message;
    throw new Error(`Téléchargement impossible (${url}): ${cause}`);
  }
  if (!reponse.ok) throw new Error(`Téléchargement impossible (${url}): HTTP ${reponse.status}`);
  return extraire(await reponse.text());
}

export function extraire(html: string): Repertoire {
  const { document } = parseHTML(html);

  const etiquette = [...document.querySelectorAll("p.overline-col")].find((p) => texte(p) === "Modification");
  const affichee = texte(etiquette?.nextElementSibling);
  if (!affichee) throw new Error("Date de modification introuvable dans la page");
  const modification = dateIso(affichee);

  const outils: Outil[] = [];
  const observees: { nom: string; icone: string }[] = [];
  for (const bq of document.querySelectorAll("blockquote")) {
    const titre = texte(bq.querySelector("h3"));
    if (!titre) continue;
    const { icone, reste: nomCategorie } = separerIcone(titre);
    observees.push({ nom: nomCategorie, icone });
    const categorie = slug(nomCategorie);

    for (const a of bq.querySelectorAll("p > strong > a[href]")) {
      const strong = a.parentElement!;
      const desc = strong.parentElement!.nextElementSibling;
      if (desc?.tagName !== "P") continue;
      outils.push({
        categorie,
        nom: texte(a),
        score: [...(strong.textContent ?? "")].filter((c) => c === "★").length,
        lien: a.getAttribute("href")!,
        description: texte(desc),
        derniere_modification: modification,
        changement: null,
        source_repertoire_id: ID_PRAXIS,
      });
    }
  }
  const noms = outils.map((o) => o.nom);
  const doublon = noms.find((n, i) => noms.indexOf(n) !== i);
  if (doublon) throw new Error(`Nom d'outil en double: ${doublon}`);

  const criteres: Critere[] = [];
  for (const strong of document.querySelectorAll("li > strong")) {
    if (!texte(strong).includes("?")) continue;
    const { icone, reste } = separerIcone(texte(strong));
    const id = ID_PAR_ICONE[icone];
    if (!id) throw new Error(`Critère à l'icône inconnue: ${icone}`);
    // La description est le texte de l'<li> qui suit le <strong> du titre.
    const li = strong.parentElement!;
    criteres.push({
      id,
      icon: icone,
      titre: reste,
      description: (li.textContent ?? "").replace(strong.textContent ?? "", "").trim(),
    });
  }
  return { outils, categories: categoriesDepuis(observees, []), criteres, modification };
}

/** Les champs ajoutés par l'enrichissement (voir enrichir.ts). */
export const CHAMPS_ENRICHIS = [
  "description_longue", "tags", "source", "licence", "custom_license", "custom_license_url", "repo", "evaluation_enrichie",
  "enrichi_le", "criteres_confirmes",
] as const;

/**
 * Décrit ce qu'un nouvel import écraserait sans pouvoir le retrouver: l'enrichissement (appels
 * à l'API) et l'historique des changements (update.ts). La classification n'en fait pas partie:
 * classify.ts la recalcule. Retourne une liste vide s'il n'y a rien à perdre.
 */
export function travailAPerdre(outils: Partial<Outil>[]): string[] {
  const enrichis = outils.filter((o) => CHAMPS_ENRICHIS.some((c) => o[c] !== undefined)).length;
  const historiques = outils.filter((o) => o.removed || (o.changement ?? null) !== null).length;
  return [
    ...(enrichis ? [`${enrichis} outil(s) enrichi(s) par IA`] : []),
    ...(historiques ? [`${historiques} outil(s) avec un historique de changement (changement ou removed)`] : []),
  ];
}

/** Arrête le script avec le code 1 plutôt que d'écraser outils.json (sauf --force). */
function refuser(raison: string): never {
  console.error(
    `Refus d'écraser: ${raison}\n` +
      `Pour synchroniser sans rien perdre, utiliser update.ts. Pour tout remplacer quand même: node packages/scripts/extract.ts --force outils.json criteres.json.`,
  );
  process.exit(1);
}

if (import.meta.main) {
  await lancer(async () => {
    const args = process.argv.slice(2);
    const force = args.includes("--force");
    const inconnue = args.find((a) => a.startsWith("--") && a !== "--force");
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    const positionnels = args.filter((a) => !a.startsWith("--"));
    const url = positionnels.find(estUrl) ?? URL_REPERTOIRE;
    const [dstOutils, dstCriteres] = positionnels.filter((a) => !estUrl(a));
    if (!dstOutils) throw new Error("Usage: node packages/scripts/extract.ts [--force] <outils.json> [criteres.json] [url]");

    // Le fichier de SORTIE (outils.json), s'il existe déjà: il sert au garde-fou et à conserver meta.created_at.
    // La page, elle, n'est jamais lue sur disque: elle est téléchargée en mémoire (telechargerRepertoire)
    // et aucun fichier HTML n'est lu ni écrit.
    let existant: Lu<Outil> | null = null;
    if (existsSync(dstOutils)) {
      try {
        existant = lireFichier<Outil>(dstOutils, "outils");
      } catch (e) {
        if (!force) refuser(`${dstOutils} n'a pas le format attendu et pourrait contenir du travail (${(e as Error).message}).`);
      }
    }
    if (!force && existant) {
      const perte = travailAPerdre(existant.donnees);
      if (perte.length) refuser(`${dstOutils} contient du travail qui serait perdu (${perte.join("; ")}).`);
    }

    const { outils, categories, criteres, modification } = await telechargerRepertoire(url);
    ecrireFichier(dstOutils, "outils", outils, existant);
    console.log(outils.length, "outils (modification:", modification + ")");
    const dstCategories = join(dirname(dstOutils), "categories.json");
    const connues = lireSiExiste<Categorie>(dstCategories, "categories");
    ecrireFichier(dstCategories, "categories", categoriesDepuis(categories, connues?.donnees ?? []), connues);
    console.log(categories.length, "catégories");
    if (dstCriteres) {
      ecrireFichier(dstCriteres, "criteres", criteres, lireSiExiste<Critere>(dstCriteres, "criteres"));
      console.log(criteres.length, "critères");
    }
  });
}
