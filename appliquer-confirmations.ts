// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Inscrit dans outils.json le champ `criteres_confirmes` de chaque outil à partir d'un fichier de confirmer.ts: les critères
// qu'une IA a confirmés d'après la page de l'outil, avec la citation à l'appui, et ceux qu'elle a infirmés. `criteres`
// reste lié aux étoiles de la source; `criteres_confirmes` peut en compter moins (voir analyses/classification/README.md).
//
// Usage: nub appliquer-confirmations.ts <confirmations.json> <outils.json> [sortie.json]
//   (réécrit outils.json en place sans sortie; les outils sans verdict dans le fichier gardent leur champ tel quel)
import { readFileSync } from "node:fs";
import { lancer } from "./cli.ts";
import type { CriteresConfirmes, Outil } from "./extract.ts";
import { ecrireFichier, lireFichier, lireSiExiste } from "./fichiers.ts";
import { CONTROLE, DEPENDANCE, DONNEES, type CritereId } from "./ids.ts";
import { horodatage } from "./temps.ts";

const IDS: readonly CritereId[] = [DONNEES, CONTROLE, DEPENDANCE];
type Verdict = { statut: "confirme" | "infirme" | "indetermine"; preuve: string | null };
export interface FichierConfirmations {
  meta: { fournisseur: string; modele: string; regle: string | null; date: string };
  resultats: { nom: string; confirmation?: Record<CritereId, Verdict>; echec?: string }[];
}

/** Retourne une copie des outils où chaque outil ayant un verdict reçoit `criteres_confirmes`; les autres sont inchangés. */
export function appliquerConfirmations(outils: Outil[], fichier: FichierConfirmations): Outil[] {
  const { modele, regle, date } = fichier.meta;
  const verdicts = new Map(fichier.resultats.filter((r) => r.confirmation).map((r) => [r.nom, r.confirmation!]));
  return outils.map((o) => {
    const v = verdicts.get(o.nom);
    if (!v) return o;
    const champ: CriteresConfirmes = { criteres: [], preuves: {}, infirmes: {}, modele, regle: regle ?? null, date: horodatage(new Date(date)) };
    for (const id of IDS) {
      if (v[id].statut === "confirme") { champ.criteres.push(id); champ.preuves[id] = v[id].preuve ?? ""; }
      else if (v[id].statut === "infirme") champ.infirmes[id] = v[id].preuve ?? "";
    }
    return { ...o, criteres_confirmes: champ };
  });
}

if (import.meta.main) {
  await lancer(async () => {
    const args = process.argv.slice(2);
    const inconnue = args.find((a) => a.startsWith("--"));
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    const [conf, src, dst = src] = args;
    if (!conf || !src || !dst) throw new Error("Usage: nub appliquer-confirmations.ts <confirmations.json> <outils.json> [sortie.json]");
    const fichier = JSON.parse(readFileSync(conf, "utf8")) as FichierConfirmations;
    if (!fichier?.meta?.modele || !Array.isArray(fichier.resultats)) throw new Error(`${conf}: fichier de confirmer.ts attendu (meta.modele et resultats)`);
    const lu = lireFichier<Outil>(src, "outils");
    const res = appliquerConfirmations(lu.donnees, fichier);
    ecrireFichier(dst, "outils", res, dst === src ? lu : lireSiExiste<Outil>(dst, "outils"));
    const n = res.filter((o, i) => o.criteres_confirmes !== lu.donnees[i]!.criteres_confirmes).length;
    console.log(`${res.length} outils, ${n} outil(s) avec criteres_confirmes inscrit ou remplacé (${fichier.meta.fournisseur} ${fichier.meta.modele})`);
  });
}
