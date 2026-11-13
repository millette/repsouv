// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>

/** Identifiant de la source Praxis dans sources.json (voir sources.ts); ici pour qu'extract.ts n'importe pas sources.ts. */
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
