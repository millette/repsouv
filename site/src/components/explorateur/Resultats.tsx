// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Résultats de l'explorateur: le nombre d'outils et le tri en cours, annoncés à chaque changement, puis les mêmes
// outils en cartes ou en tableau. Chaque carte et chaque ligne mènent à la fiche et permettent de choisir l'outil à comparer.
import { For, Show } from "solid-js";
import { adresseFiche } from "../../lib/adresses.ts";
import type { OutilExplorateur } from "../../lib/explorateur.ts";
import { LIBELLES_STATUT, texteEtoiles } from "../../lib/libelles.ts";
import { LIBELLES_PROVENANCE } from "../../lib/provenance.ts";
import type { Tableau } from "../Explorateur.tsx";
import { LIBELLES_SENS, LIBELLES_TRI } from "./Commandes.tsx";

interface Props {
  tableau: Tableau;
  resultats: OutilExplorateur[];
  effacer: () => void;
}

/** Score sur 3: étoiles masquées aux lecteurs d'écran, équivalent textuel, et mention d'un score estimé. */
export function Etoiles(props: { score: number; estime: boolean }) {
  const pleines = () => Math.max(0, Math.min(3, props.score));
  return (
    <span class="score">
      <span class="etoiles" aria-hidden="true">
        {"★".repeat(pleines())}
        {"☆".repeat(3 - pleines())}
      </span>
      <span class="sr-seul">{texteEtoiles(props.score)}</span>
      <Show when={props.estime}>
        <span class="score-estime">score estimé</span>
      </Show>
    </span>
  );
}

export default function Resultats(props: Props) {
  const t = () => props.tableau;
  const total = () => t().donnees.outils.length;
  const n = () => props.resultats.length;
  const categories = () => new Map(t().donnees.categories.map((c) => [c.id, c.nom]));
  const pays = () => new Map(t().donnees.pays.map((p) => [p.code, p.nom]));
  const sources = () => new Map(t().donnees.sources.map((s) => [s.id, s.nom]));
  const compare = (id: string) => t().etat.comparer.includes(id);
  const ariaTri = (colonne: string) => (t().etat.tri === colonne ? (t().etat.sens === "asc" ? "ascending" : "descending") : undefined);

  const Comparer = (c: { outil: OutilExplorateur }) => (
    <label class="filtre-valeur comparer">
      <input class="checkbox checkbox-sm" type="checkbox" name="comparer" value={c.outil.id} checked={compare(c.outil.id)}
        onChange={(e) => {
          t().comparer(c.outil.id);
          // Un cinquième outil est refusé: la case, que le navigateur vient de cocher, revient à l'état réel.
          e.currentTarget.checked = compare(c.outil.id);
        }}
      />
      <span>
        Comparer<span class="sr-seul"> {c.outil.nom}</span>
      </span>
    </label>
  );

  /** Ouvre la boîte « Détails » de l'outil, sans quitter la page. */
  const Details = (c: { outil: OutilExplorateur }) => (
    <button class="btn btn-xs" type="button" data-details-de={c.outil.id} onClick={() => t().modifier((e) => ({ ...e, fiche: c.outil.id }))}>
      Détails<span class="sr-seul"> de {c.outil.nom}</span>
    </button>
  );

  return (
    <section class="resultats" aria-label="Résultats">
      <p class="compteur" data-compteur aria-live="polite">
        {n() > 1 ? `${n()} outils affichés` : `${n()} outil affiché`} sur {total()}
        <span class="tri-en-cours" data-tri>
          {" "}
          · Tri : {LIBELLES_TRI[t().etat.tri].toLowerCase()}, ordre {LIBELLES_SENS[t().etat.sens].toLowerCase()}
        </span>
      </p>
      <Show
        when={n() > 0}
        fallback={
          <div class="alert" role="status">
            <p>Aucun outil ne correspond à ces choix.</p>
            <p>
              <button class="btn btn-sm" type="button" onClick={() => props.effacer()}>
                Effacer les choix
              </button>
            </p>
          </div>
        }
      >
        <Show
          when={t().etat.vue === "tableau"}
          fallback={
            <ul class="cartes" data-vue="cartes">
              <For each={props.resultats}>
                {(o) => (
                  <li class="carte-outil card card-border" data-outil={o.id}>
                    <div class="card-body">
                      <h2 class="card-title">
                        <a class="link link-hover" href={adresseFiche(o.id, t().base)}>
                          {o.nom}
                        </a>
                      </h2>
                      <p class="carte-meta">
                        <Etoiles score={o.score} estime={o.scoreEstime === true} />
                        <Show when={o.statut !== "non-enrichi"}>
                          <span class="statut">
                            <span class="badge badge-outline">{LIBELLES_STATUT[o.statut]}</span> <span class="provenance provenance-ia">{LIBELLES_PROVENANCE.ia}</span>
                          </span>
                        </Show>
                      </p>
                      <p class="carte-description">{o.description}</p>
                      <p class="carte-actions">
                        <Comparer outil={o} />
                        <Details outil={o} />
                      </p>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          }
        >
          <div class="tableau-defilant" tabindex="0" role="region" aria-label="Tableau des outils">
            <table class="table tableau-outils" data-vue="tableau">
              <caption>
                Outils du répertoire, {n() > 1 ? `${n()} lignes` : "1 ligne"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Comparer</th>
                  <th scope="col" aria-sort={ariaTri("nom")}>
                    Nom
                  </th>
                  <th scope="col" aria-sort={ariaTri("categorie")}>
                    Catégorie
                  </th>
                  <th scope="col" aria-sort={ariaTri("score")}>
                    Score
                  </th>
                  <th scope="col">
                    Statut du code source <span class="provenance provenance-ia">{LIBELLES_PROVENANCE.ia}</span>
                  </th>
                  <th scope="col">Pays</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.resultats}>
                  {(o) => (
                    <tr data-outil={o.id}>
                      <td>
                        <Comparer outil={o} />
                        <Details outil={o} />
                      </td>
                      <th scope="row">
                        <a class="link" href={adresseFiche(o.id, t().base)}>
                          {o.nom}
                        </a>
                      </th>
                      <td>{categories().get(o.categorie) ?? o.categorie}</td>
                      <td>
                        <Etoiles score={o.score} estime={o.scoreEstime === true} />
                      </td>
                      <td>{LIBELLES_STATUT[o.statut]}</td>
                      <td>{o.pays ? (pays().get(o.pays) ?? o.pays) : "Non connu"}</td>
                      <td>{sources().get(o.source) ?? o.source}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </Show>
    </section>
  );
}
