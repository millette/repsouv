// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Identifiants fixes des données, que les scripts écrivent et que le site relit: la source Praxis et les trois critères.

/** Identifiant de la source Praxis (le répertoire d'origine) dans sources.json. */
export const ID_PRAXIS = "praxis";
// Identifiants courts des trois critères (champ `id` de criteres.json).
export const DONNEES = "donnees";
export const CONTROLE = "controle";
export const DEPENDANCE = "dependance";
export type CritereId = typeof DONNEES | typeof CONTROLE | typeof DEPENDANCE;

// Le répertoire n'identifie les critères que par leur icône.
export const ID_PAR_ICONE: Readonly<Record<string, CritereId>> = {
  "📍": DONNEES,
  "🏢": CONTROLE,
  "🔗": DEPENDANCE,
};
