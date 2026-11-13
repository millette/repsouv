// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Commandes de l'explorateur: recherche, tri, vue et filtres. Des contrôles de formulaire natifs, stylés par daisyUI;
// chaque nom de champ est celui de son paramètre d'adresse (specs/002-explorateur-outils/contracts/adresse.md).
import { For, type JSX, Show } from "solid-js";
import { LIBELLES_VERDICT } from "../../lib/comparaison.ts";
import type { StatutVerdict } from "../../lib/criteres.ts";
import { type Enrichi, type Etat, filtresActifs, type Multiple, type Sens, type Tri, VERDICTS, type Vue } from "../../lib/etat.ts";
import { LIBELLES_STATUT } from "../../lib/libelles.ts";
import { LIBELLES_PROVENANCE } from "../../lib/provenance.ts";
import { STATUTS, type Statut } from "../../lib/repertoire.ts";
import type { Tableau } from "../Explorateur.tsx";

interface Props {
  tableau: Tableau;
  effacer: () => void;
}

interface Valeur {
  id: string;
  libelle: string;
}

export const LIBELLES_TRI: Record<Tri, string> = { categorie: "Catégorie", nom: "Nom", score: "Score" };
export const LIBELLES_SENS: Record<Sens, string> = { asc: "Croissant", desc: "Décroissant" };
const LIBELLES_SCORE = ["Tous les scores", "1 étoile ou plus", "2 étoiles ou plus", "3 étoiles"];

