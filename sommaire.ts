// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Sommaire statistique du répertoire, écrit dans sommaire.md.
// Usage: nub sommaire.ts [--sans-resume] [outils.json] [sommaire.md]
//
// Lit outils.json (et tags.json et criteres.json, dans le même dossier) et écrit un sommaire en
// Markdown: chiffres clés, dates, catégories, statut du code source, licences, critères de
// souveraineté, forges de code, tags et fiabilité des données.
// Un résumé de 3 ou 4 paragraphes sur le répertoire et son utilité est rédigé par l'API OpenAI à
// partir de toutes les statistiques et de la liste des outils (clé OPENAI_API_KEY dans .env; modèle:
// OPENAI_MODEL). --sans-resume l'omet: le sommaire est alors calculé localement, sans appel à l'API.
// Le calcul des statistiques et le rendu sont des fonctions pures; seul le résumé utilise le réseau.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { OutilClasse } from "./classify.ts";
import { lancer } from "./cli.ts";
import {
  appelerOpenAI, chargerCriteres, chargerTags, MODELE_PAR_DEFAUT, obtenirValide, problemesMarkdown, type Tag,
} from "./enrichir.ts";
import type { Critere } from "./extract.ts";
import { lireFichier, type Metadonnees } from "./fichiers.ts";
import { horodatage } from "./temps.ts";

// ---------- vocabulaire ----------

export const SOURCES = ["libre", "partiel", "source-disponible", "proprietaire"] as const;
export const NON_ENRICHI = "non enrichi";
const NOMS_SOURCES: Record<string, string> = {
  libre: "Libre",
  partiel: "Partiellement libre (open core)",
  "source-disponible": "Code source disponible",
  proprietaire: "Propriétaire",
  [NON_ENRICHI]: "Pas encore enrichi",
};

const FORGES_CONNUES: Record<string, string> = {
  "github.com": "GitHub",
  "gitlab.com": "GitLab",
  "codeberg.org": "Codeberg",
  "framagit.org": "Framagit",
  "bitbucket.org": "Bitbucket",
  "git.sr.ht": "SourceHut",
  "sr.ht": "SourceHut",
  "sourceforge.net": "SourceForge",
};

/** Familles de licences, indicatives (classées d'après l'identifiant SPDX, de la plus forte à la plus permissive). */
const FAMILLES: [RegExp, string][] = [
  [/\b(?:AGPL|GPL)-/, "Copyleft fort (GPL, AGPL)"],
  [/\b(?:LGPL|MPL|EPL|CDDL|EUPL)-/, "Copyleft faible (LGPL, MPL, EPL, EUPL)"],
  [/\b(?:MIT|Apache|BSD|ISC|Unlicense|0BSD|Zlib|CC0)\b/, "Permissive (MIT, Apache, BSD, ISC)"],
];
const AUTRE_FAMILLE = "Autre ou non classée";

// ---------- statistiques ----------

export interface Entree {
  outils: OutilClasse[];
  tags: Tag[];
  criteres: Critere[];
  meta: Metadonnees;
}

export interface Compte {
  cle: string;
  n: number;
}

export interface DateExtreme {
  date: string;
  outils: string[];
}

export interface LigneCriteres {
  source: string;
  outils: number;
  parCritere: Record<string, number>;
  total: number;
}

export interface Statistiques {
  meta: Metadonnees;
  total: number;
  retires: string[];
  categories: { categorie: string; icone: string; outils: number; enrichis: number; libres: number; scoreMoyen: number }[];
  scores: { deux: number; trois: number; moyen: number };
  enrichissement: { enrichis: number; sansPage: string[]; avecEcart: string[]; sansDate: number };
  changements: Compte[];
  confianceClassification: Compte[];
  dates: { premieres: DateExtreme | null; dernieres: DateExtreme | null; parDate: Compte[] };
  datesEnrichissement: { premiere: DateExtreme | null; derniere: DateExtreme | null; parJour: Compte[] };
  sources: Compte[];
  licences: { spdx: Compte[]; familles: Compte[]; maison: { nom: string; url: string | null; n: number }[]; sansLicence: Compte[] };
  tags: { utilisation: (Compte & { description: string })[]; inutilises: string[]; moyenneParOutil: number; sansTag: string[]; paires: Compte[]; ajoutes: Tag[] };
  criteres: {
    definitions: { id: string; titre: string }[];
    repertoire: { parCritere: Compte[]; parSource: LigneCriteres[] };
    enrichie: { parCritere: Compte[]; parSource: LigneCriteres[]; concordants: number; confiance: Compte[] };
  };
  forges: { forge: string; hotes: string[]; outils: string[] }[];
  sansDepot: { libresOuPartiels: string[]; autres: number };
}

