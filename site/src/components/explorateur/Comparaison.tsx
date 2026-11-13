// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Comparaison côte à côte de deux à quatre outils, au-dessus des résultats: un outil par colonne, une information
// par ligne, chaque ligne avec sa provenance. Un outil comparé y reste même si les filtres ne le retiennent plus.
import { For, Show } from "solid-js";
import { adresseFiche } from "../../lib/adresses.ts";
import { comparable, lignesComparaison, MIN_COMPARES } from "../../lib/comparaison.ts";
import type { OutilExplorateur } from "../../lib/explorateur.ts";
import { LIBELLES_PROVENANCE } from "../../lib/provenance.ts";
import type { Tableau } from "../Explorateur.tsx";
import { Etoiles } from "./Resultats.tsx";

interface Props {
  tableau: Tableau;
  /** Message d'un choix refusé (cinquième outil), annoncé aux lecteurs d'écran. */
  avis: string;
}

export default function Comparaison(props: Props) {
  const t = () => props.tableau;
  const choisis = (): OutilExplorateur[] => t().etat.comparer.flatMap((id) => t().donnees.outils.filter((o) => o.id === id));
  const lignes = () => lignesComparaison(choisis(), t().donnees);

  return (
    <section class="comparaison" aria-label="Comparaison" data-comparaison>
      <p class="comparaison-avis" role="status" data-avis>
        {props.avis}
      </p>
      <Show when={choisis().length > 0 && choisis().length < MIN_COMPARES}>
        <p class="alert" data-un-seul>
          Choisir au moins deux outils pour les comparer. Outil choisi : {choisis()[0]?.nom}.
        </p>
      </Show>
      <Show when={comparable(t().etat.comparer)}>
        <div class="tableau-defilant" tabindex="0" role="region" aria-label="Tableau de comparaison">
          <table class="table tableau-comparaison">
            <caption>Comparaison de {choisis().length} outils</caption>
            <thead>
              <tr>
                <td></td>
                <For each={choisis()}>
                  {(o) => (
                    <th scope="col" data-compare={o.id}>
                      <a class="link" href={adresseFiche(o.id, t().base)}>
                        {o.nom}
                      </a>
                      <button class="btn btn-xs" type="button" onClick={() => t().comparer(o.id)}>
                        Retirer<span class="sr-seul"> {o.nom}</span>
                      </button>
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={lignes()}>
                {(ligne) => (
                  <tr data-ligne={ligne.id}>
                    <th scope="row">
                      {ligne.titre}
                      <Show when={ligne.provenance !== "source"}>
                        {" "}
                        <span class={`provenance provenance-${ligne.provenance}`}>{LIBELLES_PROVENANCE[ligne.provenance]}</span>
                      </Show>
                    </th>
                    <For each={ligne.cellules}>
                      {(cellule, i) => (
                        <td>
                          <Show when={ligne.id === "score"} fallback={cellule}>
                            <Etoiles score={choisis()[i()]!.score} estime={choisis()[i()]!.scoreEstime === true} />
                          </Show>
                        </td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
        <p>
          <button class="btn btn-sm" type="button" onClick={() => t().modifier((e) => ({ ...e, comparer: [] }))}>
            Vider la comparaison
          </button>
        </p>
      </Show>
    </section>
  );
}
