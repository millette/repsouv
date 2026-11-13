# Implementation Plan: Explorateur interactif des outils

**Branch**: `002-explorateur-outils` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-explorateur-outils/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Une page « Explorer » sur le site de consultation: tous les outils actifs, triés et filtrés sans
rechargement, en cartes ou en tableau, avec une comparaison côte à côte de deux à quatre outils et
tout l'état dans l'adresse. En même temps, l'accueil devient une page de présentation du projet, la
liste par catégorie passe sur une page statique « Outils », et les filtres de la tranche 001 sont
retirés: l'explorateur est le seul endroit où l'on filtre.

Approche: une île SolidJS (`client:only="solid-js"`) dans `site/`. Ses données viennent d'un
fichier JSON écrit au build à partir des fichiers de la racine, lu dans le navigateur par
`createResource` sous `<Suspense>` et `<ErrorBoundary>`. Le tri, les filtres, la comparaison et la
lecture de l'adresse sont des fonctions pures de `site/src/lib/`, testées par `node:test`. Rien ne
change à la racine, sauf la documentation.

## Technical Context

**Language/Version**: TypeScript, Node.js 26 (`>=26 <27`)

**Primary Dependencies**: celles du site (Astro 7, SolidJS 1.9 par `@astrojs/solid-js`, daisyUI 5
en CSS seul, Sätteri). Aucune dépendance ajoutée, ni au site ni à la racine.

**Storage**: aucun. Un fichier statique `explorateur.json`, produit au build depuis les cinq
fichiers de données de la racine, lus tels quels. L'état de la personne vit dans l'adresse.

**Testing**: `node:test` par nub (fonctions pures, sur fixtures; site bâti, sur les vraies
données); Playwright et `@axe-core/playwright` (comportement, états de chargement et d'erreur,
clavier, accessibilité, téléphone).

**Target Platform**: navigateurs courants et à jour, ordinateur et téléphone; hébergeur de
fichiers statiques.

**Project Type**: site Web statique (sous-projet `site/`).

**Performance Goals**: tri ou filtre appliqué en moins de 100 ms pour 154 outils; fichier de
données de moins de 150 ko avant compression (mesuré: 104 ko, 16 ko compressé).

**Constraints**: aucun serveur, aucune API, aucun appel payant; accueil, page « Outils » et fiches
lisibles sans JavaScript; WCAG 2.1 AA; tout en français; données, schémas et scripts de la racine
intacts; règles du skill `solidjs` (SolidJS seule couche d'interactivité, daisyUI en CSS seul, sans
variante réactive).

**Scale/Scope**: 154 outils, 25 catégories, 52 tags, 3 sources, 12 pays; 3 pages nouvelles ou
refaites (accueil, « Outils », « Explorer ») et un fichier de données.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Comment le plan le respecte |
|---|---|---|
| I. Les données d'abord | Conforme | Les cinq fichiers sont lus tels quels. `explorateur.json` est un dérivé écrit dans `site/dist/`, jamais dans le dépôt; il n'ajoute ni champ ni identifiant aux données. |
| II. Provenance et honnêteté | Conforme | L'explorateur réemploie la table de provenance du site: statut, licence, tags et verdicts portent « Produit par IA, à vérifier », les critères déduits « Déduit par ce dépôt », un score estimé est dit estimé, en texte. L'accueil n'affirme que ce que la documentation du dépôt dit (FR-045). |
| III. Licences REUSE | Conforme | Nouveaux fichiers avec en-têtes SPDX (`AGPL-3.0-or-later`); `explorateur.json` déclare la licence des données (`CC-BY-SA-4.0`) dans son champ `meta`; attribution sur les trois pages. |
| IV. Les coûts sont explicites | Conforme | Aucun appel payant. Le seul appel réseau du site est la lecture de son propre fichier statique par le navigateur. |
| V. Tests d'abord, simplicité | Conforme | Test rouge avant chaque fonction de `src/lib/`. Aucune dépendance ajoutée. Une seule île nouvelle; l'île de filtres de la tranche 001 est retirée plutôt que doublée. |
| VI. Tout en français | Conforme | Interface, artefacts, identifiants, paramètres d'adresse et messages en français. |
| Contraintes techniques et flux de travail | Conforme | nub seulement; branche `002-explorateur-outils`; contrôles de la racine et du site avant chaque commit; contenu durable reporté dans `implementation.md` et `historique.md`, dossier `specs/` conservé (constitution 1.2.0). |