const compter = (valeurs: Iterable<string>): Map<string, number> => {
  const m = new Map<string, number>();
  for (const v of valeurs) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
};
const trier = (m: Map<string, number>): Compte[] =>
  [...m].map(([cle, n]) => ({ cle, n })).sort((a, b) => b.n - a.n || a.cle.localeCompare(b.cle, "fr"));
const moyenne = (nombres: number[]) => (nombres.length ? nombres.reduce((a, b) => a + b, 0) / nombres.length : 0);
const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Forge de code d'une URL de dépôt: son nom connu (GitHub, GitLab...) ou, à défaut, son nom d'hôte. */
export function forgeDe(url: string): { forge: string; hote: string } {
  let hote: string;
  try {
    hote = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return { forge: "URL invalide", hote: url };
  }
  return { forge: FORGES_CONNUES[hote] ?? hote, hote };
}

/** Famille d'une expression de licence SPDX, d'après la plus forte des licences qu'elle nomme. */
export function familleLicence(expression: string): string {
  return FAMILLES.find(([re]) => re.test(expression))?.[1] ?? AUTRE_FAMILLE;
}

/** Les outils portant la date la plus petite (« min ») ou la plus grande (« max »), à l'instant près. */
function extremes(items: { nom: string; date: string }[], sens: "min" | "max"): DateExtreme | null {
  if (!items.length) return null;
  const instants = items.map((i) => Date.parse(i.date));
  const cible = sens === "min" ? Math.min(...instants) : Math.max(...instants);
  const retenus = items.filter((_, i) => instants[i] === cible);
  return { date: retenus[0]!.date, outils: retenus.map((i) => i.nom).sort((a, b) => a.localeCompare(b, "fr")) };
}

function lignesCriteres(outils: OutilClasse[], ids: string[], criteresDe: (o: OutilClasse) => string[], sourceDe: (o: OutilClasse) => string): LigneCriteres[] {
  const lignes = new Map<string, OutilClasse[]>();
  for (const o of outils) lignes.set(sourceDe(o), [...(lignes.get(sourceDe(o)) ?? []), o]);
  const ligne = (source: string, os: OutilClasse[]): LigneCriteres => ({
    source,
    outils: os.length,
    parCritere: Object.fromEntries(ids.map((id) => [id, os.filter((o) => criteresDe(o).includes(id)).length])),
    total: os.reduce((n, o) => n + criteresDe(o).length, 0),
  });
  const ordre = [...SOURCES, NON_ENRICHI];
  return [...lignes]
    .sort((a, b) => ordre.indexOf(a[0]) - ordre.indexOf(b[0]))
    .map(([source, os]) => ligne(source, os))
    .concat(outils.length ? [ligne("Ensemble", outils)] : []);
}

