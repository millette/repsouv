// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Classe les étoiles de chaque outil selon les trois critères du répertoire.
// Source: https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/
// Usage: nub classify.ts <outils.json> [sortie.json]   (sans sortie, réécrit outils.json en place)
//
// Principe: les descriptions n'énoncent pas les étoiles, elles les laissent deviner.
//  1. On mesure, par critère, la force des indices textuels (voir REGLES).
//  2. Le score connu fixe le NOMBRE de critères satisfaits: on retient les `score`
//     critères aux indices les plus forts (3 étoiles = les trois; 2 = on écarte le plus faible).
//  3. Sans score, on retient les critères dont l'indice atteint SEUIL.
//  4. La confiance dépend de l'écart entre le dernier critère retenu et le premier écarté.
import { lancer } from "./cli.ts";
import { ecrireFichier, lireFichier, lireSiExiste } from "./fichiers.ts";
import type { Outil } from "./extract.ts";
import { CONTROLE, DEPENDANCE, DONNEES, type CritereId } from "./ids.ts";

export { CONTROLE, DEPENDANCE, DONNEES };
export type Critere = CritereId;
export type Confiance = "élevée" | "moyenne" | "faible" | "indéterminée";
export type Evidences = Record<Critere, number>;

const ORDRE: readonly Critere[] = [DONNEES, CONTROLE, DEPENDANCE]; // départage des égalités
const SEUIL = 2;

const HEBERGEMENT_CA = /(?:serveurs?|infrastructures?|instances?|hébergement)\s+(?:canadien|québécois)\w*/g;
const NON_CANADIEN =
  /non[- ]canadien|pas canadien|international|d'origine (?!canad|québé)\w+|bien que (?:français|allemand)|conçue? en france/;
const CANADIEN =
  /canadien|québécois|(?:conçue?|provenant|basée?) (?:au|du|en) (?:canada|québec)|conçue? au québec/;

// Appliquées au texte normalisé (minuscules, apostrophe droite).
const REGLES: readonly (readonly [Critere, RegExp, number])[] = [
  [DONNEES, /(?<!conçu )(?<!conçue )au canada/, 3],
  [DONNEES, new RegExp(HEBERGEMENT_CA.source), 3],
  [DONNEES, /auto-?héberg/, 3],
  [DONNEES, /infrastructure (?:de son choix|choisie)|serveur contrôlé|installé/, 3],
  [DONNEES, /sur l'appareil|localement|local-first|pair-à-pair|hors ligne/, 3],
  [DEPENDANCE, /pair-à-pair|hors ligne|déconnecté|sans dépendre|local-first|localement|sur l'appareil/, 3],
  [DEPENDANCE, /serveurs indépendants|instances indépendantes|fédéré|décentralisé/, 3],
  [DEPENDANCE, /sans compte/, 1],
  [DEPENDANCE, /chiffrement de bout en bout/, 1],
  [DEPENDANCE, /\blibre|open source/, 1],
  [DEPENDANCE, /auto-?héberg/, 1],
  [DEPENDANCE, /sans supprimer la dépendance/, -3],
];

const normaliser = (texte: string) => texte.toLowerCase().replaceAll("’", "'");

export function evidences(description: string): Evidences {
  const t = normaliser(description);
  const ev: Evidences = { [DONNEES]: 0, [CONTROLE]: 0, [DEPENDANCE]: 0 };
  for (const [critere, motif, poids] of REGLES) {
    if (motif.test(t)) ev[critere] += poids;
  }
  // Contrôle: on ignore « serveur canadien », etc., puis on cherche une nationalité explicite.
  const sansHebergement = t.replace(HEBERGEMENT_CA, "");
  if (NON_CANADIEN.test(sansHebergement)) {
    ev[CONTROLE] = -3;
  } else if (CANADIEN.test(sansHebergement)) {
    ev[CONTROLE] = 3;
    ev[DONNEES] += 1.5; // a priori: un fournisseur canadien héberge au Canada
  }
  return ev;
}

export interface OutilClasse extends Outil, Classement {}

export interface Classement {
  /** Identifiants (voir criteres.json) des critères que les étoiles représentent. */
  criteres: Critere[];
  confiance: Confiance;
}

export function classer(description: string, score?: number): Classement {
  const ev = evidences(description);
  const classement = [...ORDRE].sort((a, b) => ev[b] - ev[a] || ORDRE.indexOf(a) - ORDRE.indexOf(b));
  const parOrdre = (cs: Critere[]) => cs.sort((a, b) => ORDRE.indexOf(a) - ORDRE.indexOf(b));

  if (score === undefined) {
    return {
      criteres: parOrdre(classement.filter((c) => ev[c] >= SEUIL)),
      confiance: "indéterminée",
    };
  }
  const retenus = classement.slice(0, score);
  let confiance: Confiance = "élevée";
  if (score > 0 && score < ORDRE.length) {
    const ecart = ev[classement[score - 1]!] - ev[classement[score]!];
    confiance = ecart >= 2 ? "élevée" : ecart >= 1 ? "moyenne" : "faible";
  }
  return { criteres: parOrdre(retenus), confiance };
}

if (import.meta.main) {
  await lancer(async () => {
    const args = process.argv.slice(2);
    // --force est accepté sans effet: `nub run build --force` transmet l'option à la dernière commande
    // (celle-ci) et non à extract.ts; la reconstruction forcée passe par `nub run build:force`.
    const inconnue = args.find((a) => a.startsWith("--") && a !== "--force");
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    const [src, dst = src] = args.filter((a) => !a.startsWith("--"));
    if (!src || !dst) throw new Error("Usage: nub classify.ts <outils.json> [sortie.json]");
    const lu = lireFichier<Outil>(src, "outils");
    const res: OutilClasse[] = lu.donnees.map((o) => ({ ...o, ...classer(o.description, o.score) }));
    // En place, le fichier lu sert d'état précédent; vers un autre fichier, c'est celui-là s'il existe déjà.
    ecrireFichier(dst, "outils", res, dst === src ? lu : lireSiExiste<OutilClasse>(dst, "outils"));
    console.log(res.length, "outils classés");
  });
}
