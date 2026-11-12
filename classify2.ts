// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Deuxième version de classify.ts, d'après l'évaluation enrichie de outils.json (evaluation_enrichie).
//
// Ce que la comparaison avec l'évaluation enrichie (57 outils) a montré:
//   - Le CHOIX des critères de classify.ts est déjà au plafond: pour les 39 outils où l'IA retient autant
//     de critères que d'étoiles, les deux ensembles sont identiques, et l'IA ne retient jamais un critère que
//     classify.ts a écarté. Les 18 autres écarts sont des outils où l'IA confirme MOINS de critères que
//     d'étoiles (la page n'en confirme pas assez): ce n'est pas une erreur de classement, et le `score` de
//     la source reste la référence. Cette version garde donc les mêmes `criteres`.
//   - Ce qui s'améliore, c'est `confiance`. classify.ts la tire de l'écart entre le dernier critère retenu et le
//     premier écarté, donc elle vaut toujours « élevée » à 3 étoiles (tous les critères sont retenus), alors que
//     l'IA n'en confirme que deux pour 5 des 8 outils à 3 étoiles. Ici, `confiance` tient aussi compte du nombre
//     de critères retenus qui n'ont aucun indice dans la description (indice sous le seuil de classify.ts):
//     0 sans indice = « élevée », 1 = « moyenne », 2 ou plus = « faible », et on garde le plus bas des deux
//     niveaux. Sur ces 57 outils, la part d'accord de l'IA sur le nombre de critères passe, pour « élevée »,
//     de 33/39 à 27/29 (l'AUC passe de 0,756 à 0,811; l'écart n'est pas significatif avec 57 outils).
//   - Limite: la description seule ne permet pas de repérer lesquels des critères « canadiens » l'IA ne
//     confirmera pas (descriptions indiscernables entre outils confirmés et non confirmés).
//
// Usage: nub classify2.ts <outils.json> [sortie.json]   (réécrit outils.json en place sans sortie)
import { SEUIL, classer, evidences, type Classement, type Confiance, type Critere } from "./classify.ts";
import { lancer } from "./cli.ts";
import type { Outil } from "./extract.ts";
import { ecrireFichier, lireFichier, lireSiExiste } from "./fichiers.ts";

const RANG: Record<Confiance, number> = { faible: 0, moyenne: 1, "élevée": 2, "indéterminée": 3 };

/** Le plus bas de la confiance de classify.ts (écart entre critères) et de celle des indices (critères retenus sans indice). */
export function confianceV2(v1: Confiance, retenusSansIndice: number): Confiance {
  if (v1 === "indéterminée") return v1;
  const parIndices: Confiance = retenusSansIndice === 0 ? "élevée" : retenusSansIndice === 1 ? "moyenne" : "faible";
  return RANG[v1] <= RANG[parIndices] ? v1 : parIndices;
}

/** Mêmes critères que `classer`; `confiance` recalibrée (voir l'en-tête). */
export function classer2(description: string, score?: number): Classement {
  const v1 = classer(description, score);
  const ev = evidences(description);
  const sansIndice = v1.criteres.filter((c: Critere) => ev[c] < SEUIL).length;
  return { criteres: v1.criteres, confiance: confianceV2(v1.confiance, sansIndice) };
}

if (import.meta.main) {
  await lancer(async () => {
    const args = process.argv.slice(2);
    // --force est accepté sans effet, comme dans classify.ts (nub run transmet les options à la dernière commande).
    const inconnue = args.find((a) => a.startsWith("--") && a !== "--force");
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    const [src, dst = src] = args.filter((a) => !a.startsWith("--"));
    if (!src || !dst) throw new Error("Usage: nub classify2.ts <outils.json> [sortie.json]");
    const lu = lireFichier<Outil>(src, "outils");
    const res = lu.donnees.map((o) => ({ ...o, ...classer2(o.description, o.score) }));
    ecrireFichier(dst, "outils", res, dst === src ? lu : lireSiExiste<Outil>(dst, "outils"));
    console.log(res.length, "outils classés (version 2)");
  });
}
