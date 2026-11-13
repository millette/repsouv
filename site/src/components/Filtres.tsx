// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Île Solid, seule partie interactive du site (contracts/filtres.md): filtres à choix multiple, recherche par nom,
// compteur et état dans l'adresse. Les cartes des outils restent du balisage statique de index.astro: l'île ne reçoit
// que de la configuration et applique la sélection par les attributs data-* des cartes. Elle est aussi rendue au build,
// formulaire masqué, pour que rien ne s'affiche comme utilisable sans JavaScript (FR-027).
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { ecrireEtat, estVide, type Etat, etatVide, lireEtat, retenu, type ValeursConnues } from "../lib/filtres.ts";

interface Valeur {
  id: string;
  libelle: string;
}

interface Props {
  categories: Valeur[];
  tags: Valeur[];
  statuts: Valeur[];
  /** Nombre d'outils de la liste complète. */
  total: number;
}

type Type = "categories" | "tags" | "statuts";

/** Nom du paramètre d'adresse et du champ de formulaire de chaque type. */
const NOMS: Record<Type, string> = { categories: "categorie", tags: "tag", statuts: "statut" };

function pluriel(n: number): string {
  return n > 1 ? `${n} outils affichés` : `${n} outil affiché`;
}

export default function Filtres(props: Props) {
  // Faux au build et avant l'hydratation: le formulaire reste masqué tant que les filtres ne peuvent pas fonctionner.
  const [pret, setPret] = createSignal(false);
  const [etat, setEtat] = createStore<Etat>(etatVide());
  const [affiches, setAffiches] = createSignal(props.total);
  let formulaire: HTMLFormElement | undefined;

  const connues = (): ValeursConnues => ({
    categories: props.categories.map((v) => v.id),
    tags: props.tags.map((v) => v.id),
    statuts: props.statuts.map((v) => v.id),
  });
  /** Paramètres d'adresse de l'état courant: sert aussi à suivre tout changement de l'état. */
  const parametres = createMemo(() => ecrireEtat(etat, connues(), pret() ? location.search : ""));
  const actif = () => !estVide(etat);

  /** Applique la sélection aux cartes statiques et masque les catégories qui n'ont plus d'outil affiché. */
  function appliquer(): void {
    let n = 0;
    for (const carte of document.querySelectorAll<HTMLElement>("[data-outil]")) {
      const garde = retenu(
        {
          categorie: carte.dataset.categorie ?? "",
          tags: (carte.dataset.tags ?? "").split(" ").filter(Boolean),
          statut: carte.dataset.statut ?? "",
          nom: carte.dataset.nom ?? "",
        },
        etat,
      );
      carte.hidden = !garde;
      if (garde) n++;
    }
    for (const section of document.querySelectorAll<HTMLElement>("section[data-categorie]")) {
      section.hidden = section.querySelector("[data-outil]:not([hidden])") === null;
    }
    setAffiches(n);
  }

  /** Inscrit l'état dans l'adresse: une entrée d'historique par choix, mais une seule pour toute la frappe. */
  function inscrire(mode: "pousser" | "remplacer"): void {
    const p = parametres();
    const adresse = location.pathname + (p ? `?${p}` : "") + location.hash;
    if (adresse === location.pathname + location.search + location.hash) return;
    if (mode === "pousser") history.pushState(null, "", adresse);
    else history.replaceState(null, "", adresse);
  }

  function basculer(type: Type, id: string, coche: boolean): void {
    setEtat(type, coche ? [...etat[type], id] : etat[type].filter((v) => v !== id));
    inscrire("pousser");
  }

  function chercher(texte: string): void {
    setEtat("q", texte);
    inscrire("remplacer");
  }

  function effacer(): void {
    setEtat(reconcile(etatVide()));
    inscrire("pousser");
    formulaire?.querySelector<HTMLInputElement>("input[type=search]")?.focus();
  }

  onMount(() => {
    const depuisAdresse = () => setEtat(reconcile(lireEtat(location.search, connues())));
    depuisAdresse();
    setPret(true);
    // Bouton précédent ou suivant du navigateur: l'état redevient celui de l'adresse atteinte.
    addEventListener("popstate", depuisAdresse);
    onCleanup(() => removeEventListener("popstate", depuisAdresse));
  });

  createEffect(() => {
    parametres();
    if (pret()) appliquer();
  });

  const Groupe = (g: { type: Type; legende: string; valeurs: Valeur[]; ouvert?: boolean }) => (
    <details class="filtre-groupe" data-groupe={NOMS[g.type]} open={g.ouvert}>
      <summary>
        {g.legende}
        <Show when={etat[g.type].length > 0}>
          <span class="badge badge-neutral"> {etat[g.type].length}</span>
        </Show>
      </summary>
      <fieldset class="filtre-valeurs">
        <legend class="sr-seul">{g.legende}</legend>
        <For each={g.valeurs}>
          {(valeur) => (
            <label class="filtre-valeur">
              <input
                class="checkbox checkbox-sm"
                type="checkbox"
                name={NOMS[g.type]}
                value={valeur.id}
                checked={etat[g.type].includes(valeur.id)}
                onChange={(e) => basculer(g.type, valeur.id, e.currentTarget.checked)}
              />
              <span>{valeur.libelle}</span>
            </label>
          )}
        </For>
      </fieldset>
    </details>
  );

  return (
    <div class="filtres">
      <form ref={formulaire} data-filtres hidden={!pret()} role="search" aria-label="Filtrer les outils" onSubmit={(e) => e.preventDefault()}>
        <div class="filtre-recherche">
          <label for="recherche-nom">Chercher un outil par son nom</label>
          <input id="recherche-nom" class="input" type="search" name="q" autocomplete="off" value={etat.q} onInput={(e) => chercher(e.currentTarget.value)} />
        </div>
        <Groupe type="statuts" legende="Statut du code source" valeurs={props.statuts} ouvert />
        <Groupe type="categories" legende="Catégorie" valeurs={props.categories} />
        <Groupe type="tags" legende="Tag" valeurs={props.tags} />
        <Show when={actif()}>
          <p>
            <button class="btn btn-sm" type="button" onClick={effacer}>
              Effacer les filtres
            </button>
          </p>
        </Show>
      </form>
      <p class="compteur" data-compteur aria-live="polite">
        {pluriel(affiches())} sur {props.total}
      </p>
      <Show when={affiches() === 0}>
        <p class="alert" role="status">
          Aucun outil ne correspond à ces choix.
        </p>
      </Show>
    </div>
  );
}
