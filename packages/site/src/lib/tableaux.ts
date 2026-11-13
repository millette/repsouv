// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Tableau des mêmes chiffres, sous chaque graphique de la page « Statistiques »
// (specs/003-page-statistiques/data-model.md). Les lignes sont les valeurs que le graphique dessine
// (spec.data.values): le tableau ne peut pas le contredire. S'y ajoutent la provenance de ce que le graphique compte,
// la base de ses pourcentages, et, quand un filtre de l'explorateur existe, un lien vers les outils comptés.
import { adresseExplorer } from "./adresses.ts";
import { formaterDate, LIBELLES_STATUT } from "./libelles.ts";
import { nombre, pourcent } from "./nombres.ts";
import { LIBELLES_PROVENANCE, type Provenance } from "./provenance.ts";
import type { Statut } from "./repertoire.ts";
import type { Graphique, Statistiques } from "./statistiques.ts";

type Format = "texte" | "nombre" | "pourcent" | "date";

interface Colonne {
  champ: string;
  titre: string;
  format: Format;
}

export interface Cellule {
  texte: string;
  /** Adresse de l'explorateur filtré sur les outils que la ligne compte. */
  lien?: string;
}

export interface Tableau {
  legende: string;
  colonnes: string[];
  lignes: Cellule[][];
}

/** Ce qu'il faut pour ramener un libellé à l'identifiant d'un filtre de l'explorateur. */
export interface Contexte {
  base: string;
  categories: readonly { id: string; nom: string }[];
  tags: readonly string[];
}

const col = (champ: string, titre: string, format: Format = "texte"): Colonne => ({ champ, titre, format });

const COLONNES: Record<string, Colonne[]> = {
  "statut-code-source": [col("statut", "Statut du code source"), col("n", "Outils", "nombre"), col("etiquette", "Outils et part")],
  "categories-statut": [col("categorie", "Catégorie"), col("statut", "Statut du code source"), col("n", "Outils", "nombre")],
  "criteres-repertoire-enrichie": [col("critere", "Critère"), col("evaluation", "Évaluation"), col("etiquette", "Part et nombre d'outils")],
  "criteres-par-statut": [col("evaluation", "Évaluation"), col("statut", "Statut du code source"), col("critere", "Critère"), col("etiquette", "Outils"), col("pct", "Part", "pourcent")],
  "criteres-verdicts": [col("statut", "Statut du code source"), col("critere", "Critère"), col("verdict", "Verdict"), col("n", "Outils", "nombre"), col("outils", "Outils vérifiés du statut", "nombre"), col("pct", "Part", "pourcent")],
  licences: [col("licence", "Licence"), col("famille", "Famille"), col("n", "Outils", "nombre")],
  forges: [col("forge", "Forge"), col("n", "Outils", "nombre")],
  tags: [col("tag", "Tag"), col("n", "Outils", "nombre")],
  "enrichissement-jours": [col("jour", "Jour"), col("n", "Outils enrichis", "nombre")],
};

type Valeur = Record<string, unknown>;

export function valeursDe(graphique: Graphique): Valeur[] {
  const valeurs = (graphique.spec as { data?: { values?: unknown } }).data?.values;
  return Array.isArray(valeurs) ? (valeurs as Valeur[]) : [];
}

function formater(valeur: unknown, format: Format): string {
  if (format === "nombre" && typeof valeur === "number") return nombre(valeur);
  if (format === "pourcent" && typeof valeur === "number") return pourcent(valeur);
  if (format === "date" && typeof valeur === "string") return formaterDate(valeur);
  return String(valeur ?? "");
}

const ID_STATUT = new Map(Object.entries(LIBELLES_STATUT).map(([id, libelle]) => [libelle, id as Statut]));

/** Paramètres de l'explorateur pour les outils que la ligne compte, ou rien si aucun filtre n'y correspond. */
function parametresDe(id: string, valeur: Valeur, contexte: Contexte): string | undefined {
  const statut = typeof valeur.statut === "string" ? ID_STATUT.get(valeur.statut) : undefined;
  if (id === "statut-code-source") return statut ? `statut=${statut}` : undefined;
  if (id === "categories-statut") {
    const categorie = contexte.categories.find((c) => c.nom === valeur.categorie);
    return categorie && statut ? `categorie=${categorie.id}&statut=${statut}` : undefined;
  }
  if (id === "tags") return typeof valeur.tag === "string" && contexte.tags.includes(valeur.tag) ? `tag=${valeur.tag}` : undefined;
  return undefined;
}

