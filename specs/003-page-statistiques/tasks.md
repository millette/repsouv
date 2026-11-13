---
description: "Liste des tâches de la page « Statistiques »"
---

# Tasks: Page « Statistiques »

**Input**: Design documents from `/specs/003-page-statistiques/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page.md, contracts/graphiques.md, quickstart.md

**Tests**: inclus. La constitution (principe V) impose le test rouge avant le code.

**Organization**: les tâches sont groupées par parcours (user story).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: réalisable en parallèle (fichiers différents, aucune dépendance sur une tâche inachevée)
- **[Story]**: le parcours de spec.md que la tâche sert (US1 à US4)

## Conventions

- Tout le code est sous `site/`; les commandes `nub …` se lancent dans `site/`, sauf mention « à la
  racine ». En-têtes SPDX (`AGPL-3.0-or-later`) dans chaque fichier.
- Les modules de la racine (`statistiques.ts`, `graphiques.ts`) sont importés, jamais modifiés.
- Skill `solidjs` du dépôt pour l'île; daisyUI en CSS seul, aucune variante réactive.
- Avant chaque commit: `nub run test`, `nub run typecheck` et `nub run licences` à la racine;
  `nub run check`, `nub run test` et `nub run test:e2e` dans `site/`.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Ajouter `vega` et `vega-lite` aux dépendances de `site/package.json` avec `nub add` (fait pendant la recherche; vérifier `site/nub.lock`), et vérifier que `nub run build` passe encore

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: appeler les calculs de la racine, et savoir rendre un graphique en image dans les deux thèmes.

### Tests (à écrire d'abord, ils doivent échouer)

- [ ] T002 [P] Écrire `site/test/nombres.test.ts`: `nombre(3938168)` → « 3 938 168 »; `decimal(1.16)` → « 1,16 »; `pourcent(36.36)` → « 36,4 % » (une décimale, virgule, espace avant « % »); `part(56, 154)` → « 36,4 % »; `part(1, 0)` → « 0 % »
- [ ] T003 [P] Écrire `site/test/statistiques.test.ts` (sur `test/fixtures/valide`): `statistiquesDuSite(donnees)` rend les `Statistiques` et les `Graphique` de la racine pour les outils des données; `chiffresCles(s, donnees)` rend le total, le nombre de catégories ayant un outil, le nombre d'outils à 3, 2, 1 et 0 étoiles (somme égale au total), la moyenne, le nombre de scores estimés, les outils enrichis, la provenance par source et les pays nommés en français avec leur nombre d'outils
- [ ] T004 [P] Écrire `site/test/themes-graphiques.test.ts`: `adapterAuTheme(spec, "clair")` rend la spécification telle quelle; `adapterAuTheme(spec, "sombre")` rend une copie (l'original n'est pas modifié) dont seuls `background` et `config` diffèrent, `data`, `encoding`, `layer`, `facet` et `spec` restant égaux; les couleurs de texte du thème sombre ont un contraste d'au moins 4,5 pour 1 avec son fond (`contraste(a, b)`); les couleurs des séries (palette de `graphiques.ts`) ne figurent pas parmi les couleurs remplacées
- [ ] T005 [P] Écrire `site/test/rendu.test.ts`: `rendreSvg(spec)` rend, pour chacun des graphiques des fixtures, une chaîne qui commence par `<svg` et contient son titre; `compilerVega(spec)` rend un objet avec `marks` et `signals`

### Implementation

- [ ] T006 [P] Implémenter `site/src/lib/nombres.ts` jusqu'à ce que T002 passe
- [ ] T007 Implémenter `site/src/lib/statistiques.ts` (imports de `../../../statistiques.ts` et `../../../graphiques.ts`) jusqu'à ce que T003 passe
- [ ] T008 [P] Implémenter `site/src/lib/themes-graphiques.ts` jusqu'à ce que T004 passe
- [ ] T009 Implémenter `site/src/lib/rendu.ts` (`vega-lite` puis `vega`, sans navigateur) jusqu'à ce que T005 passe

**Checkpoint**: les tests unitaires passent; le site sait calculer et dessiner sans `vl-convert`.

---

## Phase 3: User Story 1 - Voir le portrait chiffré du répertoire (Priority: P1) 🎯 MVP

**Goal**: la page « Statistiques », lisible sans JavaScript: chiffres clés, neuf graphiques en
images dans les deux thèmes, un tableau replié sous chacun, et le lien dans la navigation.

**Independent Test**: sans JavaScript, `/statistiques/` montre les chiffres clés et, pour chaque
graphique, son image, son texte de remplacement et son tableau.

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Écrire `site/test/tableaux.test.ts` d'après data-model.md: `tableauDe(graphique, contexte)` rend pour chacun des neuf `id` les colonnes du modèle, une ligne par valeur de `spec.data.values`, dans le même ordre, avec les nombres à la française et les dates en clair; un `id` inconnu rend un tableau générique (une colonne par champ) plutôt que d'échouer
- [ ] T011 [P] [US1] Écrire `site/test/build/statistiques.test.ts` d'après contracts/page.md: `statistiques/index.html` a `<h1>` « Statistiques », la date des données, la mention des dérivés sous CC BY-SA 4.0 et la section « Chiffres clés » avec les nombres recalculés depuis les données par `calculerStatistiques`; un `<figure data-graphique>` par graphique de `construireGraphiques`, dans l'ordre, avec `<h2>`, deux `<img>` (`-clair.svg`, `-sombre.svg`) au même `alt` égal à la description du graphique, et un `<details>` fermé « Voir les chiffres » contenant un `<table>` avec `<caption>` et `<th scope="col">`; le nombre de lignes de chaque tableau égale le nombre de valeurs de la spécification; les 18 fichiers `.svg` existent dans `dist/graphiques/` et commencent par `<svg`; la page ne contient pas le résumé du sommaire; aucun nombre de la page n'a de point décimal
- [ ] T012 [P] [US1] Adapter `site/test/build/commun.test.ts` (quatre liens de navigation, « Statistiques » en cours sur `statistiques/index.html`) et ajouter à `site/test/build/echecs.test.ts`: le build réussit avec un `PATH` où `vl-convert` est introuvable

### Implementation for User Story 1

- [ ] T013 [US1] Implémenter `site/src/lib/tableaux.ts` (colonnes par `id`, lignes, sans les liens ni la provenance) jusqu'à ce que T010 passe
- [ ] T014 [US1] Créer `site/src/pages/graphiques/[fichier].ts` (point de terminaison statique: pour chaque graphique et chaque thème, `<id>-<thème>.svg` par `rendreSvg(adapterAuTheme(spec, thème))`), `site/src/components/ChiffresCles.astro`, `site/src/components/TableauGraphique.astro`, `site/src/components/FigureGraphique.astro` et `site/src/pages/statistiques.astro` (`courante="statistiques"`); ajouter « Statistiques » à `site/src/components/Navigation.astro` et `adresseStatistiques(base)` à `site/src/lib/adresses.ts`; styles dans `site/src/styles/global.css` (une seule des deux images visible selon le thème, avec la règle du thème du site); jusqu'à ce que T011 et T012 passent
- [ ] T015 [US1] Écrire `site/test/e2e/statistiques.spec.ts`, premiers cas: sans JavaScript, chaque graphique montre une image visible avec son `alt`, « Voir les chiffres » s'ouvre et montre le tableau; en thème sombre du système, c'est l'image `-sombre.svg` qui est visible, et en thème clair l'image `-clair.svg`

**Checkpoint**: la page est complète et lisible sans JavaScript.

---

## Phase 4: User Story 4 - Savoir ce que chaque chiffre mesure (Priority: P2, faite avant l'interaction)

**Goal**: chaque graphique dit en texte d'où viennent ses chiffres et sur combien d'outils ils portent.

**Independent Test**: lire les blocs des critères, du statut et des licences: provenance et base en texte.

- [ ] T016 [P] [US4] Ajouter à `site/test/tableaux.test.ts` et à `site/test/build/statistiques.test.ts`: `provenanceDe(id)` rend les libellés de data-model.md (`ia` pour `statut-code-source`, `categories-statut`, `licences`, `forges`, `tags`, `criteres-verdicts`; `heuristique` et `ia` pour `criteres-repertoire-enrichie` et `criteres-par-statut`; aucun pour `enrichissement-jours`) et une phrase qui nomme ce que le graphique compte; `baseDe(id, s)` rend la phrase du dénominateur (« Sur 154 outils », « Sur les 142 outils enrichis », « Sur les 142 outils vérifiés »…) calculée depuis les statistiques; sur la page bâtie, chaque `<figure>` porte ces libellés et cette phrase en texte, les trois graphiques des critères nomment « déduit des étoiles », « évaluation par IA » et « vérifié … citation », et chaque pourcentage des chiffres clés est suivi de son dénominateur
- [ ] T017 [US4] Compléter `site/src/lib/tableaux.ts` (`provenanceDe`, `baseDe`) et `site/src/components/FigureGraphique.astro`, `ChiffresCles.astro` jusqu'à ce que T016 passe

---

## Phase 5: User Story 3 - Aller d'un chiffre aux outils qu'il compte (Priority: P2)

**Goal**: les lignes des tableaux par statut, par catégorie et statut, et par tag mènent à l'explorateur filtré.

**Independent Test**: suivre un lien de chacun des trois tableaux: l'explorateur montre autant d'outils que le chiffre.

- [ ] T018 [P] [US3] Ajouter à `site/test/tableaux.test.ts` et à `site/test/build/statistiques.test.ts`: `tableauDe` pose un lien sur la première colonne des lignes de `statut-code-source` (`?statut=<id>`, « Pas encore enrichi » → `non-enrichi`), de `categories-statut` (`?categorie=<id>&statut=<id>`) et de `tags` (`?tag=<id>`), et aucun sur les six autres tableaux; une valeur sans identifiant connu reste du texte; sur la page bâtie, pour chaque lien, le nombre d'outils que `retenu` de `site/src/lib/selection.ts` retient dans `dist/explorateur.json` avec l'état lu de l'adresse du lien égale le chiffre de la ligne
- [ ] T019 [US3] Compléter `site/src/lib/tableaux.ts` et `site/src/components/TableauGraphique.astro` jusqu'à ce que T018 passe; ajouter à `site/test/e2e/statistiques.spec.ts`: ouvrir « Voir les chiffres » du tableau des statuts, activer « Libre », et l'explorateur affiche le nombre d'outils du tableau

---

## Phase 6: User Story 2 - Lire la valeur exacte et isoler une série (Priority: P2)

**Goal**: avec JavaScript, la vue vega remplace l'image; survol, flèches et légende donnent les valeurs et isolent une série; la vue suit le thème.

**Independent Test**: survoler une barre, parcourir un graphique aux flèches, presser une série de la légende, basculer le thème.

### Tests for User Story 2 ⚠️

- [ ] T020 [P] [US2] Écrire `site/test/interaction.test.ts`: `preparer(spec)` rend une copie dont les valeurs sont les mêmes avec un champ `_i` égal à leur rang, des paramètres `courant` (valeur `-1`) et `serie` (valeur `null`), les infobulles activées, et, pour un graphique qui a une série de couleur nominale, une opacité et un contour conditionnés par `serie` et `courant`; `seriesDe(spec)` rend le champ et les noms des séries d'un graphique à plusieurs séries (`statut-code-source`: aucune légende à isoler s'il n'y a qu'une barre par statut; `categories-statut`, `criteres-repertoire-enrichie`, `criteres-verdicts`, `licences`: leurs séries) et rien pour `forges`, `tags`, `enrichissement-jours` et `criteres-par-statut`; chaque spécification préparée se compile (`compilerVega`) pour les graphiques des fixtures
- [ ] T021 [P] [US2] Ajouter à `site/test/build/statistiques.test.ts`: les 18 fichiers `.json` de `dist/graphiques/` existent, sont du JSON avec `marks` et des signaux `courant` et `serie`, et leurs valeurs portent `_i`; ajouter à `site/test/e2e/statistiques.spec.ts`: une fois un graphique visible, la vue (`[data-vue]`) remplace l'image; survoler une marque affiche une infobulle (`[data-infobulle]`) avec la valeur de la ligne correspondante du tableau, sans attribut `title`; la tabulation s'arrête une seule fois par graphique; les flèches font apparaître dans la région `aria-live` le texte de la première, puis de la deuxième ligne du tableau, Fin la dernière, Échap vide la région; un bouton de légende pressé (`aria-pressed="true"`) estompe les autres séries et se relâche au second appui; basculer l'interrupteur de thème recharge la vue en sombre; quand la spécification ne peut pas être chargée (route en échec), l'image reste visible

### Implementation for User Story 2

- [ ] T022 [US2] Implémenter `site/src/lib/interaction.ts` jusqu'à ce que T020 passe, et faire écrire `<id>-<thème>.json` par `site/src/pages/graphiques/[fichier].ts` (`compilerVega(preparer(adapterAuTheme(spec, thème)))`)
- [ ] T023 [US2] Créer l'île `site/src/components/Graphique.tsx` selon contracts/graphiques.md et le skill `solidjs` (import dynamique de `vega`; `createResource` pour la spécification, sous `<Suspense>` et `<ErrorBoundary>`; conteneur focalisable nommé; flèches, Début, Fin, Échap; région `aria-live`; infobulle; boutons de légende `aria-pressed`; observation de `data-theme` et de la préférence du système; `onCleanup` qui détruit la vue), la monter par `client:visible` dans `site/src/components/FigureGraphique.astro`, masquer les images quand la vue est prête, et ajouter les styles, jusqu'à ce que T021 passe

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T024 [P] Étendre `site/test/e2e/accessibilite.spec.ts` (aucune violation axe A ou AA sur `/statistiques/`, vues montées et tableaux ouverts, en thème clair et sombre; parcours au clavier: atteindre un graphique, lire une valeur aux flèches, presser une série) et `site/test/e2e/telephone.spec.ts` (360 px: pas de défilement horizontal de la page, tableaux ouverts compris); corriger composants et styles
- [ ] T025 Comparer les chiffres de la page à `sommaire.md`: régénérer le sommaire dans un dossier temporaire avec `node sommaire.ts --sans-resume --sans-graphiques` sur une copie des données, et vérifier que les chiffres clés et les valeurs des tableaux y figurent; dérouler les 16 scénarios de `specs/003-page-statistiques/quickstart.md` et consigner les résultats dans ce fichier (section « Résultats »); vérifier par `git status` que données, schémas, scripts, `sommaire.md` et `graphiques/` de la racine sont inchangés
- [ ] T026 Reporter le contenu durable dans `implementation.md` (page « Statistiques », rendu sans `vl-convert`, dépendance du build du site aux modules de la racine, tests), `README.md`, `site/README.md` (prérequis: `nub install` à la racine) et `historique.md` (étape, décisions); vérifier que tous les contrôles passent

---

## Dependencies & Execution Order

- **Setup, Foundational**: d'abord.
- **US1 (Phase 3)**: la page sans JavaScript; tout le reste en dépend.
- **US4 puis US3 (Phases 4 et 5)**: complètent `tableaux.ts` et les composants de US1; faites avant l'interaction parce qu'elles valent sans JavaScript.
- **US2 (Phase 6)**: l'île, par-dessus la page complète.
- **Polish**: à la fin.

### Parallel Opportunities

- T002 à T005; T006 et T008; T010 à T012; T020 et T021.

## Parallel Example: Foundational

```bash
Task: "Écrire site/test/nombres.test.ts"
Task: "Écrire site/test/statistiques.test.ts"
Task: "Écrire site/test/themes-graphiques.test.ts"
Task: "Écrire site/test/rendu.test.ts"
```

## Implementation Strategy

1. Foundational: calculs de la racine et rendu en image.
2. US1: la page sans JavaScript (MVP).
3. US4 et US3: provenance, dénominateurs, liens.
4. US2: interaction.
5. Polish: accessibilité, téléphone, cohérence avec le sommaire, documentation.

Un commit par parcours, tous les contrôles verts.
