// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Faits que l'accueil présente: genèse du répertoire et logiciels utilisés. Tout vient de la documentation du dépôt
// (README.md, implementation.md, historique.md) et des dépendances déclarées; test/presentation.test.ts le vérifie.
// Les nombres courants (outils, catégories, sources) ne sont jamais écrits ici: l'accueil les calcule depuis les données.

export interface Logiciel {
  nom: string;
  url: string;
  /** À quoi il sert dans ce projet, en une phrase. */
  role: string;
  /** Nom du paquet qui le prouve dans un package.json du dépôt, quand la documentation ne le nomme pas. */
  paquet?: string;
}

export interface GroupeLogiciels {
  titre: string;
  logiciels: Logiciel[];
}

export const LOGICIELS: GroupeLogiciels[] = [
  {
    titre: "Pour produire les données",
    logiciels: [
      { nom: "Node.js", url: "https://nodejs.org/", role: "Exécute tels quels les scripts TypeScript qui extraient, classent et enrichissent les données." },
      { nom: "linkedom", url: "https://github.com/WebReflection/linkedom", role: "Lit les pages Web des sources et des outils.", paquet: "linkedom" },
      { nom: "OpenAI", url: "https://platform.openai.com/", role: "Ses modèles rédigent les champs d'enrichissement et vérifient les critères, citation à l'appui." },
      { nom: "Open Hub", url: "https://www.openhub.net/", role: "Fournit les données publiques des projets de logiciels libres." },
      { nom: "Vega-Lite", url: "https://vega.github.io/vega-lite/", role: "Décrit les graphiques du sommaire statistique." },
      { nom: "vl-convert", url: "https://github.com/vega/vl-convert", role: "Convertit ces graphiques en images SVG." },
      { nom: "mion RunTypes", url: "https://mion.io/runtypes", role: "Génère les schémas JSON des fichiers de données à partir des types." },
    ],
  },
  {
    titre: "Pour bâtir ce site",
    logiciels: [
      { nom: "Astro", url: "https://astro.build/", role: "Génère les pages statiques à partir des fichiers de données.", paquet: "astro" },
      { nom: "SolidJS", url: "https://www.solidjs.com/", role: "Anime l'explorateur et l'interrupteur de thème, seules parties interactives.", paquet: "solid-js" },
      { nom: "daisyUI", url: "https://daisyui.com/", role: "Fournit les composants de style, importés en CSS.", paquet: "daisyui" },
      { nom: "Sätteri", url: "https://satteri.bruits.org/", role: "Rend en HTML les descriptions détaillées, écrites en Markdown.", paquet: "satteri" },
    ],
  },
  {
    titre: "Pour développer et vérifier",
    logiciels: [
      { nom: "nub", url: "https://nubjs.com/", role: "Installe les dépendances et lance les scripts et les tests." },
      { nom: "Playwright", url: "https://playwright.dev/", role: "Teste le site dans un navigateur, clavier et lecture sans JavaScript compris.", paquet: "@playwright/test" },
      { nom: "axe", url: "https://github.com/dequelabs/axe-core", role: "Contrôle l'accessibilité des pages.", paquet: "@axe-core/playwright" },
      { nom: "REUSE", url: "https://reuse.software/", role: "Vérifie que chaque fichier déclare sa licence." },
      { nom: "Spec Kit", url: "https://github.com/github/spec-kit", role: "Encadre chaque fonctionnalité: spécification, plan, tâches." },
      { nom: "Git", url: "https://git-scm.com/", role: "Garde l'historique des données et du code." },
    ],
  },
];

export interface Etape {
  /** Date ISO (jour) de l'étape, telle que historique.md la donne. */
  date: string;
  texte: string;
}

/** Étapes du dépôt, d'après les repères de historique.md. */
export const ETAPES: Etape[] = [
  { date: "2026-11-11", texte: "Extraction du répertoire en JSON, déduction des critères que les étoiles représentent, et premier enrichissement par IA." },
  { date: "2026-11-12", texte: "Vérification des critères par IA, citation à l'appui ; catégories décrites ; ajout des Services FACiLes." },
  { date: "2026-11-13", texte: "Ajout des alternatives européennes de Charles ; site de consultation, puis explorateur." },
];