export function tableauDe(graphique: Graphique, contexte: Contexte): Tableau {
  const valeurs = valeursDe(graphique);
  // Un graphique que cette table ne connaît pas encore garde un tableau: une colonne par champ de ses valeurs.
  const colonnes = COLONNES[graphique.id] ?? Object.keys(valeurs[0] ?? {}).map((champ) => col(champ, champ, typeof valeurs[0]![champ] === "number" ? "nombre" : "texte"));
  const dates = graphique.id === "enrichissement-jours";
  return {
    legende: graphique.titre,
    colonnes: colonnes.map((c) => c.titre),
    lignes: valeurs.map((valeur) => {
      const parametres = parametresDe(graphique.id, valeur, contexte);
      return colonnes.map((c, i): Cellule => {
        const texte = formater(valeur[c.champ], dates && c.champ === "jour" ? "date" : c.format);
        return i === 0 && parametres ? { texte, lien: adresseExplorer(contexte.base, parametres) } : { texte };
      });
    }),
  };
}

export interface ProvenanceGraphique {
  /** Libellés affichés, en texte. */
  libelles: string[];
  /** Ce que le graphique compte, et d'où cela vient. */
  note: string;
}

const P = (provenances: Provenance[], note: string): ProvenanceGraphique => ({ libelles: provenances.map((p) => LIBELLES_PROVENANCE[p]), note });
const CRITERES = "« Répertoire (déduit) » : critères déduits des étoiles par ce dépôt. « Évaluation enrichie » : évaluation par IA d'après la page de l'outil.";

const PROVENANCES: Record<string, ProvenanceGraphique> = {
  "statut-code-source": P(["ia"], "Le statut du code source de chaque outil est établi par un modèle d'IA."),
  "categories-statut": P(["ia"], "La catégorie vient de la source ; le statut du code source est établi par un modèle d'IA."),
  "criteres-repertoire-enrichie": P(["heuristique", "ia"], CRITERES),
  "criteres-par-statut": P(["heuristique", "ia"], `${CRITERES} Le statut du code source est établi par un modèle d'IA.`),
  "criteres-verdicts": P(["ia"], "Critères vérifiés par un modèle d'IA d'après la page de l'outil, citation à l'appui ; les citations sont sur les fiches."),
  licences: P(["ia"], "La licence de chaque logiciel est relevée par un modèle d'IA."),
  forges: P(["ia"], "Le dépôt de code de chaque outil est relevé par un modèle d'IA."),
  tags: P(["ia"], "Les tags de chaque outil sont attribués par un modèle d'IA."),
  "enrichissement-jours": { libelles: [], note: "Dates d'enrichissement enregistrées par les scripts du dépôt." },
};

export function provenanceDe(id: string): ProvenanceGraphique {
  return PROVENANCES[id] ?? { libelles: [], note: "" };
}

/** Sur combien d'outils portent les chiffres du graphique. */
export function baseDe(id: string, stats: Statistiques): string {
  const tous = `Sur ${nombre(stats.total)} outils`;
  const enrichis = `sur les ${nombre(stats.enrichissement.enrichis)} outils enrichis`;
  const verifies = stats.criteres.confirmes.outils;
  switch (id) {
    case "statut-code-source":
    case "categories-statut":
      return `${tous}.`;
    case "criteres-repertoire-enrichie":
    case "criteres-par-statut":
      return `Répertoire (déduit) : ${tous.toLowerCase()} ; évaluation enrichie : ${enrichis}.`;
    case "criteres-verdicts":
      return `Sur les ${nombre(verifies)} outils vérifiés.`;
    case "licences":
      return `Outils enrichis ayant une licence SPDX, ${enrichis}.`;
    case "forges":
      return `Outils enrichis ayant un dépôt de code, ${enrichis}.`;
    case "tags":
      return `Outils portant chaque tag, ${enrichis} ; un outil porte de 1 à 5 tags.`;
    case "enrichissement-jours":
      return `${enrichis.charAt(0).toUpperCase()}${enrichis.slice(1)}.`;
    default:
      return `${tous}.`;
  }
}
