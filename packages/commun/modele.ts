// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Modèle des données du dépôt (donnees/*.json): les types que les scripts (packages/scripts) et le site (packages/site)
// partagent. Des types seulement: aucun code n'est exécuté ici (les identifiants fixes sont dans ids.ts). Les schémas
// JSON de donnees/schemas/ en sont générés (packages/scripts/schemas-types.ts, generer-schemas.ts): changer un type
// change le schéma.
import type { CritereId } from "./ids.ts";

/** Identifiant court d'un critère (champ `id` de criteres.json), voir ids.ts. */
export type { CritereId };

// ---------- métadonnées d'un fichier ----------

/** Champ « meta » de chaque fichier de données (voir packages/scripts/fichiers.ts, qui le maintient). */
export interface Metadonnees {
  data_license: string;
  created_at: string;
  updated_at: string;
}

// ---------- outils ----------

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

/**
 * Critères vérifiés par une IA à partir de la page de l'outil (confirmer.ts, appelé par update.ts après l'enrichissement,
 * règle A pour « controle »), avec la citation à l'appui. Indépendant de `criteres`, qui reste lié aux étoiles de la source: il peut en compter moins.
 */
export interface CriteresConfirmes {
  /** Critères confirmés, dans l'ordre de criteres.json. */
  criteres: CritereId[];
  /** Citation (copiée mot pour mot de la description ou de la page) pour chaque critère confirmé. */
  preuves: Partial<Record<CritereId, string>>;
  /** Citation pour chaque critère infirmé; un critère absent des deux est indéterminé (la page ne permet pas de conclure). */
  infirmes: Partial<Record<CritereId, string>>;
  modele: string;
  /** Date de la confirmation (ISO 8601, heure de Toronto, avec décalage). */
  date: string;
}

/** Données publiques d'Open Hub (openhub.net) sur un projet libre, lues par openhub.ts; null quand Open Hub ne les donne pas. */
export interface OpenHub {
  organisation: string | null;
  /** Indice d'activité d'Open Hub: « Inactive », « Very Low », « Low », « Moderate », « High », « Very High », « New » ou « NA ». */
  activite: string | null;
  /** Licences déclarées sur Open Hub (noms Open Hub, pas SPDX), pour contrôler `licence`. */
  licences: string[];
  langage_principal: string | null;
  lignes_de_code: number | null;
  contributeurs_total: number | null;
  contributeurs_12_mois: number | null;
  commits_12_mois: number | null;
  /** Premier et dernier mois de l'analyse (AAAA-MM-JJ). */
  premier_mois: string | null;
  dernier_mois: string | null;
  /** Date de la lecture (ISO 8601, heure de Toronto). */
  consulte_le: string;
}

export type Changement = "nouveau" | "modification" | "retrait" | "comeback";

export interface Outil {
  /** Identifiant de la catégorie: categories[].id de categories.json (slug du nom). */
  categorie: string;
  nom: string;
  /** Nombre d'étoiles (0 à 3) donné par la source; estimé (voir score_estime) quand la source n'en donne pas. */
  score: number;
  /**
   * Présent (true) quand la source ne donne pas d'étoiles: score, criteres et confiance viennent de l'évaluation enrichie
   * (ou, avant l'enrichissement, de la classification par seuil de la description).
   */
  score_estime?: true;
  /** Identifiant de la source de l'outil: sources[].id de sources.json (« praxis » pour le répertoire Praxis). */
  source_repertoire_id: string;
  /** Services, souvent propriétaires, auxquels l'outil se substitue (URL), quand la source le dit (FACiL). */
  alternative_a?: string[];
  /** Logiciel libre dont l'outil est une instance hébergée (nom et lien vers son dépôt ou sa version), quand la source le dit (FACiL). */
  instance_de?: { nom: string; url: string };
  /** Noms des autres outils (outils[].nom) qui reposent sur le même logiciel (nom, ou instance_de.nom): posé par logiciel.ts à chaque écriture; absent sinon. */
  voir_aussi?: string[];
  /** Pays de l'éditeur, tel que la source le donne (code ISO 3166-1 alpha-2, ou « EU », « UK »), quand la source le dit (Charles); absent sinon. */
  pays?: string;
  lien: string;
  description: string;
  /** Dernière date de modification connue: ISO 8601 en heure de Toronto, avec décalage (2026-11-05T09:53:00-05:00). */
  derniere_modification: string;
  /** Nature du dernier changement détecté par update.ts; null si jamais modifié depuis l'import. */
  changement: Changement | null;
  /** Présent (true) seulement si l'outil a disparu de la page; l'entrée est alors conservée. */
  removed?: true;
  /**
   * Nombre d'échecs consécutifs d'enrichissement (page inaccessible, réponses invalides); absent tant qu'aucun échec,
   * retiré dès que l'enrichissement réussit. À MAX_ECHECS_PAR_DEFAUT (abandon.ts), l'outil n'est plus tenté sans --max-echecs.
   */
  echecs_enrichissement?: number;
  /** Nombre d'échecs consécutifs de la vérification des critères (confirmer.ts); même mécanique que echecs_enrichissement. */
  echecs_confirmation?: number;
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
  /** Date et heure de l'enrichissement de l'outil (ISO 8601, heure de Toronto, avec décalage). Absente pour les outils enrichis avant l'ajout de ce champ. */
  enrichi_le?: string;
  /** Critères vérifiés par une IA, citation à l'appui (voir CriteresConfirmes); absent tant que la vérification n'a pas réussi. */
  criteres_confirmes?: CriteresConfirmes;
  /** Projet Open Hub concordant (vanity_name, voir openhub.ts) et ses données; seulement pour les logiciels au code public. */
  openhub_id?: string;
  openhub?: OpenHub;
  /** Échecs consécutifs de la recherche Open Hub (aucune concordance sûre, erreur); même mécanique que echecs_enrichissement. */
  echecs_openhub?: number;
}

export interface Critere {
  id: CritereId;
  icon: string;
  titre: string;
  description: string;
}

/** Confiance de la classification par classify.ts (packages/scripts). */
export type Confiance = "élevée" | "moyenne" | "faible" | "indéterminée";

/** Ce que classify.ts déduit de la description et du score. */
export interface Classement {
  /** Identifiants (voir criteres.json) des critères que les étoiles représentent. */
  criteres: CritereId[];
  confiance: Confiance;
}

/** Un outil tel qu'il est écrit dans outils.json: l'outil de la source et son classement. */
export interface OutilClasse extends Outil, Classement {}

// ---------- catégories ----------

export interface Categorie {
  /** Slug du nom (voir slug); référencé par outils[].categorie. */
  id: string;
  nom: string;
  icone: string;
  /** Description en français, générée par IA; absente tant qu'elle n'a pas été produite. */
  description?: string;
  /**
   * Identifiant de la source (sources[].id) dont l'extracteur déclare la catégorie, quand elle ne vient pas de la page
   * Praxis: `update` la conserve telle quelle au lieu de la resynchroniser depuis la page. Absent pour les catégories de Praxis.
   */
  source_repertoire_id?: string;
}

// ---------- tags ----------

export interface Tag {
  id: string;
  description: string;
  /** Présent seulement sur les tags ajoutés après le vocabulaire initial. */
  justification?: string;
  /** Outil pour lequel le tag a été proposé (tags ajoutés seulement). */
  propose_pour?: string;
}

// ---------- sources ----------

/** Qui a soumis une collection ajoutée à la main; seul le nom est obligatoire. */
export interface SoumisPar {
  nom: string;
  url?: string;
  email?: string;
}

export type Extracteur = "praxis" | "facil" | "charles" | "manuel";

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
