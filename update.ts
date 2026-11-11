// Met à jour outils.json depuis le répertoire en ligne.
// Usage: nub update.ts [--dry-run] [--enrichir [--nouveaux-tags] [--limite=N]] [outils.json] [url]
//
// Pour chaque outil, selon la comparaison avec la page en ligne:
//   - absent du fichier → changement "nouveau"
//   - précédemment retiré (removed: true) et de retour → "comeback" (le champ removed disparaît)
//   - champs différents (catégorie, icône, score, lien, description) → "modification"
//   - absent de la page → "retrait" et removed: true (l'entrée est conservée)
//   - identique → inchangé: sa date et son changement antérieurs sont conservés.
// Les outils nouveaux ou modifiés reçoivent la date de modification de la page et sont reclassés.
// Les champs d'enrichissement (description longue, tags, source, licence, repo, évaluation) survivent à une modification.
//
// Option --enrichir (clé OPENAI_API_KEY dans .env; modèle: OPENAI_MODEL):
//   génère UNE SEULE FOIS, pour chaque outil qui n'a pas encore de description_longue, une description
//   longue en français (Markdown), de 1 à 5 tags de tags.json, source/licence/repo pour les logiciels libres
//   et une évaluation indépendante des critères et du score (evaluation_enrichie, avec un sous-champ
//   `ecart` qui explique la différence quand elle ne concorde pas avec le répertoire).
//   Une barre de progression et le journal vont sur stderr.
//   Un outil déjà enrichi n'est jamais régénéré. Avec --dry-run, liste seulement les outils concernés.
//   --nouveaux-tags : le modèle peut proposer de nouveaux tags (justification obligatoire, ajoutés à tags.json).
//   --limite=N      : n'enrichit pas plus de N outils par exécution.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { classer, type OutilClasse } from "./classify.ts";
import {
  aEnrichir, chargerCriteres, chargerTags, enrichirOutils, expliqueurOpenAI, generateurOpenAI, MODELE_PAR_DEFAUT, sauverTags,
} from "./enrichir.ts";
import { extraire, type Changement, type Outil } from "./extract.ts";
import { createProgress } from "./progress.ts";

export const URL_REPERTOIRE = "https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/";

const CHAMPS_COMPARES = ["categorie", "icone", "score", "lien", "description"] as const;
const CHAMPS_ENRICHIS = [
  "description_longue", "tags", "source", "licence", "custom_license", "custom_license_url", "repo", "evaluation_enrichie",
] as const;

/** Les champs d'enrichissement d'un outil existant, à reporter sur sa version à jour de la page. */
const enrichissementDe = (o: OutilClasse): Partial<Outil> =>
  Object.fromEntries(CHAMPS_ENRICHIS.filter((c) => o[c] !== undefined).map((c) => [c, o[c]]));

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

  const marquer = (o: Outil, changement: Changement, ancien?: OutilClasse): OutilClasse => {
    resume[changement].push(o.nom);
    return {
      ...o,
      ...(ancien && enrichissementDe(ancien)),
      derniere_modification: modification,
      changement,
      ...classer(o.description, o.score),
    };
  };

  for (const p of page) {
    const ancien = parNom.get(p.nom);
    if (!ancien) {
      outils.push(marquer(p, "nouveau"));
    } else if (ancien.removed) {
      outils.push(marquer(p, "comeback", ancien));
    } else if (CHAMPS_COMPARES.some((c) => ancien[c] !== p[c])) {
      outils.push(marquer(p, "modification", ancien));
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
  const enrichir = args.includes("--enrichir");
  const nouveauxTags = args.includes("--nouveaux-tags");
  const limiteArg = args.find((a) => a.startsWith("--limite="));
  const limite = limiteArg ? Number(limiteArg.slice("--limite=".length)) : undefined;
  if (nouveauxTags && !enrichir) throw new Error("--nouveaux-tags nécessite --enrichir");
  if (limite !== undefined && !(Number.isInteger(limite) && limite > 0)) throw new Error("--limite=N: entier positif attendu");
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

  if (enrichir) {
    const fichierTags = join(dirname(fichier), "tags.json");
    const aFaire = outils.filter(aEnrichir);
    const prevus = limite ? aFaire.slice(0, limite) : aFaire;
    console.log(`Enrichissement: ${aFaire.length} outil(s) sans description longue`);
    if (dryRun) {
      if (prevus.length) console.log(`  à enrichir (${prevus.length}): ${prevus.map((o) => o.nom).join(", ")}`);
    } else if (aFaire.length) {
      const cle = process.env.OPENAI_API_KEY;
      if (!cle) throw new Error("OPENAI_API_KEY absente (voir .env.example)");
      const tags = chargerTags(fichierTags);
      const criteres = chargerCriteres(join(dirname(fichier), "criteres.json"));
      const nbTags = tags.length;
      const modele = process.env.OPENAI_MODEL || MODELE_PAR_DEFAUT;
      const progression = createProgress(prevus.length, { logWhenNotTTY: true });
      let traites = 0;
      const resultat = await enrichirOutils(outils, {
        tags,
        criteres,
        generer: generateurOpenAI(cle, modele),
        expliquer: expliqueurOpenAI(cle, modele),
        autoriserNouveauxTags: nouveauxTags,
        ...(limite !== undefined && { limite }),
        apresChaque: (os, ts) => {
          writeFileSync(fichier, JSON.stringify(os, null, 2));
          if (ts.length !== nbTags) sauverTags(fichierTags, ts);
        },
        // En terminal, le nom de l'outil en cours s'affiche sur la barre; sinon, sur une ligne de journal.
        debut: (nom) =>
          process.stderr.isTTY ? progression.update(traites, nom) : progression.message(`Enrichissement de ${nom}...`),
        progression: (n) => progression.update((traites = n)),
        journal: (message) => progression.message(message),
      });
      progression.end();
      console.log(`Enrichis: ${resultat.enrichis.length}; échecs: ${resultat.erreurs.length}`);
      if (resultat.ecarts.length) console.log(`Évaluation différente du répertoire: ${resultat.ecarts.join(", ")}`);
      if (tags.length > nbTags) console.log(`Nouveaux tags: ${tags.slice(nbTags).map((t) => t.id).join(", ")}`);
      if (resultat.erreurs.length) process.exitCode = 1;
    }
  }
}
