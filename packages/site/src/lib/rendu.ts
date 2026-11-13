// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Rendu d'un graphique au build, dans Node, sans navigateur ni vl-convert: vega-lite compile la spécification,
// vega la dessine en SVG.
import { parse, View, type Spec } from "vega";
import { compile, type TopLevelSpec } from "vega-lite";

/** Spécification Vega compilée: ce que le navigateur charge, pour ne pas avoir à charger vega-lite. */
export function compilerVega(spec: TopLevelSpec): Spec {
  return compile(spec).spec;
}

export async function rendreSvg(spec: TopLevelSpec): Promise<string> {
  const vue = new View(parse(compilerVega(spec)), { renderer: "none" });
  try {
    return await vue.toSVG();
  } finally {
    vue.finalize();
  }
}
