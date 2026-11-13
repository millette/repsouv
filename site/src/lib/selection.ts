// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Règle de sélection de l'explorateur (specs/002-explorateur-outils/data-model.md): à l'intérieur d'un filtre à choix
// multiple, un outil est retenu s'il répond à une des valeurs; entre les filtres, il doit répondre à tous.
import type { Etat } from "./etat.ts";
import type { OutilExplorateur } from "./explorateur.ts";
import { normaliser } from "./filtres.ts";

const parmi = (choisies: readonly string[], valeur: string | undefined): boolean => choisies.length === 0 || (valeur !== undefined && choisies.includes(valeur));

export function retenu(outil: OutilExplorateur, etat: Etat): boolean {
  if (!parmi(etat.categories, outil.categorie)) return false;
  if (etat.tags.length > 0 && !etat.tags.some((t) => outil.tags.includes(t))) return false;
  if (!parmi(etat.statuts, outil.statut)) return false;
  // Un outil dont la source ne dit pas le pays n'est retenu par aucun choix de pays.
  if (!parmi(etat.pays, outil.pays)) return false;
  if (!parmi(etat.sources, outil.source)) return false;
  if (outil.score < etat.scoreMin) return false;
  // Un verdict demandé exige que l'outil ait été vérifié: l'absence de vérification n'est pas un verdict « indéterminé ».
  for (const [critere, verdict] of Object.entries(etat.verdicts)) if (outil.verdicts?.[critere] !== verdict) return false;
  if (etat.enrichi === "oui" && !outil.enrichi) return false;
  if (etat.enrichi === "non" && outil.enrichi) return false;
  const q = normaliser(etat.q);
  return q === "" || normaliser(outil.nom).includes(q);
}
