// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Graphiques du répertoire: des spécifications Vega-Lite construites à partir des statistiques (calcul pur, sans
// disque ni programme externe). Les scripts les convertissent en SVG pour le sommaire (packages/scripts/graphiques.ts,
// avec vl-convert); le site les compile lui-même pour la page « Statistiques ».
//
// Les données sont toujours incluses dans la spécification (`data.values`): aucun fichier externe,
// aucune URL. Les nombres sont écrits à la française (virgule décimale).
import type { TopLevelSpec } from "vega-lite";
import { familleLicence, NOMS_SOURCES, NON_ENRICHI, SOURCES, type LigneCriteres, type Statistiques, type Verdicts } from "./statistiques.ts";

// ---------- apparence ----------

const SCHEMA = "https://vega.github.io/schema/vega-lite/v6.json";

/** Palette accessible (Okabe-Ito); un statut garde la même couleur dans tous les graphiques. */
const COULEURS_STATUTS: Record<string, string> = {
  libre: "#009E73",
  partiel: "#56B4E9",
  "source-disponible": "#E69F00",
  proprietaire: "#CC79A7",
  [NON_ENRICHI]: "#BBBBBB",
};
const NOMS_STATUTS: Record<string, string> = {
  libre: "Libre",
  partiel: "Partiellement libre",
  "source-disponible": "Code source disponible",
  proprietaire: "Propriétaire",
  [NON_ENRICHI]: "Pas encore enrichi",
};
const NOMS_CRITERES: Record<string, string> = { donnees: "Données", controle: "Contrôle", dependance: "Dépendance" };
const ORDRE_STATUTS = [...SOURCES, NON_ENRICHI];
const COULEURS_FAMILLES = ["#D55E00", "#0072B2", "#C9A400", "#999999"];
const BLEU = "#0072B2";

const nomStatut = (cle: string) => NOMS_STATUTS[cle] ?? NOMS_SOURCES[cle] ?? cle;
const echelleStatuts = (cles: string[]) => ({
  domain: cles.map(nomStatut),
  range: cles.map((c) => COULEURS_STATUTS[c] ?? "#999999"),
});
const fr = (n: number, decimales = 1) => n.toFixed(decimales).replace(".", ",");
const pct = (n: number, base: number) => (base ? (n * 100) / base : 0);

const CONFIG = {
  font: "Liberation Sans, Helvetica, Arial, sans-serif",
  title: { fontSize: 16, fontWeight: "bold", anchor: "start", subtitleFontSize: 12, subtitleColor: "#555555", offset: 10 },
  axis: { labelFontSize: 12, titleFontSize: 12, titleFontWeight: "normal", gridColor: "#E6E6E6", domainColor: "#888888", tickColor: "#888888" },
  legend: { labelFontSize: 12, titleFontSize: 12, orient: "bottom", columns: 3, symbolType: "square", labelLimit: 420 },
  view: { stroke: null },
};

function base(titre: string, sousTitre: string, description: string) {
  return {
    $schema: SCHEMA,
    background: "white",
    description,
    title: { text: titre, subtitle: sousTitre },
    config: CONFIG,
  } as const;
}

/** Barres horizontales avec le nombre au bout de chaque barre. */
function barres(valeurs: Record<string, unknown>[], champ: { y: string; x: string }, ordre: string[], largeur = 520) {
  return {
    data: { values: valeurs },
    width: largeur,
    height: { step: 24 },
    encoding: { y: { field: champ.y, type: "nominal", sort: ordre, title: null, axis: { labelLimit: 260 } } },
    layer: [
      {
        mark: { type: "bar", color: BLEU, cornerRadiusEnd: 2 },
        encoding: { x: { field: champ.x, type: "quantitative", title: "Outils", axis: { tickMinStep: 1, format: "d" } } },
      },
      {
        mark: { type: "text", align: "left", dx: 4, fontSize: 12 },
        encoding: { x: { field: champ.x, type: "quantitative" }, text: { field: champ.x, type: "nominal" } },
      },
    ],
  };
}

// ---------- les graphiques ----------

