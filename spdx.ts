// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Validation des identifiants de licence SPDX (https://spdx.org/licenses/).
import { createRequire } from "node:module";
import parse from "spdx-expression-parse";

const exiger = createRequire(import.meta.url);
const DEPRECIES = new Set<string>(exiger("spdx-license-ids/deprecated.json"));

/**
 * Vérifie qu'un texte est une expression de licence SPDX valide, avec des identifiants exacts
 * (casse comprise), par exemple `MIT`, `AGPL-3.0-or-later` ou `MIT OR Apache-2.0`.
 * Sont refusés: les noms en toutes lettres, les identifiants dépréciés ou ambigus (`GPL-3.0`,
 * `GPL-2.0+`: écrire `-only` ou `-or-later`) et les `LicenseRef-` maison, qui ne sont pas
 * dans la liste SPDX (une licence maison se décrit dans custom_license, voir enrichir.ts). Retourne le problème, ou null si la licence est valide.
 */
export function problemeLicenceSpdx(texte: string): string | null {
  let arbre: parse.Info;
  try {
    arbre = parse(texte);
  } catch {
    return `« ${texte} » n'est pas une expression de licence SPDX valide (identifiants exacts attendus, ex. AGPL-3.0-or-later, MIT)`;
  }
  const problemes: string[] = [];
  const visiter = (n: parse.Info): void => {
    if ("conjunction" in n) {
      visiter(n.left);
      visiter(n.right);
    } else if (n.license.startsWith("LicenseRef-") || n.license.startsWith("DocumentRef-")) {
      problemes.push(`« ${n.license} » est une licence maison, absente de la liste SPDX (mettre licence à null et décrire la licence dans custom_license)`);
    } else if (n.plus) {
      problemes.push(`« ${n.license}+ » est une forme dépréciée (écrire ${n.license.replace(/-(only|or-later)$/, "")}-or-later)`);
    } else if (DEPRECIES.has(n.license)) {
      problemes.push(`« ${n.license} » est un identifiant déprécié et ambigu (écrire -only ou -or-later)`);
    }
  };
  visiter(arbre);
  return problemes.length ? problemes.join("; ") : null;
}
