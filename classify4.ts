// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Quatrième version de classify.ts: les critères de classify.ts, moins ceux que les données d'enrichissement et les
// confirmations d'IA (confirmer.ts) contredisent. Résultat: un ensemble de critères qui peut compter MOINS d'éléments que
// d'étoiles, plus proche de evaluation_enrichie.criteres (47 outils sur 57 identiques, contre 39 pour classify.ts; voir
// analyses/classification/README.md, essais E et F). Il contredit donc la convention « une étoile = un critère » de
// outils.json: à utiliser sur une copie ou un fichier de sortie, pas sur outils.json tel quel.
//
// Deux règles, tirées des 18 outils où l'évaluation enrichie confirmait moins de critères que d'étoiles:
//   R1. « dependance » est retiré d'un outil propriétaire qui n'est ni auto-hébergeable ni hors ligne (tags): sans code
//       ni installation chez soi, l'outil dépend de son fournisseur. Ne demande que les champs d'enrichissement.
//   R2. « donnees » est retiré quand il ne tient qu'à l'a priori de classify.ts « un fournisseur canadien héberge au
//       Canada » (indice sous le seuil) et qu'aucune confirmation d'IA ne l'établit à partir de la page de l'outil.
//       Demande un fichier de confirmer.ts (--confirmations=F); sans lui, R2 ne s'applique pas.
// Les règles ont été choisies en regardant ces 57 outils: à reconfirmer sur d'autres. Les champs source et tags viennent
// du même appel à l'IA que evaluation_enrichie (cohérence, pas vérité); les confirmations de Claude en sont indépendantes.
//
// Usage: nub classify4.ts [--confirmations=F] <outils.json> [sortie.json]
import { SEUIL, classer, evidences, type Classement } from "./classify.ts";
import type { OutilClasse } from "./classify.ts";
import { classer2 } from "./classify2.ts";
import { lancer } from "./cli.ts";
import { existsSync, readFileSync } from "node:fs";
import type { Outil } from "./extract.ts";
import { ecrireFichier, lireFichier, lireSiExiste } from "./fichiers.ts";
import { DEPENDANCE, DONNEES, type CritereId } from "./ids.ts";

export type Statut = "confirme" | "infirme" | "indetermine";
/** Par nom d'outil, le statut de chaque critère (sortie de confirmer.ts). */
export type Confirmations = Map<string, Record<CritereId, Statut>>;

const TAGS_INDEPENDANCE = ["auto-hebergeable", "hors-ligne"];

/** Lit un fichier de confirmer.ts; les outils sans verdict (échec) sont omis. */
export function chargerConfirmations(chemin: string): Confirmations {
  const { resultats } = JSON.parse(readFileSync(chemin, "utf8")) as { resultats: { nom: string; confirmation?: Record<CritereId, { statut: Statut }> }[] };
  return new Map(resultats.filter((r) => r.confirmation).map((r) => [r.nom, Object.fromEntries(Object.entries(r.confirmation!).map(([id, v]) => [id, v.statut])) as Record<CritereId, Statut>]));
}

export function classer4(outil: Pick<OutilClasse, "nom" | "description" | "score" | "source" | "tags">, confirmations?: Confirmations): Classement {
  const { criteres: v1, confiance } = classer2(outil.description, outil.score);
  const ev = evidences(outil.description);
  const verdicts = confirmations?.get(outil.nom);
  const criteres = v1.filter((c) => {
    if (c === DEPENDANCE && outil.source === "proprietaire" && outil.tags && !outil.tags.some((t) => TAGS_INDEPENDANCE.includes(t))) return false;
    if (c === DONNEES && ev[DONNEES] < SEUIL && verdicts && verdicts[DONNEES] !== "confirme") return false;
    return true;
  });
  return { criteres, confiance };
}

if (import.meta.main) {
  await lancer(async () => {
    const args = process.argv.slice(2);
    const inconnue = args.find((a) => a.startsWith("--") && a !== "--force" && !a.startsWith("--confirmations="));
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    const fichierConf = args.find((a) => a.startsWith("--confirmations="))?.slice("--confirmations=".length);
    if (fichierConf !== undefined && !existsSync(fichierConf)) throw new Error(`fichier de confirmations introuvable: ${fichierConf}`);
    const confirmations = fichierConf ? chargerConfirmations(fichierConf) : undefined;
    const [src, dst = src] = args.filter((a) => !a.startsWith("--"));
    if (!src || !dst) throw new Error("Usage: nub classify4.ts [--confirmations=F] <outils.json> [sortie.json]");
    const lu = lireFichier<Outil>(src, "outils");
    const res = lu.donnees.map((o) => ({ ...o, ...classer4(o as OutilClasse, confirmations) }));
    ecrireFichier(dst, "outils", res, dst === src ? lu : lireSiExiste<Outil>(dst, "outils"));
    const moins = res.filter((o) => o.criteres.length < o.score).length;
    console.log(res.length, `outils classés (version 4; ${moins} avec moins de critères que d'étoiles${confirmations ? "" : "; sans confirmations, R2 non appliquée"})`);
  });
}
