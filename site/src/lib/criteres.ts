// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les trois lectures des critères de souveraineté d'un outil. Elles ne mesurent pas la même chose et n'ont pas la même
// provenance: la fiche les montre séparément, chacune sous son nom (FR-034).
import type { Critere, OutilClasse } from "./donnees.ts";

export type StatutVerdict = "confirme" | "infirme" | "indetermine";

export interface Verdict {
  critere: Critere;
  statut: StatutVerdict;
  /** Citation copiée mot pour mot de la page de l'outil; absente pour un critère indéterminé. */
  citation?: string;
}

/** Critères vérifiés par un modèle d'IA d'après la page de l'outil, citation à l'appui (criteres_confirmes). */
export interface LectureVerifiee {
  verdicts: Verdict[];
  modele: string;
  date: string;
}

/** Critères que les étoiles représentent, déduits de la description par une heuristique du dépôt (criteres, confiance). */
export interface LectureDeduite {
  criteres: Critere[];
  confiance: OutilClasse["confiance"];
}

/** Évaluation indépendante par un modèle d'IA (evaluation_enrichie). */
export interface SecondAvis {
  score: number;
  criteres: Critere[];
  confiance: string;
  /** Explication de l'écart avec le répertoire; présente seulement quand les deux diffèrent. */
  ecart?: string;
}

export interface Lectures {
  verifies?: LectureVerifiee;
  deduits: LectureDeduite;
  secondAvis?: SecondAvis;
}

export function lecturesCriteres(outil: OutilClasse, criteres: readonly Critere[]): Lectures {
  const parmi = (ids: readonly string[]) => criteres.filter((c) => ids.includes(c.id));
  const lectures: Lectures = { deduits: { criteres: parmi(outil.criteres), confiance: outil.confiance } };

  const confirmes = outil.criteres_confirmes;
  if (confirmes) {
    lectures.verifies = {
      verdicts: criteres.map((critere): Verdict => {
        if (confirmes.criteres.includes(critere.id)) {
          const citation = confirmes.preuves[critere.id];
          return citation ? { critere, statut: "confirme", citation } : { critere, statut: "confirme" };
        }
        const contre = confirmes.infirmes[critere.id];
        return contre ? { critere, statut: "infirme", citation: contre } : { critere, statut: "indetermine" };
      }),
      modele: confirmes.modele,
      date: confirmes.date,
    };
  }

  const avis = outil.evaluation_enrichie;
  if (avis) {
    lectures.secondAvis = { score: avis.score, criteres: parmi(avis.criteres), confiance: avis.confiance, ...(avis.ecart ? { ecart: avis.ecart } : {}) };
  }
  return lectures;
}
