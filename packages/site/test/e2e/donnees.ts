// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les outils actifs des vraies données, pour les tests dans un navigateur.
import { readFileSync } from "node:fs";
import { identifiant } from "../../src/lib/adresses.ts";
import { depuisRacine } from "../../src/lib/chemins.ts";

interface OutilBrut {
  nom: string;
  categorie: string;
  tags?: string[];
  source?: string;
  removed?: true;
  enrichi_le?: string;
  source_repertoire_id: string;
}

export const actifs: OutilBrut[] = (JSON.parse(readFileSync(depuisRacine("donnees", "outils.json"), "utf8")).outils as OutilBrut[]).filter((o) => !o.removed);

export { identifiant };