export default function Commandes(props: Props) {
  const t = () => props.tableau;
  const etat = () => t().etat;

  const basculer = (champ: Multiple, id: string, coche: boolean) => t().modifier((e) => ({ ...e, [champ]: coche ? [...e[champ], id] : e[champ].filter((v) => v !== id) }));

  /** Groupe repliable de cases à cocher; le nombre de choix actifs est écrit dans son titre. */
  const Groupe = (g: { champ: Multiple; nom: string; legende: string; valeurs: Valeur[]; ia?: boolean; ouvert?: boolean }) => (
    <details class="filtre-groupe" data-groupe={g.nom} open={g.ouvert || etat()[g.champ].length > 0}>
      <summary>
        {g.legende}
        <Show when={etat()[g.champ].length > 0}>
          <span class="badge badge-neutral"> {etat()[g.champ].length}</span>
        </Show>
      </summary>
      <fieldset class="filtre-valeurs">
        <legend class="sr-seul">{g.legende}</legend>
        <Show when={g.ia}>
          <p class="filtre-note">
            <span class="provenance provenance-ia">{LIBELLES_PROVENANCE.ia}</span>
          </p>
        </Show>
        <For each={g.valeurs}>
          {(valeur) => (
            <label class="filtre-valeur">
              <input class="checkbox checkbox-sm" type="checkbox" name={g.nom} value={valeur.id} checked={etat()[g.champ].includes(valeur.id)} onChange={(e) => basculer(g.champ, valeur.id, e.currentTarget.checked)} />
              <span>{valeur.libelle}</span>
            </label>
          )}
        </For>
      </fieldset>
    </details>
  );

  /** Groupe repliable d'un choix unique (boutons radio). */
  const Choix = (c: { nom: string; legende: string; valeurs: Valeur[]; courant: string; choisir: (id: string) => void; actif: boolean; enfants?: JSX.Element }) => (
    <details class="filtre-groupe" data-groupe={c.nom} open={c.actif}>
      <summary>
        {c.legende}
        <Show when={c.actif}>
          <span class="badge badge-neutral"> 1</span>
        </Show>
      </summary>
      <fieldset class="filtre-valeurs">
        <legend class="sr-seul">{c.legende}</legend>
        <For each={c.valeurs}>
          {(valeur) => (
            <label class="filtre-valeur">
              <input class="radio radio-sm" type="radio" name={c.nom} value={valeur.id} checked={c.courant === valeur.id} onChange={() => c.choisir(valeur.id)} />
              <span>{valeur.libelle}</span>
            </label>
          )}
        </For>
      </fieldset>
    </details>
  );

  const nbVerdicts = () => Object.keys(etat().verdicts).length;

  return (
    <form class="commandes" data-commandes role="search" aria-label="Trier et filtrer les outils" onSubmit={(e) => e.preventDefault()}>
      <div class="commandes-ligne">
        <div class="commande">
          <label for="explorer-q">Chercher un outil par son nom</label>
          <input id="explorer-q" class="input" type="search" name="q" autocomplete="off" value={etat().q} onInput={(e) => t().modifier((s) => ({ ...s, q: e.currentTarget.value }), "remplacer")} />
        </div>
        <div class="commande">
          <label for="explorer-tri">Trier par</label>
          <select id="explorer-tri" class="select" name="tri" onChange={(e) => t().modifier((s) => ({ ...s, tri: e.currentTarget.value as Tri }))}>
            <For each={Object.entries(LIBELLES_TRI)}>{([id, libelle]) => <option value={id} selected={etat().tri === id}>{libelle}</option>}</For>
          </select>
        </div>
        <div class="commande">
          <label for="explorer-sens">Ordre</label>
          <select id="explorer-sens" class="select" name="sens" onChange={(e) => t().modifier((s) => ({ ...s, sens: e.currentTarget.value as Sens }))}>
            <For each={Object.entries(LIBELLES_SENS)}>{([id, libelle]) => <option value={id} selected={etat().sens === id}>{libelle}</option>}</For>
          </select>
        </div>
        <fieldset class="commande commande-vue">
          <legend>Affichage</legend>
          <For each={[["cartes", "Cartes"], ["tableau", "Tableau"]] as [Vue, string][]}>
            {([id, libelle]) => (
              <label class="filtre-valeur">
                <input class="radio radio-sm" type="radio" name="vue" value={id} checked={etat().vue === id} onChange={() => t().modifier((s) => ({ ...s, vue: id }))} />
                <span>{libelle}</span>
              </label>
            )}
          </For>
        </fieldset>
      </div>

      <Groupe champ="statuts" nom="statut" legende="Statut du code source" ia ouvert valeurs={STATUTS.map((s: Statut) => ({ id: s, libelle: LIBELLES_STATUT[s] }))} />
      <Groupe champ="categories" nom="categorie" legende="Catégorie" valeurs={t().donnees.categories.map((c) => ({ id: c.id, libelle: c.nom }))} />
      <Groupe champ="tags" nom="tag" legende="Tag" ia valeurs={t().donnees.tags.map((id) => ({ id, libelle: id }))} />
      <Choix
        nom="score"
        legende="Score minimal"
        actif={etat().scoreMin > 0}
        courant={String(etat().scoreMin)}
        choisir={(id) => t().modifier((s) => ({ ...s, scoreMin: Number(id) }))}
        valeurs={LIBELLES_SCORE.map((libelle, i) => ({ id: String(i), libelle }))}
      />
      <details class="filtre-groupe" data-groupe="verdicts" open={nbVerdicts() > 0}>
        <summary>
          Critères vérifiés
          <Show when={nbVerdicts() > 0}>
            <span class="badge badge-neutral"> {nbVerdicts()}</span>
          </Show>
        </summary>
        <fieldset class="filtre-valeurs filtre-verdicts">
          <legend class="sr-seul">Critères vérifiés</legend>
          <p class="filtre-note">
            <span class="provenance provenance-ia">{LIBELLES_PROVENANCE.ia}</span> Verdict d'un modèle d'IA d'après la page de l'outil ; un outil non vérifié n'est retenu par aucun verdict.
          </p>
          <For each={t().donnees.criteres}>
            {(critere) => (
              <div class="commande">
                <label for={`explorer-verdict-${critere.id}`}>
                  <span aria-hidden="true">{critere.icon}</span> {critere.titre}
                </label>
                <select
                  id={`explorer-verdict-${critere.id}`}
                  class="select select-sm"
                  name={critere.id}
                  onChange={(e) => {
                    const verdict = e.currentTarget.value;
                    t().modifier((s) => {
                      const { [critere.id]: _retire, ...autres } = s.verdicts;
                      return { ...s, verdicts: verdict ? { ...autres, [critere.id]: verdict as StatutVerdict } : autres };
                    });
                  }}
                >
                  <option value="" selected={!etat().verdicts[critere.id]}>
                    Tous
                  </option>
                  <For each={VERDICTS}>{(v) => <option value={v} selected={etat().verdicts[critere.id] === v}>{LIBELLES_VERDICT[v]}</option>}</For>
                </select>
              </div>
            )}
          </For>
        </fieldset>
      </details>
      <Groupe champ="pays" nom="pays" legende="Pays de l'éditeur" valeurs={t().donnees.pays.map((p) => ({ id: p.code, libelle: p.nom }))} />
      <Groupe champ="sources" nom="source" legende="Source du répertoire" valeurs={t().donnees.sources.map((s) => ({ id: s.id, libelle: s.nom }))} />
      <Choix
        nom="enrichi"
        legende="Enrichissement"
        actif={etat().enrichi !== ""}
        courant={etat().enrichi}
        choisir={(id) => t().modifier((s) => ({ ...s, enrichi: id as Enrichi }))}
        valeurs={[
          { id: "", libelle: "Tous les outils" },
          { id: "oui", libelle: "Outils enrichis" },
          { id: "non", libelle: "Outils non enrichis" },
        ]}
      />
      <Show when={filtresActifs(etat() as Etat)}>
        <p>
          <button class="btn btn-sm" type="button" onClick={() => props.effacer()}>
            Effacer les choix
          </button>
        </p>
      </Show>
    </form>
  );
}