export interface Graphique {
  id: string;
  titre: string;
  /** Texte alternatif de l'image dans le sommaire. */
  description: string;
  spec: TopLevelSpec;
}

/** Les identifiants de tous les graphiques possibles (pour nettoyer les fichiers périmés). */
export const IDS_GRAPHIQUES = [
  "statut-code-source", "categories-statut", "criteres-repertoire-enrichie", "criteres-par-statut", "criteres-verdicts",
  "licences", "forges", "tags", "enrichissement-jours",
] as const;

const TAILLE_MAX_TAGS = 15;

function graphiqueStatut(s: Statistiques): Graphique {
  const valeurs = s.sources.map((c) => ({ statut: nomStatut(c.cle), n: c.n, etiquette: `${c.n} (${fr(pct(c.n, s.total))} %)` }));
  const description = `Diagramme à barres : nombre d'outils par statut du code source (${valeurs.map((v) => `${v.statut} ${v.n}`).join(", ")}).`;
  return {
    id: "statut-code-source",
    titre: "Statut du code source",
    description,
    spec: {
      ...base("Statut du code source", `${s.total} outils du répertoire`, description),
      data: { values: valeurs },
      width: 520,
      height: { step: 24 },
      encoding: { y: { field: "statut", type: "nominal", sort: valeurs.map((v) => v.statut), title: null, axis: { labelLimit: 260 } } },
      layer: [
        { mark: { type: "bar", cornerRadiusEnd: 2 }, encoding: { x: { field: "n", type: "quantitative", title: "Outils", axis: { tickMinStep: 1, format: "d" } }, color: { field: "statut", type: "nominal", legend: null, scale: echelleStatuts(s.sources.map((c) => c.cle)) } } },
        { mark: { type: "text", align: "left", dx: 4, fontSize: 12 }, encoding: { x: { field: "n", type: "quantitative" }, text: { field: "etiquette", type: "nominal" } } },
      ],
    } as TopLevelSpec,
  };
}

function graphiqueCategories(s: Statistiques): Graphique {
  const statuts = ORDRE_STATUTS.filter((c) => s.categoriesSources.some((r) => r.source === c));
  const categories = s.categories.map((c) => c.nom);
  const valeurs = s.categoriesSources.map((r) => ({ categorie: r.nom, statut: nomStatut(r.source), n: r.n, ordre: ORDRE_STATUTS.indexOf(r.source) }));
  const description = `Diagramme à barres empilées : nombre d'outils par catégorie (${s.categories.length} catégories), réparti selon le statut du code source.`;
  return {
    id: "categories-statut",
    titre: "Outils par catégorie et par statut du code source",
    description,
    spec: {
      ...base("Outils par catégorie", "Répartition selon le statut du code source", description),
      data: { values: valeurs },
      width: 520,
      height: { step: 22 },
      mark: { type: "bar", cornerRadiusEnd: 2 },
      encoding: {
        y: { field: "categorie", type: "nominal", sort: categories, title: null, axis: { labelLimit: 300 } },
        x: { field: "n", type: "quantitative", title: "Outils", axis: { tickMinStep: 1, format: "d" } },
        color: { field: "statut", type: "nominal", title: "Statut du code source", scale: echelleStatuts(statuts), sort: statuts.map(nomStatut) },
        order: { field: "ordre", type: "quantitative" },
        tooltip: [{ field: "categorie" }, { field: "statut" }, { field: "n", title: "Outils" }],
      },
    } as TopLevelSpec,
  };
}

