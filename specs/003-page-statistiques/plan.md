# Implementation Plan: Page « Statistiques »

**Branch**: `003-page-statistiques` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-page-statistiques/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Une page « Statistiques » sur le site: les chiffres clés du répertoire et les neuf graphiques du
sommaire, chacun avec le tableau des mêmes chiffres dans un bloc repliable, lisible sans
JavaScript. Avec JavaScript, chaque graphique donne la valeur exacte de ses barres au survol et au
clavier, et sa légende met une série en évidence. Les graphiques suivent le thème clair ou sombre.

Approche: au build, la page importe `calculerStatistiques` (`statistiques.ts`) et
`construireGraphiques` (`graphiques.ts`) de la racine, pour ne jamais contredire `sommaire.md`.
Chaque spécification Vega-Lite est adaptée au thème, compilée par vega-lite puis rendue en SVG par
vega dans Node, sans `vl-convert`. Dans le navigateur, une île SolidJS (`client:visible`) remplace
l'image par la vue vega interactive, chargée seulement quand le graphique devient visible. Les
tableaux sont des composants `.astro`. Rien ne change à la racine, sauf la documentation.

## Technical Context

**Language/Version**: TypeScript, Node.js 26 (`>=26 <27`)

**Primary Dependencies**: celles du site, plus `vega` 6 et `vega-lite` 6, ajoutées à
`site/package.json` (à la racine, elles restent des dépendances de développement, pour les types).
Aucune dépendance ajoutée à la racine.

**Storage**: aucun. Au build: des images SVG et des spécifications Vega compilées, écrites dans
`site/dist/graphiques/`, à partir des cinq fichiers de données lus tels quels.

**Testing**: `node:test` par nub (fonctions pures sur fixtures; site bâti sur les vraies données);
Playwright et `@axe-core/playwright` (survol, clavier, légende, thème, liens, sans JavaScript,
accessibilité, téléphone).

**Target Platform**: navigateurs courants et à jour, ordinateur et téléphone; hébergeur de fichiers
statiques.

**Project Type**: site Web statique (sous-projet `site/`).

**Performance Goals**: la page sans JavaScript ne charge que du HTML, du CSS et les images du thème
en cours; la bibliothèque vega n'est chargée que lorsqu'un graphique devient visible.

**Constraints**: aucun appel payant, pas de `vl-convert` au build du site; page lisible sans
JavaScript; WCAG 2.1 AA; nombres à la française; `node sommaire.ts`, `sommaire.md` et `graphiques/`
de la racine inchangés; règles du skill `solidjs` (SolidJS seule couche d'interactivité, daisyUI en
CSS seul, sans variante réactive).

**Scale/Scope**: 9 graphiques, 2 thèmes, donc 18 images et 18 spécifications compilées; une page
nouvelle; un lien de navigation de plus.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Comment le plan le respecte |
|---|---|---|
| I. Les données d'abord | Conforme | Les cinq fichiers sont lus tels quels. Les calculs et les spécifications viennent des modules de la racine, importés sans être modifiés; images et spécifications compilées sont des dérivés écrits dans `site/dist/`. |
| II. Provenance et honnêteté | Conforme | Chaque graphique porte en texte la provenance de ce qu'il compte (déduit des étoiles, évaluation par IA, vérifié avec citation, champ produit par IA « à vérifier »), d'après une table du site. Les dénominateurs sont écrits. Le résumé par IA du sommaire n'est pas repris. |
| III. Licences REUSE | Conforme | Fichiers avec en-têtes SPDX; la page dit que les graphiques sont des dérivés des données, sous CC BY-SA 4.0, avec l'attribution du pied de page. |
| IV. Les coûts sont explicites | Conforme | Aucun appel payant ni réseau au build; `vl-convert` n'est pas requis. Dans le navigateur, le site ne lit que ses propres fichiers statiques. |
| V. Tests d'abord, simplicité | Conforme | Test rouge avant chaque fonction de `site/src/lib/`. Deux dépendances d'exécution ajoutées au site, justifiées dans research.md; aucun calcul statistique réécrit. |
| VI. Tout en français | Conforme | Interface, artefacts, identifiants et nombres en français. |
| Contraintes techniques et flux de travail | Conforme | nub seulement; branche `003-page-statistiques`; contrôles de la racine et du site avant chaque commit; contenu durable reporté; dossier `specs/` conservé. |

Aucune violation.

**Réévaluation après la conception (Phase 1)**: conforme, avec un point de vigilance écrit dans
research.md: le build du site exécute maintenant du code de la racine (`statistiques.ts`,
`graphiques.ts` et ce qu'ils importent), donc il demande que les dépendances de la racine soient
installées. Les scripts de la racine, eux, ne dépendent toujours pas du site.

## Project Structure

### Documentation (this feature)

```text
specs/003-page-statistiques/
├── plan.md
├── research.md
├── data-model.md            # Chiffres clés, graphiques, tableaux, provenance, liens
├── quickstart.md
├── contracts/
│   ├── page.md              # Contenu obligatoire de la page, avec et sans JavaScript
│   └── graphiques.md        # Fichiers produits au build et comportement interactif
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
site/
├── src/
│   ├── lib/
│   │   ├── statistiques.ts        # Appelle calculerStatistiques et construireGraphiques de la racine; chiffres clés
│   │   ├── tableaux.ts            # Tableau de chaque graphique: colonnes, lignes, liens vers l'explorateur, provenance
│   │   ├── themes-graphiques.ts   # Adapte une spécification au thème clair ou sombre
│   │   ├── interaction.ts         # Prépare une spécification pour le survol, le clavier et la mise en évidence
│   │   ├── rendu.ts               # Vega-Lite → Vega → SVG, dans Node
│   │   └── nombres.ts             # Nombres et pourcentages à la française
│   ├── components/
│   │   ├── FigureGraphique.astro  # Titre, provenance, images des deux thèmes, île, tableau repliable
│   │   ├── TableauGraphique.astro # Tableau avec légende, en-têtes et liens
│   │   ├── ChiffresCles.astro
│   │   ├── Graphique.tsx          # Île: vue vega interactive, flèches, légende, thème
│   │   └── Navigation.astro       # Ajout du lien « Statistiques »
│   ├── pages/
│   │   ├── statistiques.astro
│   │   └── graphiques/[fichier].ts  # Écrit au build <id>-<thème>.svg et <id>-<thème>.json
│   └── styles/global.css
└── test/
    ├── *.test.ts                  # Unitaires: statistiques, tableaux, themes-graphiques, interaction, nombres
    ├── build/statistiques.test.ts # Page bâtie, images, spécifications, cohérence avec la racine
    └── e2e/statistiques.spec.ts   # Survol, clavier, légende, thème, liens, sans JavaScript; + accessibilité, téléphone

# Racine: documentation seulement (README.md, implementation.md, historique.md)
```

**Structure Decision**: tout reste dans `site/`. Les calculs et les spécifications des graphiques
sont ceux de la racine, importés; le site n'ajoute que ce qui est propre à une page Web: les
tableaux, l'adaptation au thème, le rendu en image et l'interaction.

## Complexity Tracking

Aucune violation à justifier.
