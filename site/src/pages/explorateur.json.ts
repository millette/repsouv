// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Écrit au build le fichier de données de l'explorateur (explorateur.json), dérivé des cinq fichiers du dépôt.
import type { APIRoute } from "astro";
import { donneesExplorateur } from "../lib/explorateur.ts";
import { site } from "../lib/site.ts";

export const GET: APIRoute = () => new Response(JSON.stringify(donneesExplorateur(site())), { headers: { "Content-Type": "application/json; charset=utf-8" } });
