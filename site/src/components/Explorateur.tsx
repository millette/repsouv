// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Île Solid de la page « Explorer » (specs/002-explorateur-outils/contracts/pages.md): elle lit explorateur.json, puis
// trie, filtre et compare les outils sans recharger la page. Tout l'état vit dans l'adresse. La logique est dans
// src/lib/ (etat, selection, tri, comparaison); l'île assemble. Elle n'affiche jamais une zone vide: chargement,
// erreur et liste vide ont chacun leur message.
import { createMemo, createResource, createSignal, ErrorBoundary, onCleanup, onMount, Show, Suspense } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { adresseOutils } from "../lib/adresses.ts";
import { chargerExplorateur } from "../lib/chargement.ts";
import { basculer } from "../lib/comparaison.ts";
import { connuesDe, ecrireEtat, type Etat, etatParDefaut, lireEtat, MAX_COMPARES } from "../lib/etat.ts";
import type { DonneesExplorateur } from "../lib/explorateur.ts";
import { retenu } from "../lib/selection.ts";
import { trier } from "../lib/tri.ts";
import Commandes from "./explorateur/Commandes.tsx";
import Comparaison from "./explorateur/Comparaison.tsx";
import Resultats from "./explorateur/Resultats.tsx";

interface Props {
  /** Adresse de explorateur.json, sous le chemin de base du site. */
  adresseDonnees: string;
  /** Chemin de base du site, pour les liens vers les fiches et la page « Outils ». */
  base: string;
}

/** Façon d'inscrire un changement dans l'historique: une entrée par choix, mais une seule pour toute une frappe. */
export type Inscription = "pousser" | "remplacer";

/** Ce que les parties de l'explorateur reçoivent pour lire et changer l'état. */
export interface Tableau {
  donnees: DonneesExplorateur;
  etat: Etat;
  base: string;
  /** Applique un changement à l'état et l'inscrit dans l'adresse. */
  modifier: (changement: (etat: Etat) => Etat, inscription?: Inscription) => void;
  /** Ajoute ou retire un outil de la comparaison; un cinquième est refusé avec un message. */
  comparer: (id: string) => void;
}

function Explore(props: { donnees: DonneesExplorateur; base: string }) {
  const connues = connuesDe(props.donnees);
  const [etat, setEtat] = createStore<Etat>(lireEtat(location.search, connues));
  /** Message annoncé quand un choix est refusé (cinquième outil à comparer). */
  const [avis, setAvis] = createSignal("");

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

  onMount(() => {
    // Bouton précédent ou suivant du navigateur: l'état redevient celui de l'adresse atteinte.
    const depuisAdresse = () => {
      setAvis("");
      setEtat(reconcile(lireEtat(location.search, connues)));
    };
    addEventListener("popstate", depuisAdresse);
    onCleanup(() => removeEventListener("popstate", depuisAdresse));
  });

  const resultats = createMemo(() =>
    trier(
      props.donnees.outils.filter((o) => retenu(o, etat)),
      etat.tri,
      etat.sens,
      connues.categories,
    ),
  );
  const tableau: Tableau = {
    get donnees() {
      return props.donnees;
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
      <Commandes tableau={tableau} effacer={() => modifier((e) => ({ ...etatParDefaut(), tri: e.tri, sens: e.sens, vue: e.vue, comparer: e.comparer }))} />
      <Comparaison tableau={tableau} avis={avis()} />
      <Resultats tableau={tableau} resultats={resultats()} effacer={() => modifier((e) => ({ ...etatParDefaut(), tri: e.tri, sens: e.sens, vue: e.vue, comparer: e.comparer }))} />
    </div>
  );
}

export default function Explorateur(props: Props) {
  const [donnees, { refetch }] = createResource(
    () => props.adresseDonnees,
    (adresse) => chargerExplorateur(adresse),
  );

  return (
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
            La liste complète se lit aussi sur la page{" "}
            <a class="link" href={adresseOutils(props.base)}>
              Outils
            </a>
            .
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
        <Show when={donnees()}>{(d) => <Explore donnees={d()} base={props.base} />}</Show>
      </Suspense>
    </ErrorBoundary>
  );
}
