// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Extrait les outils et les critères du répertoire de souveraineté numérique vers du JSON,
// à partir de la page en ligne (téléchargée à chaque exécution).
// Source: https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/
// Usage: nub extract.ts [--force] <outils.json> [criteres.json] [url]
// Les outils sont écrits sans classification; lancer ensuite classify.ts. Les fichiers écrits portent
// leurs métadonnées (data_license, created_at, updated_at): voir fichiers.ts.
// ATTENTION: le fichier de sortie est remplacé en entier. Sans --force, le script refuse d'écraser
// un outils.json qui contient du travail impossible à retrouver (enrichissement, historique des
// changements). Pour suivre la page sans rien perdre, utiliser update.ts.
import { existsSync } from "node:fs";
import { parseHTML } from "linkedom";
import { lancer } from "./cli.ts";
import { ecrireFichier, lireFichier, lireSiExiste, type Lu } from "./fichiers.ts";
import { localVersIso } from "./temps.ts";
import { ID_PAR_ICONE, type CritereId } from "./ids.ts";

export type ConfianceEvaluation = "élevée" | "moyenne" | "faible";

/** Évaluation indépendante des critères de souveraineté, produite par l'enrichissement. */
export interface EvaluationEnrichie {
  /** Nombre de critères satisfaits, de 0 à 3 (égal à criteres.length). */
  score: number;
  criteres: CritereId[];
  confiance: ConfianceEvaluation;
  /** Explication de l'écart avec `score`/`criteres` du répertoire; présent seulement quand ils diffèrent. */
  ecart?: string;
}

export type Changement = "nouveau" | "modification" | "retrait" | "comeback";

export interface Outil {
  categorie: string;
  icone: string;
  nom: string;
  score: number;
  lien: string;
  description: string;
  /** Dernière date de modification connue: ISO 8601 en heure de Toronto, avec décalage (2026-11-05T09:53:00-05:00). */
  derniere_modification: string;
  /** Nature du dernier changement détecté par update.ts; null si jamais modifié depuis l'import. */
  changement: Changement | null;
  /** Présent (true) seulement si l'outil a disparu de la page; l'entrée est alors conservée. */
  removed?: true;
  // Champs ajoutés par `update.ts --enrichir` (voir enrichir.ts); absents tant que l'outil n'est pas enrichi.
  /** Description longue en français (Markdown, sans image ni HTML), générée une seule fois. */
  description_longue?: string;
  /** 1 à 5 identifiants de tags (voir tags.json). */
  tags?: string[];
  /** Statut du code source. */
  source?: "libre" | "partiel" | "source-disponible" | "proprietaire";
  /** Expression de licence SPDX valide (voir spdx.ts); null si propriétaire, inconnue ou sans identifiant SPDX. */
  licence?: string | null;
  /** Nom ou identifiant d'une licence qui n'est pas dans la liste SPDX; exclusif avec `licence`. */
  custom_license?: string | null;
  /** URL du texte de la licence maison, quand elle est disponible; exige `custom_license`. */
  custom_license_url?: string | null;
  /** URL du dépôt de code source, sur n'importe quelle forge; null si aucun. */
  repo?: string | null;
  /** Second avis sur score et critères, à comparer à `score` et `criteres` du répertoire. */
  evaluation_enrichie?: EvaluationEnrichie;
  /**
   * true si la page de l'outil a servi à l'enrichissement; false si l'outil a été enrichi sans
   * page lisible (option --sans-page), à partir de sa seule description: résultat moins fiable.
   */
  page_lue?: boolean;
}

export interface Critere {
  id: CritereId;
  icon: string;
  titre: string;
  description: string;
}

export interface Repertoire {
  outils: Outil[];
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
    reponse = await fetch(url, { signal: AbortSignal.timeout(30_000) });
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
  for (const bq of document.querySelectorAll("blockquote")) {
    const titre = texte(bq.querySelector("h3"));
    if (!titre) continue;
    const { icone, reste: categorie } = separerIcone(titre);

    for (const a of bq.querySelectorAll("p > strong > a[href]")) {
      const strong = a.parentElement!;
      const desc = strong.parentElement!.nextElementSibling;
      if (desc?.tagName !== "P") continue;
      outils.push({
        categorie,
        icone,
        nom: texte(a),
        score: [...(strong.textContent ?? "")].filter((c) => c === "★").length,
        lien: a.getAttribute("href")!,
        description: texte(desc),
        derniere_modification: modification,
        changement: null,
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
  return { outils, criteres, modification };
}

/** Les champs ajoutés par l'enrichissement (voir enrichir.ts). */
export const CHAMPS_ENRICHIS = [
  "description_longue", "tags", "source", "licence", "custom_license", "custom_license_url", "repo", "evaluation_enrichie",
  "page_lue",
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
      `Pour synchroniser sans rien perdre, utiliser update.ts. Pour tout remplacer quand même: nub run extract --force (ou nub run build:force).`,
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
    if (!dstOutils) throw new Error("Usage: nub extract.ts [--force] <outils.json> [criteres.json] [url]");

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

    const { outils, criteres, modification } = await telechargerRepertoire(url);
    ecrireFichier(dstOutils, "outils", outils, existant);
    console.log(outils.length, "outils (modification:", modification + ")");
    if (dstCriteres) {
      ecrireFichier(dstCriteres, "criteres", criteres, lireSiExiste<Critere>(dstCriteres, "criteres"));
      console.log(criteres.length, "critères");
    }
  });
}
