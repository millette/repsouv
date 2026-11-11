// Extrait les outils et les critères du répertoire de souveraineté numérique vers du JSON.
// Source: https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/
// Usage: nub extract.ts <dossier contenant le .html sauvegardé> <outils.json> [criteres.json]
// Les outils sont écrits sans classification; lancer ensuite classify.ts.
import { globSync, readFileSync, writeFileSync } from "node:fs";
import { parseHTML } from "linkedom";
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
  /** Dernière date de modification connue (ISO, heure locale du site). */
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
  /** Licence du logiciel (identifiant SPDX si possible); null si propriétaire ou inconnue. */
  licence?: string | null;
  /** URL du dépôt de code source, sur n'importe quelle forge; null si aucun. */
  repo?: string | null;
  /** Second avis sur score et critères, à comparer à `score` et `criteres` du répertoire. */
  evaluation_enrichie?: EvaluationEnrichie;
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
  /** Date de modification affichée sur la page, en ISO (ex.: 2026-11-05T09:53). */
  modification: string;
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « 5 novembre 2026 09:53 » → « 2026-11-05T09:53 ». */
export function dateIso(affichee: string): string {
  const m = /^(\d{1,2}) (\S+) (\d{4}) (\d{2}):(\d{2})$/.exec(affichee.trim());
  const mois = m ? MOIS.indexOf(m[2]!.toLowerCase()) + 1 : 0;
  if (!m || !mois) throw new Error(`Date inattendue: « ${affichee} »`);
  const p = (n: string | number) => String(n).padStart(2, "0");
  return `${m[3]}-${p(mois)}-${p(m[1]!)}T${m[4]}:${m[5]}`;
}

const texte = (n: { textContent: string | null } | null | undefined) => n?.textContent?.trim() ?? "";
const separerIcone = (s: string) => {
  const [icone = "", ...reste] = s.split(" ");
  return { icone, reste: reste.join(" ") };
};

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

if (import.meta.main) {
  const [dir, dstOutils, dstCriteres] = process.argv.slice(2);
  if (!dir || !dstOutils) throw new Error("Usage: nub extract.ts <dossier> <outils.json> [criteres.json]");
  const fichier = globSync(`${dir}/*.html`)[0];
  if (!fichier) throw new Error(`Aucun fichier .html dans ${dir}`);
  const { outils, criteres, modification } = extraire(readFileSync(fichier, "utf8"));
  writeFileSync(dstOutils, JSON.stringify(outils, null, 2));
  console.log(outils.length, "outils (modification:", modification + ")");
  if (dstCriteres) {
    writeFileSync(dstCriteres, JSON.stringify(criteres, null, 2));
    console.log(criteres.length, "critères");
  }
}