function graphiqueCriteres(s: Statistiques): Graphique {
  const titre = (id: string) => NOMS_CRITERES[id] ?? s.criteres.definitions.find((d) => d.id === id)?.titre ?? id;
  const totalRepertoire = s.criteres.repertoire.parSource.at(-1)?.outils ?? s.total;
  const totalEnrichie = s.criteres.enrichie.parSource.at(-1)?.outils ?? 0;
  const ligne = (evaluation: string, cle: string, n: number, base: number) => ({ critere: titre(cle), evaluation, pct: pct(n, base), etiquette: `${fr(pct(n, base))} % (${n})` });
  const valeurs = [
    ...s.criteres.repertoire.parCritere.map((c) => ligne("Répertoire (déduit)", c.cle, c.n, totalRepertoire)),
    ...(totalEnrichie ? s.criteres.enrichie.parCritere.map((c) => ligne("Évaluation enrichie", c.cle, c.n, totalEnrichie)) : []),
  ];
  const description = `Diagramme à barres groupées : part des outils qui satisfont chacun des trois critères de souveraineté, selon le répertoire (déduit, ${totalRepertoire} outils)${totalEnrichie ? ` et selon l'évaluation enrichie (${totalEnrichie} outils)` : ""}.`;
  return {
    id: "criteres-repertoire-enrichie",
    titre: "Critères de souveraineté: répertoire et évaluation enrichie",
    description,
    spec: {
      ...base("Critères de souveraineté satisfaits", "Part des outils, selon le répertoire (déduit) et le second avis enrichi", description),
      data: { values: valeurs },
      width: 480,
      height: { step: 18 },
      encoding: {
        y: { field: "critere", type: "nominal", sort: s.criteres.definitions.map((d) => titre(d.id)), title: null, axis: { labelLimit: 200 } },
        yOffset: { field: "evaluation", type: "nominal", sort: ["Répertoire (déduit)", "Évaluation enrichie"] },
      },
      layer: [
        {
          mark: { type: "bar", cornerRadiusEnd: 2 },
          encoding: {
            x: { field: "pct", type: "quantitative", title: "% des outils", scale: { domain: [0, 100] }, axis: { values: [0, 25, 50, 75, 100] } },
            color: { field: "evaluation", type: "nominal", title: null, scale: { domain: ["Répertoire (déduit)", "Évaluation enrichie"], range: ["#6C6C6C", BLEU] } },
          },
        },
        { mark: { type: "text", align: "left", dx: 4, fontSize: 11 }, encoding: { x: { field: "pct", type: "quantitative" }, text: { field: "etiquette", type: "nominal" } } },
      ],
    } as TopLevelSpec,
  };
}

function graphiqueCriteresParStatut(s: Statistiques): Graphique {
  const titre = (id: string) => NOMS_CRITERES[id] ?? id;
  const ids = s.criteres.definitions.map((d) => d.id);
  const lignes = (evaluation: string, parSource: LigneCriteres[]) =>
    parSource
      .filter((l) => l.source !== "Ensemble")
      .flatMap((l) => ids.map((id) => ({ evaluation, statut: nomStatut(l.source), critere: titre(id), pct: pct(l.parCritere[id] ?? 0, l.outils), etiquette: `${l.parCritere[id] ?? 0}/${l.outils}` })));
  const valeurs = [...lignes("Répertoire (déduit)", s.criteres.repertoire.parSource), ...lignes("Évaluation enrichie", s.criteres.enrichie.parSource)];
  const statuts = ORDRE_STATUTS.filter((c) => s.criteres.repertoire.parSource.some((l) => l.source === c)).map(nomStatut);
  const description = "Carte de chaleur : pour chaque statut du code source, part des outils qui satisfont chacun des trois critères, selon le répertoire (déduit) et selon l'évaluation enrichie.";
  return {
    id: "criteres-par-statut",
    titre: "Critères satisfaits selon le statut du code source",
    description,
    spec: {
      ...base("Critères satisfaits par statut du code source", "Part des outils de chaque statut (nombre d'outils sur total)", description),
      data: { values: valeurs },
      facet: { column: { field: "evaluation", type: "nominal", title: null, sort: ["Répertoire (déduit)", "Évaluation enrichie"], header: { labelFontSize: 13, labelFontWeight: "bold" } } },
      spec: {
        width: 230,
        height: { step: 34 },
        encoding: {
          x: { field: "critere", type: "nominal", sort: ids.map(titre), title: null, axis: { labelAngle: 0, orient: "top" } },
          y: { field: "statut", type: "nominal", sort: statuts, title: null, axis: { labelLimit: 200 } },
        },
        layer: [
          { mark: "rect", encoding: { color: { field: "pct", type: "quantitative", title: "% des outils", scale: { domain: [0, 100], scheme: "blues" }, legend: { values: [0, 25, 50, 75, 100], gradientLength: 200 } } } },
          { mark: { type: "text", fontSize: 12 }, encoding: { text: { field: "etiquette", type: "nominal" }, color: { condition: { test: "datum.pct > 55", value: "white" }, value: "black" } } },
        ],
      },
    } as TopLevelSpec,
  };
}

