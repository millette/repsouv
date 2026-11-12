// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Sommaire statistique du répertoire, écrit dans sommaire.md.
// Usage: nub sommaire.ts [--sans-resume] [--sans-graphiques] [--sans-couleur] [outils.json] [sommaire.md]
//
// Lit outils.json (et tags.json et criteres.json, dans le même dossier) et écrit un sommaire en
// Markdown: chiffres clés, dates, catégories, statut du code source, licences, critères de
// souveraineté, forges de code, tags et fiabilité des données.
// Un résumé de 3 ou 4 paragraphes sur le répertoire et son utilité est rédigé par l'API OpenAI à
// partir de toutes les statistiques et de la liste des outils (clé OPENAI_API_KEY dans .env; modèle:
// OPENAI_MODEL). --sans-resume l'omet: le sommaire est alors calculé localement, sans appel à l'API.
// Des graphiques (Vega-Lite, convertis en SVG et en PNG par vl-convert) sont écrits dans le dossier
// graphiques/ à côté du sommaire, et leurs images PNG y sont insérées. --sans-graphiques les omet.
// Le calcul des statistiques et le rendu sont des fonctions pures; seul le résumé utilise le réseau.
import { writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { OutilClasse } from "./classify.ts";
import { lancer } from "./cli.ts";
import { couleursActives, creerCouleurs } from "./couleurs.ts";
import { formaterDuree } from "./duree.ts";
import { construireGraphiques, ecrireGraphiques, verifierVlConvert, type Convertisseur, type GraphiqueEcrit } from "./graphiques.ts";
import { chargerCategories } from "./categories.ts";
import { chargerEnv } from "./env.ts";
import { appelerOpenAI, chargerCriteres, chargerTags, MAX_ECHECS_PAR_DEFAUT, MODELE_PAR_DEFAUT, modelesDepuisEnv, nouvelEssai, obtenirValide, problemesMarkdown } from "./enrichir.ts";
import { lireFichier, lireSiExiste } from "./fichiers.ts";
import type { Source } from "./sources.ts";
import { createProgress, type Progress } from "./progress.ts";
import {
  arrondi, calculerStatistiques, forgeDe, NOMS_SOURCES, NON_ENRICHI, type LigneCriteres, type Statistiques,
} from "./statistiques.ts";
import { horodatage } from "./temps.ts";

// Les statistiques vivent dans statistiques.ts; elles sont réexportées ici pour les appelants du sommaire.
export { calculerStatistiques, familleLicence, forgeDe, NON_ENRICHI, SOURCES } from "./statistiques.ts";
export type { Compte, DateExtreme, Entree, LigneCriteres, Statistiques } from "./statistiques.ts";

// ---------- rendu Markdown ----------

const cellule = (v: string | number) => String(v).replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
const pourcent = (n: number, base: number) => `${(base ? (n * 100) / base : 0).toFixed(1).replace(".", ",")} %`;
const decimal = (n: number) => String(n).replace(".", ",");
/** « 1 outil », « 2 outils » (en français, le singulier va jusqu'à 1 inclusivement). */
const pluriel = (n: number, mot: string, pl = `${mot}s`) => `${n} ${n > 1 ? pl : mot}`;
const liste = (noms: string[], max = 8) => (noms.length > max ? `${noms.slice(0, max).join(", ")} et ${noms.length - max} autre(s)` : noms.join(", "));

function tableau(entetes: string[], lignes: (string | number)[][]): string {
  return [
    `| ${entetes.map(cellule).join(" | ")} |`,
    `|${entetes.map(() => "---").join("|")}|`,
    ...lignes.map((l) => `| ${l.map(cellule).join(" | ")} |`),
  ].join("\n");
}

export type ResumeIA = { paragraphes: string[]; modele: string; date: string } | { erreur: string } | null;

export interface OptionsRendu {
  genereLe: string;
  resume?: ResumeIA;
  /** Graphiques déjà écrits (voir graphiques.ts): chaque image PNG est insérée dans sa section. */
  graphiques?: GraphiqueEcrit[];
}

function sectionResume(resume: ResumeIA | undefined): string {
  if (!resume) return "";
  if ("erreur" in resume) {
    return `## Résumé\n\n*Le résumé n'a pas pu être rédigé (${resume.erreur}). Relancer \`node sommaire.ts\` pour le produire.*\n\n`;
  }
  return `## Résumé\n\n${resume.paragraphes.join("\n\n")}\n\n*Résumé rédigé par un modèle d'IA (${resume.modele}) le ${resume.date}, à partir des statistiques ci-dessous et de la liste des outils. À relire avant de le diffuser.*\n\n`;
}

export function rendreMarkdown(s: Statistiques, { genereLe, resume, graphiques = [] }: OptionsRendu): string {
  const ens = s.enrichissement.enrichis;
  const aucunEnrichi = "*Aucun outil n'est enrichi pour l'instant.*";
  const parts: string[] = [];
  /** L'image PNG du graphique `id`, suivie d'une ligne vide; rien si ce graphique n'existe pas. */
  const image = (id: string) => {
    const g = graphiques.find((x) => x.id === id);
    return g ? `![${g.description.replace(/[\[\]]/g, "")}](${g.svg})\n\n` : "";
  };

  parts.push(`# Sommaire du répertoire d'outils favorisant la souveraineté numérique

*Documentation : [README](README.md) · [Implémentation](implementation.md) · [Historique](historique.md) · [Sommaire statistique](sommaire.md)*

Généré le ${genereLe} par \`sommaire.ts\` d'après \`outils.json\` (données sous licence ${s.meta.data_license}, créées le ${s.meta.created_at} et modifiées pour la dernière fois le ${s.meta.updated_at}). Ne pas modifier ce fichier à la main : relancer \`node sommaire.ts\`.

Sauf indication contraire, les pourcentages sont calculés sur les ${s.total} outils du répertoire. Les statistiques sur le statut du code source, les licences, les forges et les tags ne portent que sur les ${ens} outils déjà enrichis.

`);
  parts.push(sectionResume(resume));

  // Chiffres clés
  const libres = s.sources.filter((c) => c.cle === "libre" || c.cle === "partiel").reduce((n, c) => n + c.n, 0);
  parts.push(`## Chiffres clés

- **${pluriel(s.total, "outil")}** répartis en **${pluriel(s.categories.length, "catégorie")}**${s.retires.length ? `, et ${pluriel(s.retires.length, "outil retiré", "outils retirés")} du répertoire (${liste(s.retires)})` : ""}.
- **${pluriel(s.scores.trois, "outil")} à 3 étoiles** et **${s.scores.deux} à 2 étoiles** (moyenne : ${decimal(s.scores.moyen)} étoiles).
- **${pluriel(ens, "outil enrichi", "outils enrichis")}** sur ${s.total} (${pourcent(ens, s.total)}).
- **Provenance** : ${s.provenance.map((p) => `${p.nom} (${pluriel(p.outils, "outil")})`).join(", ")}${s.scoresEstimes.length ? ` ; ${pluriel(s.scoresEstimes.length, "outil")} au score estimé faute d'étoiles dans la source (${liste(s.scoresEstimes, 6)})` : ""}.
${ens ? `- **${pluriel(libres, "logiciel libre ou partiellement libre", "logiciels libres ou partiellement libres")}** parmi les outils enrichis (${pourcent(libres, ens)}).
- **${pluriel(s.licences.spdx.length, "licence SPDX distincte", "licences SPDX distinctes")}**, **${pluriel(s.forges.length, "forge de code", "forges de code")}** et **${pluriel(s.tags.utilisation.filter((t) => t.n).length, "tag")}** utilisés sur ${s.tags.utilisation.length} du vocabulaire.
` : ""}
`);

  // Dates
  const d = s.dates;
  const de = s.datesEnrichissement;
  parts.push(`## Dates

### Dans le répertoire

La page du répertoire n'affiche qu'une date pour toute la note : la date d'un outil (\`derniere_modification\`) est celle de la page quand l'outil a été ajouté ou a changé.

${d.premieres ? `- **Outils les plus anciens** : ${d.premieres.date}, ${d.premieres.outils.length} outil(s) (${liste(d.premieres.outils, 5)}).` : "- Aucune date."}
${d.dernieres ? `- **Outils les plus récents** : ${d.dernieres.date}, ${d.dernieres.outils.length} outil(s) (${liste(d.dernieres.outils, 5)}).` : ""}

${tableau(["Date de modification", "Outils"], d.parDate.map((c) => [c.cle, c.n]))}

${tableau(["Changement détecté", "Outils"], s.changements.map((c) => [c.cle === "aucun" ? "Aucun depuis l'import" : c.cle, c.n]))}

### Enrichissement

${ens ? `- ${pluriel(ens, "outil enrichi", "outils enrichis")}, dont ${ens - s.enrichissement.sansDate} avec une date d'enrichissement enregistrée${s.enrichissement.sansDate ? ` et **${s.enrichissement.sansDate} sans date** (enrichis avant que cette date soit enregistrée)` : ""}.
${de.premiere ? `- **Premier enrichissement** : ${de.premiere.date} (${liste(de.premiere.outils, 5)}).
- **Dernier enrichissement** : ${de.derniere!.date} (${liste(de.derniere!.outils, 5)}).` : "- Aucune date d'enrichissement par outil n'est enregistrée."}
- Dernière écriture du fichier de données : ${s.meta.updated_at}.
${de.parJour.length ? `\n${image("enrichissement-jours")}${tableau(["Jour", "Outils enrichis"], de.parJour.map((c) => [c.cle, c.n]))}\n` : ""}` : aucunEnrichi}
`);

  // Catégories
  parts.push(`## Catégories

${image("categories-statut")}${tableau(
    ["Catégorie", "Outils", "% du répertoire", "Enrichis", "Libres ou partiels", "Score moyen"],
    s.categories.map((c) => [`${c.icone} ${c.nom}`.trim(), c.outils, pourcent(c.outils, s.total), c.enrichis, c.libres, decimal(c.scoreMoyen)]),
  )}
`);

  // Source
  parts.push(`## Statut du code source

${image("statut-code-source")}${tableau(
    ["Statut", "Outils", "% du répertoire", ens ? "% des outils enrichis" : ""].filter(Boolean),
    s.sources.map((c) => [NOMS_SOURCES[c.cle] ?? c.cle, c.n, pourcent(c.n, s.total), ...(ens ? [c.cle === NON_ENRICHI ? "" : pourcent(c.n, ens)] : [])]),
  )}
`);

  // Licences
  const l = s.licences;
  parts.push(`## Licences

${ens ? `${image("licences")}${tableau(["Licence (SPDX)", "Outils", "% des outils enrichis"], l.spdx.map((c) => [c.cle, c.n, pourcent(c.n, ens)]))}

**Familles de licences** (classement indicatif d'après l'identifiant SPDX) :

${l.familles.length ? tableau(["Famille", "Outils"], l.familles.map((c) => [c.cle, c.n])) : "*Aucune licence SPDX.*"}
${l.maison.length ? `\n**Licences maison** (hors liste SPDX) :\n\n${tableau(["Licence", "URL", "Outils"], l.maison.map((m) => [m.nom, m.url ?? "", m.n]))}\n` : ""}
${l.sansLicence.length ? `**Outils enrichis sans licence connue**, par statut :\n\n${tableau(["Statut", "Outils"], l.sansLicence.map((c) => [c.cle, c.n]))}` : ""}` : aucunEnrichi}
`);

  // Critères
  const c = s.criteres;
  const titre = (id: string) => c.definitions.find((x) => x.id === id)?.titre ?? id;
  const matrice = (lignes: LigneCriteres[]) =>
    tableau(
      ["Statut", "Outils", ...c.definitions.map((x) => titre(x.id)), "Critères au total", "Moyenne par outil"],
      lignes.map((r) => [NOMS_SOURCES[r.source] ?? r.source, r.outils, ...c.definitions.map((x) => r.parCritere[x.id] ?? 0), r.total, decimal(arrondi(r.outils ? r.total / r.outils : 0))]),
    );
  parts.push(`## Critères de souveraineté

Les critères du répertoire sont **déduits** des descriptions (voir le README) ; l'évaluation enrichie est un second avis indépendant du modèle d'IA.

### Nombre d'outils par critère (répertoire)

${image("criteres-repertoire-enrichie")}${tableau(["Critère", "Outils", "% du répertoire"], c.repertoire.parCritere.map((x) => [titre(x.cle), x.n, pourcent(x.n, s.total)]))}

### Critères satisfaits par statut du code source (répertoire)

${image("criteres-par-statut")}${matrice(c.repertoire.parSource)}

### Évaluation enrichie (second avis)

${c.enrichie.parSource.length ? `${tableau(["Critère", "Outils", "% des évaluations"], c.enrichie.parCritere.map((x) => [titre(x.cle), x.n, pourcent(x.n, c.enrichie.parSource.at(-1)!.outils)]))}

${matrice(c.enrichie.parSource)}

- **${c.enrichie.concordants}** évaluation(s) sur ${c.enrichie.parSource.at(-1)!.outils} concordent avec le répertoire (${pourcent(c.enrichie.concordants, c.enrichie.parSource.at(-1)!.outils)}) ; **${s.enrichissement.avecEcart.length}** s'en écartent${s.enrichissement.avecEcart.length ? ` (${liste(s.enrichissement.avecEcart, 10)})` : ""}.
- Confiance de l'évaluation enrichie : ${c.enrichie.confiance.map((x) => `${x.cle} ${x.n}`).join(", ") || "aucune"}.` : aucunEnrichi}

### Critères vérifiés d'après la page de l'outil (citation à l'appui)

Pour chaque outil enrichi, une IA a lu la page de l'outil et répondu, critère par critère, **confirmé**, **infirmé** ou **indéterminé**, avec une citation copiée mot pour mot (champ \`criteres_confirmes\` de \`outils.json\`). Un critère indéterminé n'est pas contredit : la page ne permet simplement pas de conclure. Ce nombre peut être inférieur au nombre d'étoiles, qui reste celui de la source.

${c.confirmes.outils ? `${image("criteres-verdicts")}${tableau(
    ["Statut", "Outils", ...c.definitions.map((x) => `${titre(x.id)} (confirmés / infirmés / indéterminés)`)],
    c.confirmes.parSource.map((r) => [NOMS_SOURCES[r.source] ?? r.source, r.outils, ...c.definitions.map((x) => { const v = r.parCritere[x.id]!; return `${v.confirme} / ${v.infirme} / ${v.indetermine}`; })]),
  )}

- **${c.confirmes.outils}** outil(s) vérifié(s) sur ${ens} enrichis, par ${c.confirmes.modeles.map((m) => `${m.cle} (${m.n})`).join(", ")}${c.confirmes.sansVerdict.length ? ` ; sans verdict : ${liste(c.confirmes.sansVerdict, 10)}` : ""}.
- **${c.confirmes.autantQueEtoiles}** outil(s) sur ${c.confirmes.outils} ont autant de critères confirmés que d'étoiles (${pourcent(c.confirmes.autantQueEtoiles, c.confirmes.outils)}) ; pour les autres, la page n'établit pas tous les critères que les étoiles représentent.
- **${c.confirmes.identiquesEvaluation}** outil(s) sur ${c.confirmes.outils} ont exactement les critères de l'évaluation enrichie (${pourcent(c.confirmes.identiquesEvaluation, c.confirmes.outils)}).` : "*Aucun critère n'a encore été vérifié (voir confirmer.ts et appliquer-confirmations.ts dans le README).*"}
`);

  // Forges
  parts.push(`## Forges de code

${s.forges.length ? `${image("forges")}${tableau(["Forge", "Outils", "Hôte(s)", "Outils concernés"], s.forges.map((f) => [f.forge, f.outils.length, f.hotes.join(", "), liste(f.outils, 6)]))}

${s.sansDepot.libresOuPartiels.length ? `- **Logiciels libres ou partiels sans dépôt connu** : ${liste(s.sansDepot.libresOuPartiels, 10)}.\n` : ""}- Autres outils enrichis sans dépôt (propriétaires ou inconnus) : ${s.sansDepot.autres}.` : ens ? "*Aucun dépôt de code n'est connu pour les outils enrichis.*" : aucunEnrichi}
`);

  // Open Hub
  const oh = s.openhub;
  parts.push(`## Open Hub

Données publiques d'[Open Hub](https://www.openhub.net/) sur les logiciels au code public (champ \`openhub\` de \`outils.json\`, voir \`openhub.ts\`) : activité, contributeurs et commits des douze derniers mois, licences déclarées sur Open Hub.

${oh.completes.length ? `${tableau(["Outil", "Projet Open Hub", "Activité", "Contributeurs (12 mois)", "Commits (12 mois)", "Licences Open Hub"], oh.completes.map((o) => [o.nom, o.id, o.activite ?? "inconnue", o.contributeurs12 ?? "?", o.commits12 ?? "?", o.licences.join(", ") || "aucune"]))}

- **${pluriel(oh.completes.length, "outil")}** avec des données Open Hub ; activité : ${oh.activite.map((a) => `${a.cle} ${a.n}`).join(", ")}.
` : "*Aucun outil n'a encore de données Open Hub.*\n"}${oh.restants.length ? `- Restent à chercher : ${liste(oh.restants, 10)}.\n` : ""}${oh.abandonnes.length ? `- Sans concordance sûre après plusieurs essais (candidats dans le journal de \`update\`) : ${liste(oh.abandonnes, 10)}.\n` : ""}${s.alternatives.length ? `\n**Alternatives déclarées par la source** : ${s.alternatives.map((a) => `${a.nom} (${a.alternatives.join(", ")})`).join(" ; ")}.\n` : ""}`);

  // Tags
  const tg = s.tags;
  parts.push(`## Tags

${ens ? `- Moyenne de **${decimal(tg.moyenneParOutil)} ${tg.moyenneParOutil >= 2 ? "tags" : "tag"} par outil enrichi**${tg.sansTag.length ? `; sans tag : ${liste(tg.sansTag)}` : ""}.
- ${pluriel(tg.utilisation.filter((t) => t.n).length, "tag utilisé", "tags utilisés")} sur ${tg.utilisation.length} du vocabulaire${tg.inutilises.length ? `; **non utilisés** : ${liste(tg.inutilises, 12)}` : ""}.

${image("tags")}${tableau(["Tag", "Description", "Outils", "% des outils enrichis"], tg.utilisation.filter((t) => t.n).map((t) => [t.cle, t.description, t.n, pourcent(t.n, ens)]))}
${tg.paires.length ? `\n**Tags les plus souvent associés** :\n\n${tableau(["Paire de tags", "Outils"], tg.paires.map((p) => [p.cle, p.n]))}\n` : ""}` : aucunEnrichi}
${tg.ajoutes.length ? `\n**Tags ajoutés après le vocabulaire initial** :\n\n${tableau(["Tag", "Description", "Proposé pour", "Justification"], tg.ajoutes.map((t) => [t.id, t.description, t.propose_pour ?? "", t.justification ?? ""]))}\n` : ""}
`);

  // Fiabilité
  const ab = s.enrichissement.abandonnes;
  const abandonnesTexte = ab.length ? `, dont ${ab.length} abandonné(s) après ${MAX_ECHECS_PAR_DEFAUT} échecs consécutifs d'enrichissement (${liste(ab, 10)})` : "";
  parts.push(`## Fiabilité et suivi

- Confiance de la déduction des critères : ${s.confianceClassification.map((x) => `${x.cle} ${x.n}`).join(", ")}.
- Outils restant à enrichir : ${s.total - ens}${abandonnesTexte}.
`);

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

// ---------- résumé par l'IA ----------

export interface ChargeResume {
  statistiques: Statistiques;
  outils: Record<string, unknown>[];
}

/** Tout ce que le modèle reçoit: les statistiques agrégées et la liste compacte des outils. */
export function chargeResume(statistiques: Statistiques, tous: OutilClasse[]): ChargeResume {
  const outils = tous
    .filter((o) => !o.removed)
    .map((o) => ({
      nom: o.nom,
      categorie: statistiques.categories.find((c) => c.id === o.categorie)?.nom ?? o.categorie,
      score: o.score,
      criteres: o.criteres,
      source: o.source,
      licence: o.licence ?? o.custom_license,
      forge: o.repo ? forgeDe(o.repo).forge : undefined,
      tags: o.tags,
      description: o.description,
    }));
  return { statistiques, outils };
}

export const INSTRUCTIONS_RESUME = `Tu rédiges le résumé d'un répertoire d'outils numériques favorisant la souveraineté numérique, destiné aux OSBL des arts et de la culture du Canada français.
Tu reçois en JSON toutes les statistiques agrégées du répertoire et la liste compacte de ses outils.

Rédige 3 ou 4 paragraphes, en français, sur le répertoire et son utilité:
- ce que contient le répertoire et comment il est construit (trois critères de souveraineté, un score de 0 à 3 étoiles);
- ce que montrent les chiffres: logiciels libres, partiellement libres ou propriétaires, licences, forges de code, critères satisfaits, tags les plus fréquents, catégories;
- l'utilité concrète pour un organisme (repérer des solutions, comparer, choisir selon ses besoins et son niveau de maîtrise des données);
- les limites et précautions: souveraineté partielle, déductions automatiques, enrichissement partiel s'il l'est, informations à vérifier.

Règles: n'utilise que les données fournies et ne cite que des nombres qui s'y trouvent; si une partie du répertoire n'est pas encore enrichie, dis-le plutôt que d'extrapoler; ton neutre et informatif; chaque paragraphe est un bloc de texte continu, sans titre, sans liste, sans gras, sans image, sans HTML, sans tiret cadratin (utilise une virgule, un deux-points, des parenthèses ou un point), sans émoji ni émoticône.`;

export const SCHEMA_RESUME = {
  type: "object",
  properties: { paragraphes: { type: "array", items: { type: "string" }, description: "3 ou 4 paragraphes de texte continu." } },
  required: ["paragraphes"],
  additionalProperties: false,
};

/** Produit une réponse brute (non validée) à partir de la charge; `rappel` est la raison du rejet de l'essai précédent. */
export type GenerateurResume = (charge: ChargeResume, rappel?: string) => Promise<unknown>;

export const generateurResumeOpenAI = (cle: string, modele: string): GenerateurResume => (charge, rappel) =>
  appelerOpenAI(cle, modele, {
    nom: "resume_repertoire",
    schema: SCHEMA_RESUME,
    instructions: INSTRUCTIONS_RESUME,
    messages: [JSON.stringify(charge), ...(rappel ? [`Ta tentative précédente a été rejetée: ${rappel}. Corrige ce problème.`] : [])],
    maxTokens: 4000,
  });

const LONGUEUR_MIN = 120;

/** Valide la réponse: 3 ou 4 paragraphes de texte continu, sans Markdown de structure, sans HTML ni tiret cadratin. */
export function validerResume(brut: unknown): string[] {
  const paragraphes = (brut as { paragraphes?: unknown } | null)?.paragraphes;
  if (!Array.isArray(paragraphes) || paragraphes.length < 3 || paragraphes.length > 4) throw new Error("3 ou 4 paragraphes attendus");
  return paragraphes.map((p, i) => {
    if (typeof p !== "string" || p.trim().length < LONGUEUR_MIN) throw new Error(`paragraphe ${i + 1}: texte d'au moins ${LONGUEUR_MIN} caractères attendu`);
    const texte = p.trim();
    if (/^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>)/m.test(texte)) throw new Error(`paragraphe ${i + 1}: ni titre, ni liste, ni citation (texte continu seulement)`);
    if (/\*\*|__/.test(texte)) throw new Error(`paragraphe ${i + 1}: pas de gras`);
    const problemes = problemesMarkdown(texte);
    if (problemes.length) throw new Error(`paragraphe ${i + 1}: ${problemes.join("; ")}`);
    return texte;
  });
}

/**
 * Rédige le résumé, avec une seconde tentative (et la raison du rejet) si la réponse est invalide, par le générateur de
 * repli s'il est donné.
 */
export function produireResume(charge: ChargeResume, generer: GenerateurResume, rejet: (raison: string) => void = () => {}, genererRepli?: GenerateurResume): Promise<string[]> {
  return obtenirValide((rappel) => generer(charge, rappel), validerResume, rejet, genererRepli && ((rappel) => genererRepli(charge, rappel)));
}

// ---------- génération du sommaire ----------

export interface OptionsSommaire {
  /** outils.json; tags.json et criteres.json sont lus dans le même dossier. */
  source: string;
  /** sommaire.md; par défaut dans le dossier de `source`. Le dossier graphiques/ est créé à côté. */
  sortie?: string;
  sansResume?: boolean;
  sansGraphiques?: boolean;
  /**
   * Si le résumé ne peut pas être rédigé: `true` n'écrit rien (le sommaire existant est conservé, graphiques
   * compris); `false` (par défaut) écrit le sommaire avec une note à la place du résumé.
   */
  conserverSiEchec?: boolean;
  cle?: string | undefined;
  modele?: string | undefined;
  /** Modèle de repli pour le résumé (seconde tentative); null ou absent: le même modèle réessaie. */
  modeleRepli?: string | null | undefined;
  /** Générateur du résumé (et son repli) et convertisseur des graphiques: par défaut OpenAI et vl-convert (injectables pour les tests). */
  generer?: GenerateurResume;
  genererRepli?: GenerateurResume;
  convertir?: Convertisseur;
  /** Messages de suivi (une réponse de l'IA rejetée, par exemple). */
  journal?: (message: string) => void;
  /**
   * Fabrique d'une barre de progression, appelée avec le nombre d'étapes (le résumé, chaque graphique, l'écriture
   * du sommaire); la barre reçoit `update(n, étiquette)` à chaque étape puis `end()`, même en cas d'échec.
   */
  progression?: (total: number) => Pick<Progress, "update" | "end">;
}

/** La barre de progression des scripts, sur stderr, avec le temps restant estimé. */
export const barreSommaire = (paint?: { filled?: (t: string) => string; empty?: (t: string) => string; label?: (t: string) => string }) => (total: number) =>
  createProgress(total, { logWhenNotTTY: true, restant: formaterDuree, ...(paint && { paint }) });

export interface ResultatSommaire {
  ecrit: boolean;
  destination: string;
  graphiques: number;
  resume: "oui" | "non" | "echec";
  erreur?: string;
  statistiques: Statistiques;
}

/**
 * Calcule les statistiques, rédige le résumé, écrit les graphiques puis le sommaire. Les vérifications qui ne
 * coûtent rien (clé API, vl-convert) passent avant l'appel à l'API, et les graphiques ne sont écrits qu'une fois
 * le résumé obtenu, pour qu'un échec avec `conserverSiEchec` ne laisse rien de modifié.
 */
export async function genererSommaire(o: OptionsSommaire): Promise<ResultatSommaire> {
  const journal = o.journal ?? (() => {});
  if (!o.sansResume && !o.generer && !o.cle) {
    throw new Error("OPENAI_API_KEY absente (voir .env.example); utiliser --sans-resume pour omettre le résumé");
  }
  if (!o.sansGraphiques && !o.convertir) verifierVlConvert();

  const dossier = dirname(o.source);
  const lu = lireFichier<OutilClasse>(o.source, "outils");
  const sourcesLues = lireSiExiste<Source>(join(dossier, "sources.json"), "sources");
  const statistiques = calculerStatistiques({
    outils: lu.donnees,
    ...(sourcesLues && { sources: sourcesLues.donnees }),
    categories: chargerCategories(join(dossier, "categories.json")),
    tags: chargerTags(join(dossier, "tags.json")),
    criteres: chargerCriteres(join(dossier, "criteres.json")),
    meta: lu.meta,
  });
  const destination = o.sortie ?? join(dossier, "sommaire.md");
  const specs = o.sansGraphiques ? [] : construireGraphiques(statistiques);
  // Étapes de la barre: le résumé, chaque graphique, l'écriture du sommaire.
  const barre = o.progression?.((o.sansResume ? 0 : 1) + specs.length + 1);
  let etape = 0;

  let resume: ResumeIA = null;
  if (!o.sansResume) {
    const modele = o.modele ?? MODELE_PAR_DEFAUT;
    const generer = o.generer ?? generateurResumeOpenAI(o.cle!, modele);
    const genererRepli = o.genererRepli ?? (o.modeleRepli ? generateurResumeOpenAI(o.cle!, o.modeleRepli) : undefined);
    let parRepli = false;
    const repli = genererRepli && ((charge: ChargeResume, rappel?: string) => { parRepli = true; return genererRepli(charge, rappel); });
    barre?.update(etape, `résumé (${modele})`);
    try {
      const paragraphes = await produireResume(chargeResume(statistiques, lu.donnees), generer, (r) => journal(`Résumé rejeté (${r}), ${nouvelEssai(genererRepli)}`), repli);
      resume = { paragraphes, modele: parRepli && o.modeleRepli ? o.modeleRepli : modele, date: horodatage() };
    } catch (e) {
      resume = { erreur: (e as Error).message };
      if (o.conserverSiEchec) {
        barre?.end();
        return { ecrit: false, destination, graphiques: 0, resume: "echec", erreur: resume.erreur, statistiques };
      }
    }
    etape++;
  }

  const graphiques = o.sansGraphiques ? [] : ecrireGraphiques(specs, join(dirname(destination), "graphiques"), o.convertir, {
    debut: (g) => barre?.update(etape, g.titre),
    fin: (n) => { etape = (o.sansResume ? 0 : 1) + n; },
  });
  barre?.update(etape, basename(destination));
  writeFileSync(destination, rendreMarkdown(statistiques, { genereLe: horodatage(), resume, graphiques }));
  barre?.update(etape + 1);
  barre?.end();
  const erreur = resume && "erreur" in resume ? resume.erreur : undefined;
  return {
    ecrit: true,
    destination,
    graphiques: graphiques.length,
    resume: erreur !== undefined ? "echec" : resume ? "oui" : "non",
    ...(erreur !== undefined ? { erreur } : {}),
    statistiques,
  };
}

// ---------- ligne de commande ----------

if (import.meta.main) {
  await lancer(async () => {
    chargerEnv();
    const args = process.argv.slice(2);
    const sansResume = args.includes("--sans-resume");
    const sansGraphiques = args.includes("--sans-graphiques");
    const inconnue = args.find((a) => a.startsWith("--") && a !== "--sans-resume" && a !== "--sans-graphiques" && a !== "--sans-couleur");
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    const [source = "outils.json", sortie] = args.filter((a) => !a.startsWith("--"));
    const suivi = creerCouleurs(couleursActives(process.stderr, process.env, args.includes("--sans-couleur")));
    const paint = { filled: suivi.vert, empty: suivi.attenue, label: suivi.cyan };
    let barre: Progress | undefined;
    const r = await genererSommaire({
      source,
      ...(sortie !== undefined && { sortie }),
      sansResume,
      sansGraphiques,
      cle: process.env.OPENAI_API_KEY,
      modele: modelesDepuisEnv().principal,
      modeleRepli: modelesDepuisEnv().repli,
      progression: (total) => (barre = barreSommaire(paint)(total)),
      journal: (message) => (barre ? barre.message(message) : console.error(message)),
    });
    if (r.resume === "echec") process.exitCode = 1;
    const { statistiques: s } = r;
    console.log(`${r.destination} écrit (${s.total} outils, ${s.enrichissement.enrichis} enrichis, ${r.graphiques} graphique(s), résumé: ${r.resume === "oui" ? "oui" : "non"})`);
  });
}
