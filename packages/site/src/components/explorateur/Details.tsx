// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Boîte « Détails d'un outil » de l'explorateur (specs/002-explorateur-outils, amendement du 2026-11-13): un <dialog>
// natif, stylé par le composant « modal » de daisyUI, qui montre tous les détails d'un outil sans quitter la page.
// Son contenu est celui de la fiche de l'outil, lue telle quelle: la boîte et la fiche ne peuvent pas se contredire.
// L'outil ouvert fait partie de l'état porté par l'adresse (paramètre « fiche »).
import { createEffect, createResource, ErrorBoundary, Show, Suspense } from "solid-js";
import { adresseFiche } from "../../lib/adresses.ts";
import { chargerFiche, contenuFiche } from "../../lib/chargement.ts";
import type { Tableau } from "../Explorateur.tsx";

interface Props {
  tableau: Tableau;
}

export default function Details(props: Props) {
  let dialogue: HTMLDialogElement | undefined;
  const t = () => props.tableau;
  const id = () => t().etat.fiche;
  const outil = () => t().donnees.outils.find((o) => o.id === id());
  const adresse = () => adresseFiche(id(), t().base);

  // Boîte fermée: aucune lecture. Solid ne tient pour « pas de source » que false, null et undefined: une chaîne
  // vide lancerait la lecture d'une fiche sans identifiant.
  const [fiche] = createResource(() => id() || false, async (i) => contenuFiche(new DOMParser().parseFromString(await chargerFiche(adresseFiche(i, t().base)), "text/html")));

  // L'état commande la boîte: l'ouvrir en modale retient le focus et le rend à la commande d'origine à la fermeture.
  createEffect(() => {
    if (!dialogue) return;
    if (id() && !dialogue.open) dialogue.showModal();
    else if (!id() && dialogue.open) dialogue.close();
  });

  /** Fermeture par le navigateur (Échap, clic hors de la boîte, bouton): l'état et l'adresse suivent. */
  const surFermeture = () => {
    if (t().etat.fiche) t().modifier((e) => ({ ...e, fiche: "" }));
  };

  return (
    <dialog ref={dialogue} class="modal details" aria-labelledby="details-titre" data-details onClose={surFermeture}>
      <div class="modal-box details-boite">
        <div class="details-entete">
          <h2 id="details-titre">{outil()?.nom ?? "Détails"}</h2>
          <form method="dialog">
            <button class="btn btn-sm">Fermer</button>
          </form>
        </div>
        <Show when={id()}>
          <p>
            <a class="link" href={adresse()}>
              Ouvrir la fiche<span class="sr-seul"> de {outil()?.nom}</span>
            </a>
          </p>
          {/* Recréé à chaque outil: une erreur pour l'un ne reste pas affichée pour le suivant. */}
          <Show when={id()} keyed>
            {(_identifiant) => (
              <ErrorBoundary
                fallback={(erreur: unknown) => (
                  <p class="alert alert-error" role="alert">
                    {erreur instanceof Error ? erreur.message : "Les détails n'ont pas pu être chargés."} La fiche de l'outil se lit à l'adresse ci-dessus.
                  </p>
                )}
              >
                <Suspense
                  fallback={
                    <p class="alert" role="status" data-chargement-details>
                      Chargement des détails…
                    </p>
                  }
                >
                  <Show when={fiche()}>{(contenu) => <div class="details-contenu" data-details-contenu innerHTML={contenu().html} />}</Show>
                </Suspense>
              </ErrorBoundary>
            )}
          </Show>
        </Show>
      </div>
      {/* Motif de daisyUI: un clic hors de la boîte la ferme. Le bouton couvre l'arrière-plan et n'est pas un arrêt de tabulation. */}
      <form method="dialog" class="modal-backdrop">
        <button tabindex="-1" aria-label="Fermer les détails">
          Fermer
        </button>
      </form>
    </dialog>
  );
}