const VERDICTS: { cle: keyof Verdicts; nom: string; couleur: string }[] = [
  { cle: "confirme", nom: "Confirmé", couleur: "#009E73" },
  { cle: "infirme", nom: "Infirmé", couleur: "#D55E00" },
  { cle: "indetermine", nom: "Indéterminé", couleur: "#BBBBBB" },
];

function graphiqueVerdicts(s: Statistiques): Graphique | null {
  const c = s.criteres.confirmes;
  if (!c.outils) return null;
  const titre = (id: string) => NOMS_CRITERES[id] ?? id;
  const ids = s.criteres.definitions.map((d) => d.id);
  const lignes = c.parSource.filter((l) => l.source !== "Ensemble");
  const valeurs = lignes.flatMap((l) =>
    ids.flatMap((id) => VERDICTS.map((v, rang) => ({ statut: nomStatut(l.source), critere: titre(id), verdict: v.nom, rang, n: l.parCritere[id]![v.cle], pct: pct(l.parCritere[id]![v.cle], l.outils), outils: l.outils }))),
  );
  const statuts = ORDRE_STATUTS.filter((k) => lignes.some((l) => l.source === k)).map(nomStatut);
  const description = `Barres empilées : pour chaque critère et chaque statut du code source, part des outils vérifiés dont le critère est confirmé, infirmé ou indéterminé d'après la page de l'outil (${c.outils} outils vérifiés).`;
  return {
    id: "criteres-verdicts",
    titre: "Critères vérifiés d'après la page de l'outil",
    description,
    spec: {
      ...base("Critères vérifiés d'après la page de l'outil", `${c.outils} outils vérifiés par IA, citation à l'appui : confirmé, infirmé ou indéterminé, par statut du code source`, description),
      data: { values: valeurs },
      facet: { column: { field: "critere", type: "nominal", title: null, sort: ids.map(titre), header: { labelFontSize: 13, labelFontWeight: "bold" } } },
      spec: {
        width: 200,
        height: { step: 26 },
        mark: { type: "bar" },
        encoding: {
          y: { field: "statut", type: "nominal", sort: statuts, title: null, axis: { labelLimit: 200 } },
          x: { field: "pct", type: "quantitative", title: "% des outils vérifiés du statut", scale: { domain: [0, 100] }, axis: { format: "d" } },
          color: { field: "verdict", type: "nominal", title: null, sort: VERDICTS.map((v) => v.nom), scale: { domain: VERDICTS.map((v) => v.nom), range: VERDICTS.map((v) => v.couleur) } },
          order: { field: "rang", type: "quantitative" },
          tooltip: [{ field: "statut" }, { field: "verdict" }, { field: "n", title: "Outils" }, { field: "outils", title: "Outils du statut" }],
        },
      },
    } as TopLevelSpec,
  };
}

function graphiqueLicences(s: Statistiques): Graphique | null {
  if (!s.licences.spdx.length) return null;
  const valeurs = s.licences.spdx.map((c) => ({ licence: c.cle, n: c.n, famille: familleLicence(c.cle) }));
  const familles = [...new Set(valeurs.map((v) => v.famille))];
  const description = `Diagramme à barres : nombre d'outils par licence SPDX (${valeurs.length} licences), colorées selon leur famille (${familles.join(", ")}).`;
  return {
    id: "licences",
    titre: "Licences des logiciels",
    description,
    spec: {
      ...base("Licences des logiciels libres et partiellement libres", `${valeurs.reduce((n, v) => n + v.n, 0)} outils avec une licence SPDX, classés par famille (indicatif)`, description),
      data: { values: valeurs },
      width: 480,
      height: { step: 24 },
      encoding: { y: { field: "licence", type: "nominal", sort: valeurs.map((v) => v.licence), title: null } },
      layer: [
        { mark: { type: "bar", cornerRadiusEnd: 2 }, encoding: { x: { field: "n", type: "quantitative", title: "Outils", axis: { tickMinStep: 1, format: "d" } }, color: { field: "famille", type: "nominal", title: "Famille", legend: { columns: 1 }, scale: { domain: familles, range: COULEURS_FAMILLES.slice(0, familles.length) } } } },
        { mark: { type: "text", align: "left", dx: 4, fontSize: 12 }, encoding: { x: { field: "n", type: "quantitative" }, text: { field: "n", type: "nominal" } } },
      ],
    } as TopLevelSpec,
  };
}

