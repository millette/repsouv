// Met à jour outils.json depuis le répertoire en ligne.
// Usage: nub update.ts [--dry-run] [outils.json] [url]
//
// Pour chaque outil, selon la comparaison avec la page en ligne:
//   - absent du fichier → changement "nouveau"
//   - précédemment retiré (removed: true) et de retour → "comeback" (le champ removed disparaît)
//   - champs différents (catégorie, icône, score, lien, description) → "modification"
//   - absent de la page → "retrait" et removed: true (l'entrée est conservée)
//   - identique → inchangé: sa date et son changement antérieurs sont conservés.
// Les outils nouveaux ou modifiés reçoivent la date de modification de la page et sont reclassés.
import { readFileSync, writeFileSync } from "node:fs";
import { classer, type OutilClasse } from "./classify.ts";
import { extraire, type Changement, type Outil } from "./extract.ts";

export const URL_REPERTOIRE = "https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/";

const CHAMPS_COMPARES = ["categorie", "icone", "score", "lien", "description"] as const;

export interface Resume {
  nouveau: string[];
  modification: string[];
  retrait: string[];
  comeback: string[];
}

export function mettreAJour(
  existants: OutilClasse[],
  page: Outil[],
  modification: string,
): { outils: OutilClasse[]; resume: Resume } {
  const resume: Resume = { nouveau: [], modification: [], retrait: [], comeback: [] };
  const parNom = new Map(existants.map((o) => [o.nom, o]));
  const enLigne = new Set(page.map((o) => o.nom));
  const outils: OutilClasse[] = [];

  const marquer = (o: Outil, changement: Changement): OutilClasse => {
    resume[changement].push(o.nom);
    return { ...o, derniere_modification: modification, changement, ...classer(o.description, o.score) };
  };

  for (const p of page) {
    const ancien = parNom.get(p.nom);
    if (!ancien) {
      outils.push(marquer(p, "nouveau"));
    } else if (ancien.removed) {
      outils.push(marquer(p, "comeback"));
    } else if (CHAMPS_COMPARES.some((c) => ancien[c] !== p[c])) {
      outils.push(marquer(p, "modification"));
    } else {
      outils.push(ancien);
    }
  }
  for (const e of existants) {
    if (enLigne.has(e.nom)) continue;
    if (e.removed) {
      outils.push(e);
    } else {
      outils.push({ ...e, derniere_modification: modification, changement: "retrait", removed: true });
      resume.retrait.push(e.nom);
    }
  }
  return { outils, resume };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const [fichier = "outils.json", url = URL_REPERTOIRE] = args.filter((a) => !a.startsWith("--"));

  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`${url}: HTTP ${reponse.status}`);
  const { outils: page, modification } = extraire(await reponse.text());
  const existants: OutilClasse[] = JSON.parse(readFileSync(fichier, "utf8"));

  const { outils, resume } = mettreAJour(existants, page, modification);
  const total = Object.values(resume).reduce((n, noms) => n + noms.length, 0);
  console.log(`Page modifiée le ${modification}: ${total} changement(s)`);
  for (const [type, noms] of Object.entries(resume)) {
    if (noms.length) console.log(`  ${type}: ${noms.join(", ")}`);
  }
  if (total && !dryRun) {
    writeFileSync(fichier, JSON.stringify(outils, null, 2));
    console.log(`${fichier} mis à jour`);
  }
}
