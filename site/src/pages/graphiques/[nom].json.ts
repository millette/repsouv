// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Écrit au build la spécification Vega compilée de chaque graphique, dans chaque thème (<id>-<thème>.json), préparée
// pour le survol, le clavier et la mise en évidence: l'île la charge quand le graphique devient visible.
import type { APIRoute, GetStaticPaths } from "astro";
import { rendus } from "../../lib/site.ts";

export const getStaticPaths: GetStaticPaths = async () => (await rendus()).map((r) => ({ params: { nom: `${r.id}-${r.theme}` }, props: { vega: r.vega } }));

export const GET: APIRoute = ({ props }) => new Response(JSON.stringify(props.vega), { headers: { "Content-Type": "application/json; charset=utf-8" } });
