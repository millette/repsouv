// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Île Solid de la page « Explorer » (specs/002-explorateur-outils, second amendement du 2026-11-13). La page porte déjà
// la liste complète des outils en balisage statique, lisible sans JavaScript. L'île, montée dès le chargement
// (client:load), est aussi rendue au build, où elle ne produit que son formulaire, replié et masqué. Dans le
// navigateur, elle lit explorateur.json, puis trie, filtre et compare les outils sans recharger la page: ses résultats
// prennent alors la place de la liste statique. Tout l'état vit dans l'adresse. La logique est dans src/lib/ (etat,
// selection, tri, comparaison); l'île assemble.
import { createEffect, createMemo, createResource, createSignal, ErrorBoundary, onCleanup, onMount, Show, Suspense } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { chargerExplorateur } from "../lib/chargement.ts";
import { basculer } from "../lib/comparaison.ts";
import { ecrireEtat, type Etat, type EtatConnu, etatParDefaut, filtresActifs, lireEtat, MAX_COMPARES } from "../lib/etat.ts";
import type { DonneesExplorateur } from "../lib/explorateur.ts";
import { STATUTS } from "../lib/repertoire.ts";
import { retenu } from "../lib/selection.ts";
import { trier } from "../lib/tri.ts";
import Commandes from "./explorateur/Commandes.tsx";
import Comparaison from "./explorateur/Comparaison.tsx";
import Details from "./explorateur/Details.tsx";
import Resultats from "./explorateur/Resultats.tsx";

/** Ce que le formulaire offre, connu au build: tout le fichier de l'explorateur sauf les outils, plus leurs identifiants. */
export type Referentiels = Omit<DonneesExplorateur, "outils"> & { ids: string[] };

interface Props {
  /** Adresse de explorateur.json, sous le chemin de base du site. */
  adresseDonnees: string;
  /** Chemin de base du site, pour les liens vers les fiches. */
  base: string;
  /** Configuration du formulaire: de petites listes, pas les outils. */
  referentiels: Referentiels;
}

/** Façon d'inscrire un changement dans l'historique: une entrée par choix, mais une seule pour toute une frappe. */
export type Inscription = "pousser" | "remplacer";

/** Ce que les parties de l'explorateur reçoivent pour lire et changer l'état. */
export interface Tableau {
  /** Référentiels du formulaire, et les outils une fois lus (aucun avant). */
  donnees: DonneesExplorateur;
  etat: Etat;
  base: string;
  /** Applique un changement à l'état et l'inscrit dans l'adresse. */
  modifier: (changement: (etat: Etat) => Etat, inscription?: Inscription) => void;
  /** Ajoute ou retire un outil de la comparaison; un cinquième est refusé avec un message. */
  comparer: (id: string) => void;
}

