// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Écrit au build l'image de chaque graphique de la page « Statistiques », dans chaque thème (<id>-<thème>.svg),
// rendue par vega dans Node: ni vl-convert, ni appel réseau.
import type { APIRoute, GetStaticPaths } from "astro";
import { rendus } from "../../lib/site.ts";

export const getStaticPaths: GetStaticPaths = async () => (await rendus()).map((r) => ({ params: { nom: `${r.id}-${r.theme}` }, props: { svg: r.svg } }));

export const GET: APIRoute = ({ props }) => new Response(props.svg as string, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
