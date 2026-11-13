// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Données d'explorateur pour les tests unitaires: celles des fixtures, et un petit fabricant d'outils.
import { chargerDonnees } from "../src/lib/donnees.ts";
import { type EtatConnu, connuesDe, etatParDefaut, type Etat } from "../src/lib/etat.ts";
import { donneesExplorateur, type OutilExplorateur } from "../src/lib/explorateur.ts";

export const donnees = donneesExplorateur(chargerDonnees("test/fixtures/valide"));
export const connues: EtatConnu = connuesDe(donnees);

export function outil(champs: Partial<OutilExplorateur> & { nom: string }): OutilExplorateur {
  return { id: champs.nom.toLowerCase(), categorie: "bureautique", score: 2, statut: "libre", tags: [], source: "praxis", enrichi: true, remplace: [], deduits: [], description: "", ...champs };
}

export function etat(choix: Partial<Etat> = {}): Etat {
  return { ...etatParDefaut(), ...choix };
}
