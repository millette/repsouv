// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Île Solid d'un graphique de la page « Statistiques » (specs/003-page-statistiques/contracts/graphiques.md). Montée
// quand le graphique devient visible, elle charge vega et la spécification déjà compilée au build, puis remplace l'image
// par une vue interactive: valeur exacte au survol et aux flèches, série mise en évidence par des boutons, thème suivi.
// Si quoi que ce soit échoue, elle ne rend rien et l'image produite au build reste affichée.
import { createEffect, createResource, createSignal, ErrorBoundary, For, on, onCleanup, onMount, Show, Suspense } from "solid-js";
import type { View } from "vega";
import { adresseGraphique } from "../lib/adresses.ts";
import { chargerJson } from "../lib/chargement.ts";
import type { ThemeGraphique } from "../lib/themes-graphiques.ts";

interface Props {
  id: string;
  titre: string;
  /** Texte de remplacement du graphique. */
  description: string;
  /** Noms des séries qu'on peut mettre en évidence; vide si le graphique n'en a pas. */
  series: string[];
  base: string;
}

/** Thème de la page: celui que l'interrupteur a posé, sinon celui que le système demande. */
function themeDeLaPage(): ThemeGraphique {
  const pose = document.documentElement.dataset.theme;
  if (pose === "dark") return "sombre";
  if (pose === "light") return "clair";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "sombre" : "clair";
}

export default function Graphique(props: Props) {
  const [theme, setTheme] = createSignal<ThemeGraphique | undefined>();
  const [courant, setCourant] = createSignal(-1);
  const [serie, setSerie] = createSignal<string | null>(null);
  const [infobulle, setInfobulle] = createSignal<{ texte: string; x: number; y: number } | null>(null);
  const [prete, setPrete] = createSignal(false);
  let racine: HTMLDivElement | undefined;
  let toile: HTMLDivElement | undefined;
  let vue: View | undefined;

  /** Texte de chaque ligne du tableau du graphique (« Catégorie : … ; Outils : 3 »), dans l'ordre des valeurs. */
  const lignes = (): string[] => {
    const table = racine?.closest("figure")?.querySelector("table");
    if (!table) return [];
    const entetes = [...table.querySelectorAll("thead th")].map((th) => (th.textContent ?? "").trim());
    return [...table.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td, i) => `${entetes[i]} : ${(td.textContent ?? "").trim()}`).join(" ; "));
  };

  const [spec] = createResource(theme, (t) => chargerJson<Record<string, unknown>>(adresseGraphique(props.base, props.id, t, "json")));

  onMount(() => {
    setTheme(themeDeLaPage());
    // Le thème change par l'interrupteur de l'en-tête (data-theme) ou par le système.
    const observateur = new MutationObserver(() => setTheme(themeDeLaPage()));
    observateur.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const systeme = matchMedia("(prefers-color-scheme: dark)");
    const surSysteme = () => setTheme(themeDeLaPage());
    systeme.addEventListener("change", surSysteme);
    onCleanup(() => {
      observateur.disconnect();
      systeme.removeEventListener("change", surSysteme);
      vue?.finalize();
    });
  });

  // Dessine la vue à chaque spécification chargée (au montage, puis à chaque changement de thème).
  createEffect(
    on(
      () => (spec.error ? undefined : spec()),
      (s) => {
        if (!s || !toile) return;
        void (async () => {
          const vega = await import("vega");
          const nouvelle = new vega.View(vega.parse(s as never), { renderer: "svg", container: toile, hover: true });
          nouvelle.tooltip((_gestionnaire, evenement, element, valeur) => {
            const i = (element as { datum?: { _i?: number } } | null)?.datum?._i;
            const texte = valeur != null && typeof i === "number" ? lignes()[i] : undefined;
            if (!texte || !racine) return void setInfobulle(null);
            const cadre = racine.getBoundingClientRect();
            const souris = evenement as MouseEvent;
            setInfobulle({ texte, x: souris.clientX - cadre.left + 12, y: souris.clientY - cadre.top + 12 });
          });
          nouvelle.signal("courant", courant()).signal("serie", serie());
          await nouvelle.runAsync();
          vue?.finalize();
          vue = nouvelle;
          // Le SVG de vega est une image: son texte de remplacement est celui du graphique.
          const svg = toile.querySelector("svg");
          svg?.setAttribute("role", "img");
          svg?.setAttribute("aria-label", props.description);
          racine?.closest(".graphique-zone")?.setAttribute("data-interactif", "");
          setPrete(true);
        })().catch((erreur: unknown) => {
          // La vue n'a pas pu être dessinée: l'image produite au build reste affichée, et la cause est journalisée.
          console.error(`Graphique « ${props.id} »: vue interactive non dessinée`, erreur);
        });
      },
    ),
  );

  createEffect(() => {
    const i = courant();
    const s = serie();
    if (prete()) void vue?.signal("courant", i).signal("serie", s).runAsync();
  });

  function surTouche(evenement: KeyboardEvent): void {
    const n = lignes().length;
    if (n === 0) return;
    const i = courant();
    const cible =
      evenement.key === "ArrowRight" || evenement.key === "ArrowDown" ? Math.min(n - 1, i + 1)
      : evenement.key === "ArrowLeft" || evenement.key === "ArrowUp" ? Math.max(0, i < 0 ? 0 : i - 1)
      : evenement.key === "Home" ? 0
      : evenement.key === "End" ? n - 1
      : evenement.key === "Escape" ? -1
      : undefined;
    if (cible === undefined) return;
    evenement.preventDefault();
    setCourant(cible);
  }

  return (
    <ErrorBoundary fallback={null}>
      <Suspense>
        {/* La racine n'est jamais masquée: Astro attend qu'elle entre dans la fenêtre pour monter l'île. */}
        <div ref={racine} class="graphique-interactif" data-vue-prete={prete() ? "" : undefined}>
          <div
            class="graphique-parcours"
            hidden={!prete()}
            tabindex="0"
            role="group"
            aria-label={`${props.titre}. Flèches pour parcourir les valeurs, Échap pour quitter.`}
            onKeyDown={surTouche}
            onBlur={() => setCourant(-1)}
          >
            <div ref={toile} class="graphique-vue" data-vue onMouseLeave={() => setInfobulle(null)} />
          </div>
          <Show when={infobulle()}>
            {(bulle) => (
              <p class="graphique-infobulle" data-infobulle style={{ left: `${bulle().x}px`, top: `${bulle().y}px` }}>
                {bulle().texte}
              </p>
            )}
          </Show>
          <p class="graphique-valeur" aria-live="polite" data-valeur hidden={!prete()}>
            {courant() >= 0 ? (lignes()[courant()] ?? "") : ""}
          </p>
          <Show when={prete() && props.series.length > 0}>
            <div class="graphique-series" role="group" aria-label="Mettre une série en évidence">
              <span class="graphique-series-titre">Mettre en évidence :</span>
              <For each={props.series}>
                {(nom) => (
                  <button class="btn btn-xs" type="button" aria-pressed={serie() === nom} onClick={() => setSerie(serie() === nom ? null : nom)}>
                    {nom}
                  </button>
                )}
              </For>
            </div>
          </Show>
          {/* Lit la ressource dans la zone d'attente: tant qu'elle charge, ou si elle échoue, l'image reste. */}
          <Show when={spec()}>{null}</Show>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