export function calculerStatistiques({ outils: tous, tags, criteres, meta }: Entree): Statistiques {
  const outils = tous.filter((o) => !o.removed);
  const enrichis = outils.filter((o) => o.description_longue);
  const ids = criteres.map((c) => c.id);
  const sourceDe = (o: OutilClasse) => o.source ?? NON_ENRICHI;
  const libres = (o: OutilClasse) => o.source === "libre" || o.source === "partiel";

  // Catégories
  const categories = [...compter(outils.map((o) => o.categorie))].map(([categorie]) => {
    const os = outils.filter((o) => o.categorie === categorie);
    return {
      categorie,
      icone: os[0]!.icone,
      outils: os.length,
      enrichis: os.filter((o) => o.description_longue).length,
      libres: os.filter(libres).length,
      scoreMoyen: arrondi(moyenne(os.map((o) => o.score))),
    };
  }).sort((a, b) => b.outils - a.outils || a.categorie.localeCompare(b.categorie, "fr"));

  // Licences
  const avecLicence = enrichis.filter((o) => o.licence);
  const maison = new Map<string, { nom: string; url: string | null; n: number }>();
  for (const o of enrichis) {
    if (!o.custom_license) continue;
    const cle = `${o.custom_license}\n${o.custom_license_url ?? ""}`;
    maison.set(cle, { nom: o.custom_license, url: o.custom_license_url ?? null, n: (maison.get(cle)?.n ?? 0) + 1 });
  }
  const sansLicence = enrichis.filter((o) => !o.licence && !o.custom_license);

  // Tags
  const parTag = compter(enrichis.flatMap((o) => o.tags ?? []));
  const paires = compter(
    enrichis.flatMap((o) => {
      const ts = [...(o.tags ?? [])].sort();
      return ts.flatMap((a, i) => ts.slice(i + 1).map((b) => `${a} + ${b}`));
    }),
  );

  // Critères
  const nomsCriteres = criteres.map((c) => ({ id: c.id, titre: c.titre }));
  const parCritere = (os: OutilClasse[], de: (o: OutilClasse) => string[]) =>
    ids.map((id) => ({ cle: id, n: os.filter((o) => de(o).includes(id)).length }));
  const enrichiesCriteres = (o: OutilClasse) => o.evaluation_enrichie?.criteres ?? [];
  const avecEvaluation = enrichis.filter((o) => o.evaluation_enrichie);

  // Forges
  const parForge = new Map<string, { hotes: Set<string>; outils: string[] }>();
  for (const o of enrichis) {
    if (!o.repo) continue;
    const { forge, hote } = forgeDe(o.repo);
    const f = parForge.get(forge) ?? { hotes: new Set<string>(), outils: [] };
    f.hotes.add(hote);
    f.outils.push(o.nom);
    parForge.set(forge, f);
  }
  const sansDepot = enrichis.filter((o) => !o.repo);

  // Dates
  const dateDe = (o: OutilClasse) => ({ nom: o.nom, date: o.derniere_modification });
  const enrichiLe = enrichis.filter((o) => o.enrichi_le).map((o) => ({ nom: o.nom, date: o.enrichi_le! }));

  return {
    meta,
    total: outils.length,
    retires: tous.filter((o) => o.removed).map((o) => o.nom),
    categories,
    scores: {
      deux: outils.filter((o) => o.score === 2).length,
      trois: outils.filter((o) => o.score === 3).length,
      moyen: arrondi(moyenne(outils.map((o) => o.score))),
    },
    enrichissement: {
      enrichis: enrichis.length,
      sansPage: enrichis.filter((o) => o.page_lue === false).map((o) => o.nom),
      avecEcart: enrichis.filter((o) => o.evaluation_enrichie?.ecart).map((o) => o.nom),
      sansDate: enrichis.length - enrichiLe.length,
    },
    changements: trier(compter(outils.map((o) => o.changement ?? "aucun"))),
    confianceClassification: trier(compter(outils.map((o) => o.confiance ?? "inconnue"))),
    dates: {
      premieres: extremes(outils.map(dateDe), "min"),
      dernieres: extremes(outils.map(dateDe), "max"),
      parDate: trier(compter(outils.map((o) => o.derniere_modification))).sort((a, b) => Date.parse(b.cle) - Date.parse(a.cle)),
    },
    datesEnrichissement: {
      premiere: extremes(enrichiLe, "min"),
      derniere: extremes(enrichiLe, "max"),
      parJour: [...compter(enrichiLe.map((e) => e.date.slice(0, 10)))].map(([cle, n]) => ({ cle, n })).sort((a, b) => a.cle.localeCompare(b.cle)),
    },
    sources: trier(compter(outils.map(sourceDe))).sort((a, b) => [...SOURCES, NON_ENRICHI].indexOf(a.cle) - [...SOURCES, NON_ENRICHI].indexOf(b.cle)),
    licences: {
      spdx: trier(compter(avecLicence.map((o) => o.licence!))),
      familles: trier(compter(avecLicence.map((o) => familleLicence(o.licence!)))),
      maison: [...maison.values()].sort((a, b) => b.n - a.n || a.nom.localeCompare(b.nom, "fr")),
      sansLicence: trier(compter(sansLicence.map((o) => NOMS_SOURCES[sourceDe(o)] ?? sourceDe(o)))),
    },
    tags: {
      utilisation: tags
        .map((t) => ({ cle: t.id, n: parTag.get(t.id) ?? 0, description: t.description }))
        .sort((a, b) => b.n - a.n || a.cle.localeCompare(b.cle, "fr")),
      inutilises: tags.filter((t) => !parTag.has(t.id)).map((t) => t.id),
      moyenneParOutil: arrondi(moyenne(enrichis.map((o) => (o.tags ?? []).length))),
      sansTag: enrichis.filter((o) => !(o.tags ?? []).length).map((o) => o.nom),
      paires: trier(paires).filter((p) => p.n >= 2).slice(0, 10),
      ajoutes: tags.filter((t) => t.justification),
    },
    criteres: {
      definitions: nomsCriteres,
      repertoire: {
        parCritere: parCritere(outils, (o) => o.criteres ?? []),
        parSource: lignesCriteres(outils, ids, (o) => o.criteres ?? [], sourceDe),
      },
      enrichie: {
        parCritere: parCritere(avecEvaluation, enrichiesCriteres),
        parSource: lignesCriteres(avecEvaluation, ids, enrichiesCriteres, sourceDe),
        concordants: avecEvaluation.filter((o) => !o.evaluation_enrichie?.ecart).length,
        confiance: trier(compter(avecEvaluation.map((o) => o.evaluation_enrichie!.confiance))),
      },
    },
    forges: [...parForge]
      .map(([forge, f]) => ({ forge, hotes: [...f.hotes].sort(), outils: f.outils.sort((a, b) => a.localeCompare(b, "fr")) }))
      .sort((a, b) => b.outils.length - a.outils.length || a.forge.localeCompare(b.forge, "fr")),
    sansDepot: {
      libresOuPartiels: sansDepot.filter(libres).map((o) => o.nom),
      autres: sansDepot.filter((o) => !libres(o)).length,
    },
  };
}

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
}