export default function Explorateur(props: Props) {
  const connues: EtatConnu = {
    categories: props.referentiels.categories.map((c) => c.id),
    tags: props.referentiels.tags,
    statuts: STATUTS,
    pays: props.referentiels.pays.map((p) => p.code),
    sources: props.referentiels.sources.map((s) => s.id),
    criteres: props.referentiels.criteres.map((c) => c.id),
    outils: props.referentiels.ids,
  };

  // Au build comme au premier rendu dans le navigateur: l'état par défaut. L'adresse n'est lue qu'au montage.
  const [etat, setEtat] = createStore<Etat>(etatParDefaut());
  const [monte, setMonte] = createSignal(false);
  /** Le bloc « Trier et filtrer » est replié par défaut; il s'ouvre si l'adresse porte déjà un tri ou un filtre. */
  const [ouvert, setOuvert] = createSignal(false);
  /** Message annoncé quand un choix est refusé (cinquième outil à comparer). */
  const [avis, setAvis] = createSignal("");

  // Sans source avant le montage: aucune lecture n'est tentée au build, ni pendant l'hydratation.
  const [lues, { refetch }] = createResource(
    () => (monte() ? props.adresseDonnees : false),
    (adresse) => chargerExplorateur(adresse),
  );
  const pret = () => lues.state === "ready" || lues.state === "refreshing";
  const outils = () => (pret() ? (lues.latest?.outils ?? []) : []);

  const inscrire = (inscription: Inscription): void => {
    const parametres = ecrireEtat(etat, connues, location.search);
    const adresse = location.pathname + (parametres ? `?${parametres}` : "") + location.hash;
    if (adresse === location.pathname + location.search + location.hash) return;
    if (inscription === "pousser") history.pushState(null, "", adresse);
    else history.replaceState(null, "", adresse);
  };

  const modifier: Tableau["modifier"] = (changement, inscription = "pousser") => {
    setAvis("");
    setEtat(reconcile(changement({ ...etat, verdicts: { ...etat.verdicts } })));
    inscrire(inscription);
  };

  const comparer = (id: string): void => {
    const { liste, refuse } = basculer(etat.comparer, id);
    if (refuse) {
      setAvis(`La comparaison est limitée à ${MAX_COMPARES === 4 ? "quatre" : MAX_COMPARES} outils.`);
      return;
    }
    modifier((e) => ({ ...e, comparer: liste }));
  };

  const effacer = () => modifier((e) => ({ ...etatParDefaut(), tri: e.tri, sens: e.sens, vue: e.vue, comparer: e.comparer }));

  onMount(() => {
    const depuisAdresse = () => {
      setAvis("");
      setEtat(reconcile(lireEtat(location.search, connues)));
    };
    depuisAdresse();
    if (filtresActifs(etat) || etat.tri !== "categorie" || etat.sens !== "asc" || etat.vue !== "cartes") setOuvert(true);
    setMonte(true);
    // Bouton précédent ou suivant du navigateur: l'état redevient celui de l'adresse atteinte.
    addEventListener("popstate", depuisAdresse);
    onCleanup(() => removeEventListener("popstate", depuisAdresse));
  });

  // Les résultats de l'île prennent la place de la liste statique de la page; tant qu'ils ne sont pas là
  // (chargement, échec), la liste statique reste affichée.
  createEffect(() => {
    const liste = document.querySelector<HTMLElement>("[data-liste-statique]");
    if (liste) liste.hidden = pret();
  });

  const resultats = createMemo(() =>
    trier(
      outils().filter((o) => retenu(o, etat)),
      etat.tri,
      etat.sens,
      connues.categories,
    ),
  );

  const tableau: Tableau = {
    get donnees() {
      const { ids: _ids, ...referentiels } = props.referentiels;
      return { ...referentiels, outils: outils() };
    },
    etat,
    get base() {
      return props.base;
    },
    modifier,
    comparer,
  };

  return (
    <div class="explorateur">
      {/* Sans JavaScript, le formulaire ne pourrait rien faire: il reste masqué tant que les données ne sont pas prêtes. */}
      <details class="commandes-repli" data-commandes-repli hidden={!pret()} open={ouvert()} onToggle={(e) => setOuvert(e.currentTarget.open)}>
        <summary>Trier et filtrer</summary>
        <Commandes tableau={tableau} effacer={effacer} />
      </details>
      <ErrorBoundary
        fallback={(erreur: unknown, reinitialiser) => (
          <div class="alert alert-error etat-erreur" role="alert">
            <p>{erreur instanceof Error ? erreur.message : "Les outils n'ont pas pu être chargés."}</p>
            <p>
              <button
                class="btn btn-sm"
                type="button"
                onClick={() => {
                  void refetch();
                  reinitialiser();
                }}
              >
                Réessayer
              </button>{" "}
              La liste complète reste affichée ci-dessous ; le tri, les filtres et la comparaison attendent ces données.
            </p>
          </div>
        )}
      >
        <Suspense
          fallback={
            <p class="alert" role="status" data-chargement>
              Chargement des outils…
            </p>
          }
        >
          <Show when={lues()}>
            <Comparaison tableau={tableau} avis={avis()} />
            <Resultats tableau={tableau} resultats={resultats()} effacer={effacer} />
            <Details tableau={tableau} />
          </Show>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
