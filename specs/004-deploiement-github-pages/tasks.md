---
description: "Liste des tâches du déploiement sur GitHub Pages"
---

# Tasks: Déploiement sur GitHub Pages

**Input**: Design documents from `/specs/004-deploiement-github-pages/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/publication.md, quickstart.md

**Tests**: inclus (principe V de la constitution): test rouge avant le code.

## Format: `[ID] [P?] [Story] Description`

## Conventions

- Les commandes `nub …` des tests se lancent dans `site/`. En-têtes SPDX dans chaque fichier.
- Avant chaque commit: `nub run test`, `nub run typecheck`, `nub run licences` à la racine; `nub run check`, `nub run test`, `nub run test:e2e` dans `site/`.

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Ajouter `dist-base/` à `site/.gitignore` (site bâti sous un chemin de base, pour les tests)

---

## Phase 2: User Story 2 - Consulter le site publié sous l'adresse du dépôt (Priority: P1)

**Goal**: prouver sur le poste que le site fonctionne sous le chemin du dépôt. Faite d'abord: la publication n'a de sens que si le site y vit.

**Independent Test**: bâti avec `SITE_BASE=/repsouv/`, le site n'a aucune adresse interne hors de `/repsouv/`, et il fonctionne dans un navigateur.

- [x] T002 [P] [US2] Écrire `site/test/build/base.test.ts`: bâtit le site avec `SITE_URL=https://millette.github.io` et `SITE_BASE=/repsouv/` dans `site/dist-base/`; dans chaque page, toute adresse interne (`href`, `src`, et les adresses des îles `component-url`, `renderer-url`, `before-hydration-url`) commence par `/repsouv/` et mène à un fichier bâti; les propriétés des îles de l'explorateur et des graphiques portent le chemin de base; `404.html` existe à la racine du site bâti et ses liens commencent par `/repsouv/`; le même build avec `SITE_BASE=/repsouv` (sans barre finale, comme GitHub le donne) produit les mêmes adresses
- [x] T003 [P] [US2] Écrire `site/test/e2e/base.spec.ts` et ajouter à `site/playwright.config.ts` un second serveur qui bâtit le site sous `/repsouv/` dans `site/dist-base/` et le sert sur un autre port: depuis `/repsouv/`, la navigation mène aux quatre pages; l'explorateur charge les outils, filtre, et sa boîte « Détails » montre la fiche d'un outil; un graphique de la page « Statistiques » devient interactif; une fiche s'ouvre depuis la page « Outils »; `/repsouv/inconnu/` sert la page « Page introuvable », dont le lien ramène à `/repsouv/`; aucune requête de la page ne sort de `/repsouv/`
- [x] T004 [US2] Corriger dans `site/src/` toute adresse que T002 ou T003 trouverait hors du chemin de base (l'essai de la recherche n'en a trouvé aucune)

---

## Phase 3: User Story 1 - Publier le site à chaque mise à jour du dépôt (Priority: P1) 🎯 MVP

**Goal**: le flux de publication.

**Independent Test**: le fichier de flux respecte contracts/publication.md; sa première exécution réelle se fait sur GitHub.

- [x] T005 [P] [US1] Écrire `site/test/publication.test.ts` d'après contracts/publication.md, en lisant `../.github/workflows/pages.yml` comme du texte: déclencheurs `push` sur `main` et `workflow_dispatch`, sans `pull_request` ni `schedule`; droits `contents: read`, `pages: write`, `id-token: write`, sans `contents: write`; aucune référence à `secrets.`; groupe de concurrence `pages` sans annulation; les six contrôles présents, chacun avant `actions/upload-pages-artifact`; le build de publication après `nub run test:e2e` et avec `SITE_URL` et `SITE_BASE` tirés de l'étape `configure-pages`; `site/dist` déposé; la tâche de mise en ligne dépend de la première et emploie `actions/deploy-pages`; aucune mention de `update.ts`, `sommaire.ts`, `extract`, `ajouter.ts`, `git push` ni `git commit`; chaque action est épinglée à une version
- [x] T006 [US1] Créer `.github/workflows/pages.yml` (en-têtes SPDX, noms d'étapes en français) jusqu'à ce que T005 passe

---

## Phase 4: User Story 3 - Savoir comment publier et quoi régler (Priority: P2)

- [x] T007 [US3] Documenter la publication: `site/README.md` (section « Publication »: réglage GitHub Pages à faire une fois, adresse, relance à la main, variables `SITE_URL` et `SITE_BASE` pour publier ailleurs, ce que la publication contrôle), `README.md` (adresse du site), `implementation.md` (paragraphe « Publication » de la section du site, tests ajoutés) et `historique.md` (étape, décision; la question ouverte de l'hébergeur est levée)

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T008 Dérouler les scénarios 1 à 5 de `specs/004-deploiement-github-pages/quickstart.md`, consigner les résultats dans ce fichier (section « Résultats ») en disant que les scénarios 6 et 7 restent à faire sur GitHub, et vérifier que tous les contrôles passent

---

## Dependencies & Execution Order

- T001, puis US2 (T002 à T004), puis US1 (T005, T006), puis US3 (T007), puis T008.
- T002 et T003 en parallèle; T005 en parallèle de la phase 2.

## Implementation Strategy

1. Prouver que le site vit sous le chemin du dépôt (US2).
2. Écrire le flux de publication contre son test (US1).
3. Documenter (US3), valider.

---

## Résultats

Validation du 2026-11-13 (T008), sur le poste.

| Scénario | Vérifié par | Résultat |
|---|---|---|
| 1 (adresses sous le chemin du dépôt) | `site/test/build/base.test.ts`: 159 pages bâties sous `/repsouv/`, plus de 1 000 adresses internes, aucune hors du chemin, aucun lien mort; identique avec `/repsouv` sans barre finale | Réussi |
| 2 (site sous le chemin, dans un navigateur) | `site/test/e2e/base.spec.ts` (5 tests) | Réussi |
| 3 (site à la racine) | Tous les autres tests, inchangés | Réussi |
| 4 (forme du flux) | `site/test/publication.test.ts` (9 tests) | Réussi |
| 5 (documentation) | `site/README.md` (« Publication »), `README.md`, `implementation.md` | Fait |
| 6 (première publication) | À faire sur GitHub: `git push origin main`, puis Settings, Pages, Source « GitHub Actions » | Non exercé |
| 7 (contrôle en échec) | À observer sur GitHub | Non exercé |

Totaux du site: 135 tests unitaires, 60 tests du site bâti, 112 tests dans Chromium; `nub run check` sans erreur.

T004: aucune correction nécessaire, le site n'avait aucune adresse hors du chemin de base.

Non vérifié: le flux n'a jamais tourné. Trois points ne se confirmeront qu'à sa première exécution sur GitHub: le
script d'installation de nub sur la machine de GitHub, les sorties `origin` et `base_path` de
`actions/configure-pages` v6, et la durée d'une publication (SC-001: moins de dix minutes).