Aucune violation.

**Réévaluation après la conception (Phase 1)**: conforme. Le point de vigilance est le test de la
tranche 001 qui interdit tout appel réseau dans le code du site: il est resserré, pas retiré, pour
n'admettre que la lecture du fichier statique du site par le chargeur de l'explorateur.

## Project Structure

### Documentation (this feature)

```text
specs/002-explorateur-outils/
├── plan.md
├── research.md
├── data-model.md            # Fichier de données de l'explorateur, état, règles de tri, de filtre et de comparaison
├── quickstart.md
├── contracts/
│   ├── adresse.md           # Paramètres d'adresse de l'explorateur
│   ├── donnees.md           # Forme de explorateur.json
│   └── pages.md             # Accueil, « Outils », « Explorer »: contenu obligatoire et états
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
site/
├── src/
│   ├── lib/
│   │   ├── explorateur.ts          # Types et construction des données de l'explorateur (au build)
│   │   ├── chargement.ts           # Lecture et vérification de explorateur.json (dans le navigateur)
│   │   ├── etat.ts                 # État de l'explorateur, lecture et écriture de l'adresse
│   │   ├── selection.ts            # Règle de filtre (étend celle de la tranche 001)
│   │   ├── tri.ts                  # Tri par nom, score ou catégorie, dans les deux sens
│   │   ├── comparaison.ts          # Choix de deux à quatre outils, lignes de la comparaison
│   │   ├── presentation.ts         # Faits de l'accueil: crédits, étapes, logiciels utilisés
│   │   └── filtres.ts              # Réduit à normaliser(); le reste passe dans etat.ts et selection.ts
│   ├── components/
│   │   ├── Explorateur.tsx         # Île: ressource, état, adresse, assemblage
│   │   ├── explorateur/
│   │   │   ├── Commandes.tsx       # Tri, filtres, vue
│   │   │   ├── Resultats.tsx       # Cartes ou tableau, cases « comparer »
│   │   │   └── Comparaison.tsx     # Tableau côte à côte
│   │   ├── Navigation.astro        # Accueil, Outils, Explorer; page en cours indiquée
│   │   └── Filtres.tsx             # SUPPRIMÉ (île de filtres de la tranche 001)
│   ├── pages/
│   │   ├── index.astro             # REFAIT: présentation du projet
│   │   ├── outils/index.astro      # NOUVEAU: liste par catégorie (ex-accueil), sans filtres
│   │   ├── outils/[id].astro       # Liens de catégorie et de tag vers l'explorateur
│   │   ├── explorer.astro          # NOUVEAU: île, message sans JavaScript
│   │   └── explorateur.json.ts     # NOUVEAU: écrit le fichier de données au build
│   └── styles/global.css
└── test/
    ├── *.test.ts                   # Unitaires: explorateur, chargement, etat, selection, tri, comparaison, presentation
    ├── build/*.test.ts             # Site bâti: accueil, page « Outils », explorateur.json, navigation
    └── e2e/*.spec.ts               # explorateur, comparaison, etats, accessibilité, téléphone, sans JavaScript

# Racine: documentation seulement (README.md, implementation.md, historique.md)
```

**Structure Decision**: tout reste dans le sous-projet `site/`. La logique est en fonctions pures
dans `site/src/lib/`, sans Solid, sans Astro et sans accès au DOM; l'île ne fait qu'assembler. Les
fichiers de la tranche 001 qui servaient les filtres de l'accueil sont réemployés (règle de
sélection, noms des paramètres) ou supprimés (île `Filtres.tsx`, ses tests).

## Complexity Tracking

Aucune violation à justifier.
