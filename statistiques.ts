// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Statistiques du répertoire: calcul pur, sans entrée-sortie, à partir des outils, des tags et des
// critères. Utilisé par le sommaire (sommaire.ts) et par les graphiques (graphiques.ts).
import type { OutilClasse } from "./classify.ts";
import { abandonne, type Tag } from "./enrichir.ts";
import type { Categorie } from "./categories.ts";
import type { Critere } from "./extract.ts";
import type { Metadonnees } from "./fichiers.ts";
import { abandonneOpenHub } from "./openhub.ts";
import type { Source } from "./sources.ts";

// ---------- vocabulaire ----------

export const SOURCES = ["libre", "partiel", "source-disponible", "proprietaire"] as const;
export const NON_ENRICHI = "non enrichi";
export const NOMS_SOURCES: Record<string, string> = {
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
  /** categories.json: nom et icône des catégories; un identifiant inconnu est affiché tel quel, sans icône. */
  categories: Categorie[];
  tags: Tag[];
  criteres: Critere[];
  meta: Metadonnees;
  /** sources.json: pour nommer les sources des outils; une source inconnue est affichée par son identifiant. */
  sources?: Source[];
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

/** Nombre d'outils par verdict d'IA (criteres_confirmes) pour un critère. */
export interface Verdicts {
  confirme: number;
  infirme: number;
  indetermine: number;
}
export interface LigneVerdicts {
  source: string;
  outils: number;
  parCritere: Record<string, Verdicts>;
}

export interface Statistiques {
  meta: Metadonnees;
  total: number;
  retires: string[];
  categories: { id: string; nom: string; icone: string; description?: string; outils: number; enrichis: number; libres: number; scoreMoyen: number }[];
  /** Nombre d'outils par catégorie et par statut du code source (pour les graphiques). */
  categoriesSources: { categorie: string; nom: string; source: string; n: number }[];
  scores: { deux: number; trois: number; moyen: number };
  enrichissement: { enrichis: number; avecEcart: string[]; sansDate: number; /** Outils non enrichis abandonnés après des échecs consécutifs (voir enrichir.ts). */ abandonnes: string[] };
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
    /** Critères vérifiés par une IA d'après la page de l'outil, citation à l'appui (criteres_confirmes). */
    confirmes: {
      outils: number;
      /** Outils enrichis sans criteres_confirmes. */
      sansVerdict: string[];
      modeles: Compte[];
      parSource: LigneVerdicts[];
      /** Outils dont le nombre de critères confirmés égale le nombre d'étoiles. */
      autantQueEtoiles: number;
      /** Outils dont les critères confirmés sont exactement ceux de l'évaluation enrichie. */
      identiquesEvaluation: number;
    };
  };
  forges: { forge: string; hotes: string[]; outils: string[] }[];
  sansDepot: { libresOuPartiels: string[]; autres: number };
  /** Outils par source (source_repertoire_id), dans l'ordre décroissant. */
  provenance: { id: string; nom: string; outils: number; enrichis: number }[];
  /** Outils dont le score est estimé (source sans étoiles), par nom. */
  scoresEstimes: string[];
  /** Outils qui déclarent des alternatives (alternative_a). */
  alternatives: { nom: string; alternatives: string[] }[];
  /** Données Open Hub des outils libres enrichis. */
  openhub: {
    completes: { nom: string; id: string; activite: string | null; contributeurs12: number | null; commits12: number | null; licences: string[] }[];
    /** Outils libres enrichis sans données Open Hub, pas encore abandonnés. */
    restants: string[];
    abandonnes: string[];
    activite: Compte[];
  };
}

const compter = (valeurs: Iterable<string>): Map<string, number> => {
  const m = new Map<string, number>();
  for (const v of valeurs) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
};
const trier = (m: Map<string, number>): Compte[] =>
  [...m].map(([cle, n]) => ({ cle, n })).sort((a, b) => b.n - a.n || a.cle.localeCompare(b.cle, "fr"));
const moyenne = (nombres: number[]) => (nombres.length ? nombres.reduce((a, b) => a + b, 0) / nombres.length : 0);
export const arrondi = (n: number) => Math.round(n * 100) / 100;

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

function lignesVerdicts(outils: OutilClasse[], ids: string[], sourceDe: (o: OutilClasse) => string): LigneVerdicts[] {
  const verdict = (o: OutilClasse, id: string): keyof Verdicts => {
    const c = o.criteres_confirmes!;
    return c.criteres.includes(id as never) ? "confirme" : id in c.infirmes ? "infirme" : "indetermine";
  };
  const ligne = (source: string, os: OutilClasse[]): LigneVerdicts => ({
    source,
    outils: os.length,
    parCritere: Object.fromEntries(ids.map((id) => {
      const v: Verdicts = { confirme: 0, infirme: 0, indetermine: 0 };
      for (const o of os) v[verdict(o, id)]++;
      return [id, v];
    })),
  });
  const groupes = new Map<string, OutilClasse[]>();
  for (const o of outils) groupes.set(sourceDe(o), [...(groupes.get(sourceDe(o)) ?? []), o]);
  const ordre = [...SOURCES, NON_ENRICHI];
  return [...groupes]
    .sort((a, b) => ordre.indexOf(a[0]) - ordre.indexOf(b[0]))
    .map(([source, os]) => ligne(source, os))
    .concat(outils.length ? [ligne("Ensemble", outils)] : []);
}

