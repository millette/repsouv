// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Outils que les scripts ne tentent plus après des échecs consécutifs (enrichissement, recherche Open Hub). Les scripts
// s'en servent pour décider quoi traiter (packages/scripts/enrichir.ts, openhub.ts), les statistiques pour les compter.
import type { Outil, OutilClasse } from "./modele.ts";

/** Au-delà de ce nombre d'échecs consécutifs, un outil n'est plus tenté (option --max-echecs=N de update.ts). */
export const MAX_ECHECS_PAR_DEFAUT = 3;

/** true si l'outil a atteint le nombre maximal d'échecs consécutifs d'enrichissement et ne doit plus être tenté. */
export const abandonne = (o: Outil, maxEchecs: number = MAX_ECHECS_PAR_DEFAUT) => (o.echecs_enrichissement ?? 0) >= maxEchecs;

const SOURCES_LIBRES = new Set(["libre", "partiel", "source-disponible"]);

/** Un outil enrichi dont le code est public et qui n'a pas encore de données Open Hub. */
const sansOpenHub = (o: OutilClasse): boolean => !o.removed && o.source !== undefined && SOURCES_LIBRES.has(o.source) && o.openhub === undefined;

/** Un outil enrichi dont le code est public, sans données Open Hub, et pas abandonné. */
export const aCompleterOpenHub = (o: OutilClasse, maxEchecs: number = MAX_ECHECS_PAR_DEFAUT): boolean => sansOpenHub(o) && (o.echecs_openhub ?? 0) < maxEchecs;

/** Le même outil, quand la recherche Open Hub a échoué trop de fois: il n'est plus tenté. */
export const abandonneOpenHub = (o: OutilClasse, maxEchecs: number = MAX_ECHECS_PAR_DEFAUT): boolean => sansOpenHub(o) && (o.echecs_openhub ?? 0) >= maxEchecs;