function graphiqueForges(s: Statistiques): Graphique | null {
  if (!s.forges.length) return null;
  const valeurs = s.forges.map((f) => ({ forge: f.forge, n: f.outils.length }));
  const description = `Diagramme à barres : nombre d'outils par forge de code (${valeurs.map((v) => `${v.forge} ${v.n}`).join(", ")}).`;
  return {
    id: "forges",
    titre: "Forges de code",
    description,
    spec: {
      ...base("Forges de code", `${valeurs.reduce((n, v) => n + v.n, 0)} outils avec un dépôt connu`, description),
      ...barres(valeurs, { y: "forge", x: "n" }, valeurs.map((v) => v.forge), 480),
    } as TopLevelSpec,
  };
}

function graphiqueTags(s: Statistiques): Graphique | null {
  const utilises = s.tags.utilisation.filter((t) => t.n);
  if (!utilises.length) return null;
  const valeurs = utilises.slice(0, TAILLE_MAX_TAGS).map((t) => ({ tag: t.cle, n: t.n }));
  const description = `Diagramme à barres : les ${valeurs.length} tags les plus fréquents (${valeurs.slice(0, 5).map((v) => `${v.tag} ${v.n}`).join(", ")}…).`;
  return {
    id: "tags",
    titre: "Tags les plus fréquents",
    description,
    spec: {
      ...base(`Les ${valeurs.length} tags les plus fréquents`, `${utilises.length} tags utilisés sur ${s.tags.utilisation.length} du vocabulaire`, description),
      ...barres(valeurs, { y: "tag", x: "n" }, valeurs.map((v) => v.tag), 480),
    } as TopLevelSpec,
  };
}

function graphiqueJours(s: Statistiques): Graphique | null {
  const jours = s.datesEnrichissement.parJour;
  if (jours.length < 2) return null;
  const valeurs = jours.map((j) => ({ jour: j.cle, n: j.n }));
  const description = `Diagramme à barres : nombre d'outils enrichis par jour, du ${valeurs[0]!.jour} au ${valeurs.at(-1)!.jour}.`;
  return {
    id: "enrichissement-jours",
    titre: "Outils enrichis par jour",
    description,
    spec: {
      ...base("Outils enrichis par jour", `${valeurs.reduce((n, v) => n + v.n, 0)} outils avec une date d'enrichissement`, description),
      data: { values: valeurs },
      width: Math.max(300, valeurs.length * 40),
      height: 220,
      mark: { type: "bar", color: BLEU, cornerRadiusEnd: 2 },
      encoding: { x: { field: "jour", type: "ordinal", title: null, axis: { labelAngle: -45 } }, y: { field: "n", type: "quantitative", title: "Outils", axis: { tickMinStep: 1, format: "d" } } },
    } as TopLevelSpec,
  };
}

/** Tous les graphiques pertinents pour ces statistiques (ceux qui n'ont pas de données sont omis). */
export function construireGraphiques(s: Statistiques): Graphique[] {
  if (!s.total) return [];
  return [
    graphiqueStatut(s),
    graphiqueCategories(s),
    graphiqueCriteres(s),
    graphiqueCriteresParStatut(s),
    graphiqueVerdicts(s),
    graphiqueLicences(s),
    graphiqueForges(s),
    graphiqueTags(s),
    graphiqueJours(s),
  ].filter((g): g is Graphique => g !== null);
}