function sectionResume(resume: ResumeIA | undefined): string {
  if (!resume) return "";
  if ("erreur" in resume) {
    return `## Résumé\n\n*Le résumé n'a pas pu être rédigé (${resume.erreur}). Relancer \`nub run sommaire\` pour le produire.*\n\n`;
  }
  return `## Résumé\n\n${resume.paragraphes.join("\n\n")}\n\n*Résumé rédigé par un modèle d'IA (${resume.modele}) le ${resume.date}, à partir des statistiques ci-dessous et de la liste des outils. À relire avant de le diffuser.*\n\n`;
}

export function rendreMarkdown(s: Statistiques, { genereLe, resume }: OptionsRendu): string {
  const ens = s.enrichissement.enrichis;
  const aucunEnrichi = "*Aucun outil n'est enrichi pour l'instant.*";
  const parts: string[] = [];

  parts.push(`# Sommaire du répertoire d'outils favorisant la souveraineté numérique

Généré le ${genereLe} par \`sommaire.ts\` d'après \`outils.json\` (données sous licence ${s.meta.data_license}, créées le ${s.meta.created_at} et modifiées pour la dernière fois le ${s.meta.updated_at}). Ne pas modifier ce fichier à la main : relancer \`nub run sommaire\`.

Sauf indication contraire, les pourcentages sont calculés sur les ${s.total} outils du répertoire. Les statistiques sur le statut du code source, les licences, les forges et les tags ne portent que sur les ${ens} outils déjà enrichis.

`);
  parts.push(sectionResume(resume));

  // Chiffres clés
  const libres = s.sources.filter((c) => c.cle === "libre" || c.cle === "partiel").reduce((n, c) => n + c.n, 0);
  parts.push(`## Chiffres clés

- **${pluriel(s.total, "outil")}** répartis en **${pluriel(s.categories.length, "catégorie")}**${s.retires.length ? `, et ${pluriel(s.retires.length, "outil retiré", "outils retirés")} du répertoire (${liste(s.retires)})` : ""}.
- **${pluriel(s.scores.trois, "outil")} à 3 étoiles** et **${s.scores.deux} à 2 étoiles** (moyenne : ${decimal(s.scores.moyen)} étoiles).
- **${pluriel(ens, "outil enrichi", "outils enrichis")}** sur ${s.total} (${pourcent(ens, s.total)}).
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
${de.parJour.length ? `\n${tableau(["Jour", "Outils enrichis"], de.parJour.map((c) => [c.cle, c.n]))}\n` : ""}` : aucunEnrichi}
`);

  // Catégories
  parts.push(`## Catégories

${tableau(
    ["Catégorie", "Outils", "% du répertoire", "Enrichis", "Libres ou partiels", "Score moyen"],
    s.categories.map((c) => [`${c.icone} ${c.categorie}`, c.outils, pourcent(c.outils, s.total), c.enrichis, c.libres, decimal(c.scoreMoyen)]),
  )}
`);

  // Source
  parts.push(`## Statut du code source

${tableau(
    ["Statut", "Outils", "% du répertoire", ens ? "% des outils enrichis" : ""].filter(Boolean),
    s.sources.map((c) => [NOMS_SOURCES[c.cle] ?? c.cle, c.n, pourcent(c.n, s.total), ...(ens ? [c.cle === NON_ENRICHI ? "" : pourcent(c.n, ens)] : [])]),
  )}
`);

  // Licences
  const l = s.licences;
  parts.push(`## Licences

${ens ? `${tableau(["Licence (SPDX)", "Outils", "% des outils enrichis"], l.spdx.map((c) => [c.cle, c.n, pourcent(c.n, ens)]))}

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

${tableau(["Critère", "Outils", "% du répertoire"], c.repertoire.parCritere.map((x) => [titre(x.cle), x.n, pourcent(x.n, s.total)]))}

### Critères satisfaits par statut du code source (répertoire)

${matrice(c.repertoire.parSource)}

### Évaluation enrichie (second avis)

${c.enrichie.parSource.length ? `${tableau(["Critère", "Outils", "% des évaluations"], c.enrichie.parCritere.map((x) => [titre(x.cle), x.n, pourcent(x.n, c.enrichie.parSource.at(-1)!.outils)]))}

${matrice(c.enrichie.parSource)}

- **${c.enrichie.concordants}** évaluation(s) sur ${c.enrichie.parSource.at(-1)!.outils} concordent avec le répertoire (${pourcent(c.enrichie.concordants, c.enrichie.parSource.at(-1)!.outils)}) ; **${s.enrichissement.avecEcart.length}** s'en écartent${s.enrichissement.avecEcart.length ? ` (${liste(s.enrichissement.avecEcart, 10)})` : ""}.
- Confiance de l'évaluation enrichie : ${c.enrichie.confiance.map((x) => `${x.cle} ${x.n}`).join(", ") || "aucune"}.` : aucunEnrichi}
`);

  // Forges
  parts.push(`## Forges de code

${s.forges.length ? `${tableau(["Forge", "Outils", "Hôte(s)", "Outils concernés"], s.forges.map((f) => [f.forge, f.outils.length, f.hotes.join(", "), liste(f.outils, 6)]))}

${s.sansDepot.libresOuPartiels.length ? `- **Logiciels libres ou partiels sans dépôt connu** : ${liste(s.sansDepot.libresOuPartiels, 10)}.\n` : ""}- Autres outils enrichis sans dépôt (propriétaires ou inconnus) : ${s.sansDepot.autres}.` : ens ? "*Aucun dépôt de code n'est connu pour les outils enrichis.*" : aucunEnrichi}
`);

  // Tags
  const tg = s.tags;
  parts.push(`## Tags

${ens ? `- Moyenne de **${decimal(tg.moyenneParOutil)} ${tg.moyenneParOutil >= 2 ? "tags" : "tag"} par outil enrichi**${tg.sansTag.length ? `; sans tag : ${liste(tg.sansTag)}` : ""}.
- ${pluriel(tg.utilisation.filter((t) => t.n).length, "tag utilisé", "tags utilisés")} sur ${tg.utilisation.length} du vocabulaire${tg.inutilises.length ? `; **non utilisés** : ${liste(tg.inutilises, 12)}` : ""}.

${tableau(["Tag", "Description", "Outils", "% des outils enrichis"], tg.utilisation.filter((t) => t.n).map((t) => [t.cle, t.description, t.n, pourcent(t.n, ens)]))}
${tg.paires.length ? `\n**Tags les plus souvent associés** :\n\n${tableau(["Paire de tags", "Outils"], tg.paires.map((p) => [p.cle, p.n]))}\n` : ""}` : aucunEnrichi}
${tg.ajoutes.length ? `\n**Tags ajoutés après le vocabulaire initial** :\n\n${tableau(["Tag", "Description", "Proposé pour", "Justification"], tg.ajoutes.map((t) => [t.id, t.description, t.propose_pour ?? "", t.justification ?? ""]))}\n` : ""}
`);

  // Fiabilité
  parts.push(`## Fiabilité et suivi

- Confiance de la déduction des critères : ${s.confianceClassification.map((x) => `${x.cle} ${x.n}`).join(", ")}.
${ens ? `- Outils enrichis **sans page lisible** (résultat moins fiable) : ${s.enrichissement.sansPage.length ? `${s.enrichissement.sansPage.length} (${liste(s.enrichissement.sansPage, 10)})` : "aucun"}.
- Outils restant à enrichir : ${s.total - ens}.` : `- Outils restant à enrichir : ${s.total}.`}
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
      categorie: o.categorie,
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

/** Rédige le résumé, avec une seconde tentative (et la raison du rejet) si la réponse est invalide. */
export function produireResume(charge: ChargeResume, generer: GenerateurResume, rejet: (raison: string) => void = () => {}): Promise<string[]> {
  return obtenirValide((rappel) => generer(charge, rappel), validerResume, rejet);
}

// ---------- ligne de commande ----------

if (import.meta.main) {
  await lancer(async () => {
    const args = process.argv.slice(2);
    const sansResume = args.includes("--sans-resume");
    const inconnue = args.find((a) => a.startsWith("--") && a !== "--sans-resume");
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    const [source = "outils.json", sortie] = args.filter((a) => !a.startsWith("--"));
    const dossier = dirname(source);
    const cle = process.env.OPENAI_API_KEY;
    if (!sansResume && !cle) throw new Error("OPENAI_API_KEY absente (voir .env.example); utiliser --sans-resume pour omettre le résumé");

    const lu = lireFichier<OutilClasse>(source, "outils");
    const statistiques = calculerStatistiques({
      outils: lu.donnees,
      tags: chargerTags(join(dossier, "tags.json")),
      criteres: chargerCriteres(join(dossier, "criteres.json")),
      meta: lu.meta,
    });

    let resume: ResumeIA = null;
    if (!sansResume) {
      const modele = process.env.OPENAI_MODEL || MODELE_PAR_DEFAUT;
      try {
        const paragraphes = await produireResume(chargeResume(statistiques, lu.donnees), generateurResumeOpenAI(cle!, modele), (raison) =>
          console.error(`Résumé rejeté (${raison}), nouvel essai`),
        );
        resume = { paragraphes, modele, date: horodatage() };
      } catch (e) {
        resume = { erreur: (e as Error).message };
        process.exitCode = 1;
      }
    }

    const destination = sortie ?? join(dossier, "sommaire.md");
    writeFileSync(destination, rendreMarkdown(statistiques, { genereLe: horodatage(), resume }));
    console.log(`${destination} écrit (${statistiques.total} outils, ${statistiques.enrichissement.enrichis} enrichis, résumé: ${resume && "paragraphes" in resume ? "oui" : "non"})`);
  });
}