export function calculerStatistiques({ outils: tous, categories: definitionsCategories, tags, criteres, meta, sources: definitionsSources = [] }: Entree): Statistiques {
  const categorieDe = (id: string): Categorie => definitionsCategories.find((c) => c.id === id) ?? { id, nom: id, icone: "" };
  const outils = tous.filter((o) => !o.removed);
  const enrichis = outils.filter((o) => o.description_longue);
  const ids = criteres.map((c) => c.id);
  const sourceDe = (o: OutilClasse) => o.source ?? NON_ENRICHI;
  const libres = (o: OutilClasse) => o.source === "libre" || o.source === "partiel";

  // Catégories
  const categories = [...compter(outils.map((o) => o.categorie))].map(([id]) => {
    const os = outils.filter((o) => o.categorie === id);
    const def = categorieDe(id);
    return {
      id,
      nom: def.nom,
      icone: def.icone,
      ...(def.description !== undefined && { description: def.description }),
      outils: os.length,
      enrichis: os.filter((o) => o.description_longue).length,
      libres: os.filter(libres).length,
      scoreMoyen: arrondi(moyenne(os.map((o) => o.score))),
    };
  }).sort((a, b) => b.outils - a.outils || a.nom.localeCompare(b.nom, "fr"));

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
  const avecVerdict = enrichis.filter((o) => o.criteres_confirmes);
  const memesEnsembles = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

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
    categoriesSources: [...compter(outils.map((o) => `${o.categorie}\u0000${sourceDe(o)}`))].map(([cle, n]) => {
      const [categorie, source] = cle.split("\u0000") as [string, string];
      return { categorie, nom: categorieDe(categorie).nom, source, n };
    }),
    scores: {
      deux: outils.filter((o) => o.score === 2).length,
      trois: outils.filter((o) => o.score === 3).length,
      moyen: arrondi(moyenne(outils.map((o) => o.score))),
    },
    enrichissement: {
      enrichis: enrichis.length,
      avecEcart: enrichis.filter((o) => o.evaluation_enrichie?.ecart).map((o) => o.nom),
      sansDate: enrichis.length - enrichiLe.length,
      abandonnes: outils.filter((o) => !o.description_longue && abandonne(o)).map((o) => o.nom),
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
      confirmes: {
        outils: avecVerdict.length,
        sansVerdict: enrichis.filter((o) => !o.criteres_confirmes).map((o) => o.nom),
        modeles: trier(compter(avecVerdict.map((o) => o.criteres_confirmes!.modele))),
        parSource: lignesVerdicts(avecVerdict, ids, sourceDe),
        autantQueEtoiles: avecVerdict.filter((o) => o.criteres_confirmes!.criteres.length === o.score).length,
        identiquesEvaluation: avecVerdict.filter((o) => memesEnsembles(o.criteres_confirmes!.criteres, enrichiesCriteres(o))).length,
      },
    },
    forges: [...parForge]
      .map(([forge, f]) => ({ forge, hotes: [...f.hotes].sort(), outils: f.outils.sort((a, b) => a.localeCompare(b, "fr")) }))
      .sort((a, b) => b.outils.length - a.outils.length || a.forge.localeCompare(b.forge, "fr")),
    sansDepot: {
      libresOuPartiels: sansDepot.filter(libres).map((o) => o.nom),
      autres: sansDepot.filter((o) => !libres(o)).length,
    },
    provenance: [...compter(outils.map((o) => o.source_repertoire_id))].map(([id, n]) => ({
      id,
      nom: definitionsSources.find((s) => s.id === id)?.nom ?? id,
      outils: n,
      enrichis: outils.filter((o) => o.source_repertoire_id === id && o.description_longue).length,
    })).sort((a, b) => b.outils - a.outils || a.id.localeCompare(b.id, "fr")),
    scoresEstimes: outils.filter((o) => o.score_estime).map((o) => o.nom),
    alternatives: outils.filter((o) => o.alternative_a?.length).map((o) => ({ nom: o.nom, alternatives: o.alternative_a! })),
    openhub: {
      completes: enrichis.filter((o) => o.openhub).map((o) => ({ nom: o.nom, id: o.openhub_id ?? "", activite: o.openhub!.activite, contributeurs12: o.openhub!.contributeurs_12_mois, commits12: o.openhub!.commits_12_mois, licences: o.openhub!.licences }))
        .sort((a, b) => (b.contributeurs12 ?? -1) - (a.contributeurs12 ?? -1) || a.nom.localeCompare(b.nom, "fr")),
      restants: enrichis.filter((o) => !o.openhub && o.source !== "proprietaire" && !abandonneOpenHub(o)).map((o) => o.nom),
      abandonnes: enrichis.filter((o) => abandonneOpenHub(o)).map((o) => o.nom),
      activite: trier(compter(enrichis.filter((o) => o.openhub).map((o) => o.openhub!.activite ?? "inconnue"))),
    },
  };
}
