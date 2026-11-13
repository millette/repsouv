---
description: "Liste des tâches du site de consultation du répertoire"
---

# Tasks: Site de consultation du répertoire

**Input**: Design documents from `/specs/001-site-consultation-repertoire/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pages.md, contracts/filtres.md, quickstart.md

**Tests**: inclus. La constitution (principe V) impose le test rouge avant le code: dans chaque
phase, les tâches de test précèdent l'implémentation et doivent échouer d'abord.

**Organization**: les tâches sont groupées par parcours (user story), pour que chacun soit
réalisable et vérifiable seul.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: réalisable en parallèle (fichiers différents, aucune dépendance sur une tâche inachevée)
- **[Story]**: le parcours de spec.md que la tâche sert (US1 à US4)
- Chaque description donne le chemin exact du fichier

## Conventions

- Tout le code du site est sous `site/`; les commandes `nub …` des tâches se lancent dans `site/`,
  sauf mention « à la racine ».
- Chaque fichier `.ts`, `.mjs`, `.css` et `.astro` commence par les en-têtes SPDX
  (`AGPL-3.0-or-later`, `2026 Robin Millette <https://robin.millette.info/>`).
- Identifiants de code, commentaires, textes d'interface et messages d'erreur en français.
- Avant chaque commit: `nub run test`, `nub run typecheck` et `nub run licences` à la racine, et
  `nub run test` dans `site/`.
- Les API d'Astro 7, de SolidJS et de daisyUI 5 se vérifient dans leur documentation
  (<https://docs.astro.build>, <https://docs.solidjs.com>, skills `astro`, `solidjs` et `daisyui`
  du dépôt) avant d'être employées, après avoir lu la version installée dans `site/package.json`.
- Styles: daisyUI importé en CSS, aucune classe utilitaire Tailwind ni variante réactive (`sm:`,
  `md:`, `lg:`, `xl:`) dans le balisage; la mise en page réactive est dans
  `site/src/styles/global.css`.
- Interactivité: SolidJS seulement, dans l'île `site/src/components/Filtres.tsx`, selon le skill
  `solidjs`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: créer le sous-projet `site/` et brancher ses outils, sans rien casser à la racine.

- [x] T001 Créer `site/package.json` (`private`, `type: module`, `license: AGPL-3.0-or-later`, `engines.node: >=26 <27`, scripts `dev`, `build`, `preview`, `check`, `test`, `test:unit`, `test:build`, `test:e2e`) et installer avec `nub add` dans `site/`: `astro`, `daisyui`, `satteri`, puis l'intégration Solid avec `nub x astro add solid` (`solid-js`, `@astrojs/solid-js`); en développement: `postcss`, `@astrojs/check`, `typescript`, `linkedom`, `@playwright/test`, `@axe-core/playwright`, `@types/node`; `site/nub.lock` est commité
- [x] T002 Créer `site/astro.config.mjs` (sortie statique, `site` d'après `SITE_URL`, `base` d'après `SITE_BASE` avec `/` par défaut, intégration Solid), `site/tsconfig.json` (base stricte d'Astro, `allowImportingTsExtensions`, `jsx: preserve`, `jsxImportSource: solid-js`) et `site/.gitignore` (`dist/`, `.astro/`, `test-results/`, `playwright-report/`)
- [x] T003 [P] Écrire `site/test/styles.test.ts` puis le faire passer: le greffon `site/postcss/sans-variantes.mjs` retire d'une feuille de test toute règle dont le sélecteur porte un préfixe réactif (`.sm\:`, `.md\:`, `.lg\:`, `.xl\:`, `.2xl\:`) et garde les autres; aucun fichier de `site/src/` (`.astro`, `.tsx`) n'emploie une classe à préfixe `sm:`, `md:`, `lg:`, `xl:` ou `2xl:`. Créer `site/postcss.config.mjs` (charge le greffon) et `site/src/styles/global.css` (import de `daisyui/daisyui.css`, thème clair et thème sombre, style de focus visible, classes de mise en page du site avec requêtes média ou de conteneur)
- [x] T004 [P] Créer `site/playwright.config.ts` (Chromium, `webServer` qui lance `nub run preview` sur `site/dist`, dossier `test/e2e`) et vérifier que Chromium est disponible (`nub x playwright install chromium` sinon)
- [x] T005 Ajouter `"exclude": ["site", "dist", "node_modules"]` au `tsconfig.json` de la racine, et l'annotation `site/**` (`package.json`, `nub.lock`, `tsconfig.json`, `README.md`, `test/fixtures/**`) en `AGPL-3.0-or-later` dans `REUSE.toml`; vérifier à la racine que `nub run test`, `nub run typecheck` et `nub run licences` passent toujours

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: charger les données et fournir ce que toutes les pages partagent: adresses,
provenance, libellés, gabarit de page avec attribution.

**⚠️ CRITICAL**: aucun parcours ne peut commencer avant la fin de cette phase.

### Tests (à écrire d'abord, ils doivent échouer)

- [x] T006 [P] Créer les fixtures `site/test/fixtures/valide/` (cinq fichiers JSON minimaux: 2 catégories dont une sans outil actif, 6 outils couvrant enrichi complet, non enrichi, score estimé, retiré, service avec `instance_de` et `voir_aussi`, licence maison, Open Hub avec valeurs `null`) et `site/test/fixtures/invalide/` (un `outils.json` sans `meta`)
- [x] T007 [P] Écrire `site/test/donnees.test.ts`: `chargerDonnees(dossier)` rend les cinq tableaux; échoue avec un message nommant le fichier quand il est absent, JSON invalide, sans `meta` ou sans tableau; échoue en nommant l'outil et l'identifiant quand `categorie`, `source_repertoire_id` ou un tag est inconnu; échoue en nommant le champ quand un outil n'a pas `nom`, `categorie`, `score`, `lien`, `description` ou `source_repertoire_id`
- [x] T008 [P] Écrire `site/test/adresses.test.ts`: `identifiant(nom)` (« CIRA Canadian Shield / Bouclier canadien » → `cira-canadian-shield-bouclier-canadien`, « Élodia » → `elodia`, nom sans lettre ni chiffre → erreur); égalité avec `slug()` de `../../categories.ts` sur tous les noms de `../../outils.json`; `verifierUnicite(outils)` échoue en nommant les deux outils et l'identifiant; `adresseFiche(id, base)` et `adresseAccueil(base, parametres)` appliquent le chemin de base
- [x] T009 [P] Écrire `site/test/repertoire.test.ts`: `outilsActifs` écarte `removed`; `groupesParCategorie` suit l'ordre de `categories.json` et omet une catégorie sans outil actif; `statutDe(outil)` rend `source` ou `non-enrichi`; `apparentes(outil, actifs)` rend un lien pour un nom d'outil actif et le nom seul sinon; `sourceDe(outil, sources)`
- [x] T010 [P] Écrire `site/test/provenance.test.ts` et `site/test/libelles.test.ts`: chaque champ de la table de data-model.md a exactement une provenance parmi `source`, `heuristique`, `ia`, `openhub`; libellés « Produit par IA, à vérifier », « Déduit par ce dépôt », « Données publiques d'Open Hub »; `texteEtoiles(2)` → « 2 étoiles sur 3 »; libellés des quatre statuts et de « Pas encore enrichi »; `nomPays("FR")` → « France », `"EU"` → « Union européenne », `"UK"` → « Royaume-Uni », code inconnu rendu tel quel; nombres et dates au format français

### Implementation

- [x] T011 Implémenter `site/src/lib/donnees.ts` (`chargerDonnees(dossier = racine du dépôt ou variable DONNEES)`, types importés de la racine par `import type`) jusqu'à ce que T007 passe
- [x] T012 [P] Implémenter `site/src/lib/adresses.ts` jusqu'à ce que T008 passe
- [x] T013 [P] Implémenter `site/src/lib/repertoire.ts` jusqu'à ce que T009 passe
- [x] T014 [P] Implémenter `site/src/lib/provenance.ts` et `site/src/lib/libelles.ts` jusqu'à ce que T010 passe
- [x] T015 Créer `site/src/components/Provenance.astro` (libellé en texte visible, jamais par la couleur seule ni au survol), `site/src/components/Attribution.astro` (auteur·trices de Praxis, titre et lien de la note, « CC BY-SA 4.0 » lié, Services FACiLes et Charles d'après `sources.json`, phrase sur les champs d'IA, date `meta.updated_at`) et `site/src/layouts/Page.astro` (`<html lang="fr-CA">`, `<title>`, lien d'évitement, `<header>`, `<main id="contenu">`, `<footer>` avec `Attribution`), selon contracts/pages.md « Toutes les pages »
- [x] T016 Écrire `site/test/build/outils.ts` (bâtit le site une fois par `nub run build` si `site/dist` manque ou est plus vieux que les données, et lit une page de `site/dist` avec `linkedom`) et `site/test/build/commun.test.ts`: chaque page de `site/dist` a `lang="fr-CA"`, un seul `<h1>`, un `<main id="contenu">`, et dans son pied les trois noms des auteur·trices, « CC BY-SA 4.0 » avec son lien et le lien vers la note Praxis

**Checkpoint**: `nub run test:unit` passe; `Page.astro` est prêt; les tests du site bâti échouent
faute de pages.

---

## Phase 3: User Story 1 - Parcourir le répertoire par catégorie (Priority: P1) 🎯 MVP

**Goal**: une page d'accueil qui liste tous les outils actifs par catégorie, lisible sans
JavaScript.

**Independent Test**: bâtir le site et vérifier dans `site/dist/index.html` que chaque outil actif
figure une fois, sous sa catégorie, avec nom, score, statut et description, et un lien vers sa
fiche.

### Tests for User Story 1 ⚠️

- [x] T017 [P] [US1] Écrire `site/test/build/accueil.test.ts` d'après contracts/pages.md « Accueil »: une section par catégorie ayant un outil actif, dans l'ordre de `categories.json`, avec `<h2>`, et la description portant « Produit par IA, à vérifier »; une carte par outil actif de `outils.json`, une seule fois; chaque carte a un lien vers `/outils/<id>/`, le texte « N étoiles sur 3 », « score estimé » si et seulement si `score_estime`, le statut avec le libellé d'IA si et seulement si l'outil est enrichi, la description, et les attributs `data-categorie`, `data-tags`, `data-statut`, `data-nom`; aucun élément vide dans une carte; aucun outil `removed`

### Implementation for User Story 1

- [x] T018 [P] [US1] Créer `site/src/components/Etoiles.astro` (0 à 3 étoiles masquées aux lecteurs d'écran, équivalent textuel « N étoiles sur 3 », mention « score estimé » quand demandé)
- [x] T019 [US1] Créer `site/src/components/CarteOutil.astro` (nom lié à la fiche, `Etoiles`, statut avec `Provenance` si enrichi, description, attributs `data-*`), sans emplacement vide pour un champ absent
- [x] T020 [US1] Créer `site/src/pages/index.astro` (`<h1>`, introduction, compteur du total dans une région `aria-live="polite"`, sections de catégories avec icône masquée aux lecteurs d'écran, cartes) jusqu'à ce que T017 et T016 passent pour l'accueil
- [x] T021 [US1] Créer `site/src/pages/404.astro` (`<h1>` « Page introuvable », lien vers l'accueil)

**Checkpoint**: `nub run build` produit l'accueil; `accueil.test.ts` passe; la page se lit sans
JavaScript.

---

## Phase 4: User Story 2 - Lire la fiche d'un outil (Priority: P1)

**Goal**: une fiche par outil actif, avec tous les champs prévus, leur provenance, et aucun champ
vide.

**Independent Test**: ouvrir la fiche d'un outil enrichi (`/outils/nextcloud/`) et celle d'un outil
non enrichi (`/outils/en-commun/`): la première montre toutes les sections avec leur provenance, la
seconde seulement les champs de la source et les critères déduits.

### Tests for User Story 2 ⚠️

- [x] T022 [P] [US2] Écrire `site/test/criteres.test.ts`: `lecturesCriteres(outil, criteres)` rend la lecture « vérifiés » (pour chaque critère: `confirme` avec `preuves[id]`, `infirme` avec `infirmes[id]`, `indetermine` sans citation; modèle et date) seulement si `criteres_confirmes` existe, la lecture « déduits » (`criteres`, `confiance` dont « indéterminée ») toujours, et la lecture « second avis » (`score`, `criteres`, `confiance`, `ecart` s'il existe) seulement si `evaluation_enrichie` existe
- [x] T023 [P] [US2] Écrire `site/test/markdown.test.ts`: `rendreDescription(markdown)` rend paragraphes, listes, gras et italique; `# Titre` devient `<h3>`, `## Titre` `<h4>`, plafonné à `<h6>`; le HTML brut (`<script>`, `<img>`) est écarté ou échappé; les liens gardent leur adresse
- [x] T024 [P] [US2] Écrire `site/test/build/fiches.test.ts` d'après contracts/pages.md « Fiche »: une page `/outils/<id>/index.html` par outil actif; pour chaque fiche, les sections attendues d'après les champs de l'outil dans `outils.json`, dans l'ordre du contrat, et aucune autre; aucun titre, paragraphe, liste ou cellule vide; chaque section de provenance `ia` contient « Produit par IA, à vérifier »; une fiche d'outil non enrichi ne contient pas ce libellé; chaque citation de `preuves` et `infirmes` apparaît telle quelle dans un `<blockquote>`; la source de l'outil est nommée et liée; `lien` est lié; chaque nom de `voir_aussi` qui est un outil actif est un lien vers sa fiche; les liens internes de toutes les pages mènent à un fichier de `site/dist`

### Implementation for User Story 2

- [x] T025 [P] [US2] Implémenter `site/src/lib/criteres.ts` jusqu'à ce que T022 passe
- [x] T026 [P] [US2] Implémenter `site/src/lib/markdown.ts` avec Sätteri (`markdownToHtml` de `satteri`, un greffon mdast qui décale les titres et un qui remplace le HTML brut par du texte) jusqu'à ce que T023 passe
- [x] T027 [P] [US2] Créer `site/src/components/Criteres.astro`: les trois lectures sous leurs titres (« Critères vérifiés d'après la page de l'outil », « Critères déduits des étoiles », « Second avis du modèle »), chacune avec sa phrase d'explication et sa `Provenance`; verdict en texte (« Confirmé », « Infirmé », « Indéterminé »), citation dans un `<blockquote>`, mention « la page de l'outil ne permet pas de conclure » pour un critère indéterminé, « fiabilité indéterminée: l'outil n'est pas encore enrichi » le cas échéant
- [x] T028 [P] [US2] Créer `site/src/components/OpenHub.astro`: lien vers `https://www.openhub.net/p/<openhub_id>`, une ligne par valeur non `null` (`organisation`, `activite`, `licences`, `langage_principal`, `lignes_de_code`, `contributeurs_total`, `contributeurs_12_mois`, `commits_12_mois`), date `consulte_le` toujours affichée, libellé « Données publiques d'Open Hub »
- [x] T029 [US2] Créer `site/src/pages/outils/[id].astro` (`getStaticPaths` sur les outils actifs après `verifierUnicite`): sections dans l'ordre de contracts/pages.md (en-tête, description, description détaillée, critères, code source et licence avec `licence` ou `custom_license` lié à `custom_license_url`, tags avec description liés à l'accueil filtré, pays et logiciel sous-jacent avec la mention que description et critères portent sur lui, Open Hub, services remplacés avec le nom d'hôte comme texte du lien, voir aussi, source, retour); une section sans contenu n'est pas rendue; jusqu'à ce que T024 passe
- [x] T030 [US2] Écrire `site/test/build/echecs.test.ts` et corriger au besoin: `DONNEES=test/fixtures/invalide nub run build` sort avec un code non nul, un message qui nomme `outils.json`, et n'écrit pas de fiche; un jeu de fixtures avec deux noms de même identifiant échoue en nommant les deux outils; aucun fichier de `site/src/` n'appelle `fetch` ni n'importe `node:http`, `node:https` ou `node:net` (FR-025: le build ne fait aucun appel réseau)

**Checkpoint**: 154 fiches bâties; `fiches.test.ts` passe; US1 et US2 forment un site consultable.

---

## Phase 5: User Story 3 - Trouver un outil par filtre ou par nom (Priority: P2)

**Goal**: filtres à choix multiple par catégorie, tag et statut, recherche par nom, compteur, et
état dans l'adresse.

**Independent Test**: sur l'accueil, cocher des valeurs de chaque type et chercher un nom; les
outils affichés sont exactement ceux que la règle de contracts/filtres.md retient, et l'adresse
copiée restaure la même liste.

### Tests for User Story 3 ⚠️

- [x] T031 [P] [US3] Écrire `site/test/filtres.test.ts` d'après contracts/filtres.md: `normaliser("ÉLODIA ")` → `elodia`; `lireEtat(parametres, valeursConnues)` lit `categorie`, `tag` et `statut` répétés et `q`, ignore les valeurs inconnues, traite `q` vide comme absent; `ecrireEtat(etat, valeursConnues)` n'écrit que les choix actifs, dans l'ordre des données, et rend une chaîne vide sans choix; `lireEtat(ecrireEtat(e))` rend `e`; `retenu(outil, etat)`: « ou » dans un type, « et » entre les types et avec `q`, un type vide ne filtre rien, un tag choisi exclut un outil non enrichi, `non-enrichi` retient un outil sans statut
- [x] T032 [P] [US3] Écrire `site/test/e2e/filtres.spec.ts` (Playwright, sur `site/dist`): le formulaire est visible avec JavaScript; cocher deux statuts et une catégorie n'affiche que les outils attendus (comparés à `outils.json`) et met le compteur à jour; « elod » garde « Élodia »; une catégorie sans outil affiché est masquée; des choix sans intersection affichent « Aucun outil ne correspond à ces choix. » et « Effacer les filtres » rétablit la liste complète; l'adresse reflète les choix, et ouvrir cette adresse dans une nouvelle page affiche la même liste et les mêmes cases cochées; après deux cases cochées, le bouton précédent revient à une seule; une adresse avec `categorie=inconnue&statut=libre` applique seulement `statut=libre`; les liens de catégorie et de tag d'une fiche ouvrent l'accueil filtré; appliquer un filtre aux 154 cartes prend moins de 100 ms
- [x] T033 [P] [US3] Écrire `site/test/e2e/sans-javascript.spec.ts` (contexte `javaScriptEnabled: false`): l'accueil montre toutes les cartes, le formulaire de filtres n'est pas visible, les liens vers les fiches fonctionnent, une fiche montre tout son contenu

### Implementation for User Story 3

- [x] T034 [US3] Implémenter `site/src/lib/filtres.ts` (sans Solid, sans Astro, sans accès au DOM) jusqu'à ce que T031 passe
- [x] T035 [US3] Créer l'île Solid `site/src/components/Filtres.tsx` selon le skill `solidjs` (propriétés non déstructurées, `<For>` et `<Show>`, `class`): propriétés de configuration seulement (catégories, tags et statuts avec identifiant et libellé, total, chemin de base); formulaire portant `hidden` tant qu'un signal mis à vrai dans `onMount` ne l'a pas révélé; trois `<fieldset>` avec `<legend>` (« Catégorie », « Tag », « Statut du code source »), une case à cocher avec `<label>` par valeur (les cinq statuts dont « Pas encore enrichi »), champ de recherche avec `<label>` « Chercher un outil par son nom », bouton « Effacer les filtres » visible dès qu'un choix est actif, compteur « N outils affichés sur M » dans une région `aria-live="polite"`, message « Aucun outil ne correspond à ces choix. »; l'intégrer à `site/src/pages/index.astro` avec `client:load`
- [x] T036 [US3] Brancher le comportement dans `site/src/components/Filtres.tsx`: l'état est un store Solid initialisé dans `onMount` par `lireEtat` sur l'adresse; un effet applique `retenu` de `site/src/lib/filtres.ts` aux cartes statiques par leurs attributs `data-*` (attribut `hidden` sur les cartes et sur les sections de catégorie vides) et calcule le compteur; `history.pushState` pour les cases et le bouton d'effacement, `replaceState` pour la frappe; écoute `popstate` (retirée dans `onCleanup`) pour restaurer l'état; le bouton d'effacement rend le focus au formulaire; jusqu'à ce que T032 et T033 passent

**Checkpoint**: `nub run test:e2e` passe pour les filtres; le site reste entièrement lisible sans
JavaScript.

---

## Phase 6: User Story 4 - Savoir d'où viennent les données et comment les réutiliser (Priority: P2)

**Goal**: sur chaque page, l'attribution, la licence et la provenance de ce qui est affiché,
vérifiées sur tout le site.

**Independent Test**: ouvrir l'accueil et trois fiches de sources différentes (Praxis, FACiL,
Charles): attribution et licence dans le pied, source réelle de l'outil nommée et liée, chaque
champ d'IA signalé en texte.

### Tests for User Story 4 ⚠️

- [x] T037 [P] [US4] Écrire `site/test/build/provenance.test.ts`: sur chaque page, le pied nomme et lie les Services FACiLes et Charles d'après `sources.json` et contient la phrase sur les champs d'IA et la date des données; sur chaque fiche d'un outil de source `facil` ou `charles`, la section « Source » nomme cette source et non Praxis; sur toutes les fiches, chaque élément rendu d'un champ de provenance `ia` (table de `site/src/lib/provenance.ts`) est dans une section qui porte le libellé en texte (pas seulement dans un attribut `title` ou une classe); la section des critères vérifiés contient la phrase disant que le verdict est celui d'un modèle d'IA et que la citation permet de le contrôler; chacune des trois lectures porte son titre et son libellé de provenance

### Implementation for User Story 4

- [x] T038 [US4] Compléter `site/src/components/Attribution.astro`, `site/src/components/Provenance.astro`, `site/src/components/Criteres.astro` et `site/src/pages/outils/[id].astro` jusqu'à ce que T037 passe, sans dupliquer la table de provenance

**Checkpoint**: tous les tests du site bâti passent; aucune page sans attribution, aucun champ
d'IA sans signalement.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: accessibilité, téléphone, documentation, et retour du contenu durable dans le dépôt.

- [x] T039 [P] Écrire `site/test/e2e/accessibilite.spec.ts`: `@axe-core/playwright` (règles WCAG 2.1 A et AA) sans aucune violation sur l'accueil, l'accueil filtré, et les fiches de Nextcloud (enrichi, Praxis), d'un service FACiL, d'une alternative de Charles et d'En commun (non enrichi), en thème clair et en thème sombre; parcours au clavier seul: lien d'évitement, formulaire de filtres, une carte, sa fiche, retour, avec un focus visible à chaque étape
- [x] T040 Corriger les violations relevées par T039 dans `site/src/components/`, `site/src/layouts/Page.astro` et `site/src/styles/global.css` (contraste, noms accessibles, ordre des titres, focus), sans classe utilitaire ni variante réactive
- [x] T041 [P] Écrire `site/test/e2e/telephone.spec.ts` (fenêtre de 360 px de large): l'accueil et une fiche n'ont pas de défilement horizontal, et les filtres restent utilisables; corriger `site/src/styles/global.css` et les composants au besoin
- [x] T042 Relier `site/package.json`: `test` lance `test:unit` puis `test:build`; `check` lance `astro check`; vérifier dans `site/` que `nub run check`, `nub run test` et `nub run test:e2e` passent, et à la racine que `nub run test`, `nub run typecheck` et `nub run licences` passent
- [x] T043 Dérouler les 17 scénarios de `specs/001-site-consultation-repertoire/quickstart.md` et consigner le résultat de chacun dans ce fichier (section « Résultats »), dont le résumé sera reporté dans `historique.md` par T045 ; `git status` à la racine montre qu'aucun fichier de données, schéma ou script n'a changé (SC-010)
- [x] T044 [P] Créer `site/README.md` (ligne « Documentation », ce que fait le site, commandes, variables `SITE_URL`, `SITE_BASE` et `DONNEES`, tests, licences), avec des liens `../` vers la documentation de la racine; il reste hors de `FICHIERS_REDIGES` de `test/markdown.ts`, dont la ligne « Documentation » suppose des liens relatifs à la racine
- [x] T045 Reporter le contenu durable dans `implementation.md` (section sur le site: structure, lecture des données, provenance, filtres et adresse, tests, publication à décider), `README.md` (le site dans « En bref », les commandes, la table « Documentation », les licences) et `historique.md` (étape du site, décisions tirées de research.md, question ouverte de l'hébergeur)
- [x] T046 ~~Supprimer `specs/001-site-consultation-repertoire/` et `.specify/feature.json`~~ Remplacée le 2026-11-13: la constitution 1.2.0 conserve les dossiers `specs/`; lancer tous les contrôles une dernière fois

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: aucune dépendance.
- **Foundational (Phase 2)**: après Setup; bloque tous les parcours.
- **US1 (Phase 3)** et **US2 (Phase 4)**: après Foundational; indépendants l'un de l'autre, sauf
  que les liens des cartes (US1) mènent aux fiches (US2): le contrôle des liens internes est dans
  T024.
- **US3 (Phase 5)**: après US1 (les filtres agissent sur les cartes de l'accueil); les liens de
  catégorie et de tag des fiches (US2) sont vérifiés dans T032.
- **US4 (Phase 6)**: après US1 et US2 (vérifie ce qu'ils affichent).
- **Polish (Phase 7)**: après tous les parcours.

### Within Each User Story

- Les tests sont écrits et échouent avant l'implémentation.
- `src/lib/` avant les composants, les composants avant les pages.
- Un parcours est terminé quand ses tests passent, avant de passer au suivant.

### Parallel Opportunities

- Phase 1: T003 et T004 (après T001 et T002).
- Phase 2: T006 à T010 ensemble; puis T012, T013 et T014 ensemble.
- Phase 4: T022, T023 et T024 ensemble; puis T025 à T028 ensemble.
- Phase 5: T031, T032 et T033 ensemble.
- Phase 7: T039, T041 et T044 ensemble.

---

## Parallel Example: User Story 2

```bash
# Les trois tests de la fiche, ensemble:
Task: "Écrire site/test/criteres.test.ts"
Task: "Écrire site/test/markdown.test.ts"
Task: "Écrire site/test/build/fiches.test.ts"

# Puis les fonctions et composants indépendants, ensemble:
Task: "Implémenter site/src/lib/criteres.ts"
Task: "Implémenter site/src/lib/markdown.ts"
Task: "Créer site/src/components/Criteres.astro"
Task: "Créer site/src/components/OpenHub.astro"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) et Phase 2 (Foundational).
2. Phase 3 (US1): la liste par catégorie.
3. **Valider**: `nub run build`, `nub run test`, lecture de l'accueil sans JavaScript.

### Incremental Delivery

1. Setup et Foundational: le sous-projet bâtit une page vide avec son pied d'attribution.
2. US1: le répertoire est lisible en liste.
3. US2: chaque outil a sa fiche; le site est utile tel quel.
4. US3: filtres et recherche.
5. US4: la provenance est vérifiée sur tout le site.
6. Polish: accessibilité, téléphone, documentation, retour dans `implementation.md` et
   `historique.md`, suppression de `specs/`.

Un commit par tâche ou par petit groupe de tâches, chacun avec tous les contrôles verts.

---

## Phase 8: Convergence

- [x] T047 Appliquer le thème sombre de daisyUI selon la préférence du système (`prefers-color-scheme: dark`) par un greffon PostCSS testé dans `site/postcss/` et `site/test/styles.test.ts`, et faire vérifier par `site/test/e2e/accessibilite.spec.ts` que le fond de page est sombre quand le thème sombre est demandé per T003, T039 (partial)
- [x] T048 Signaler dans `site/src/components/Filtres.tsx` que les statuts du code source et les tags sont produits par IA, à vérifier, avec un test dans `site/test/build/accueil.test.ts` per FR-016 (partial)

---

## Résultats

Validation du 2026-11-13 (T043). Les 17 scénarios de [quickstart.md](quickstart.md) passent.

| Scénarios | Vérifiés par | Résultat |
|---|---|---|
| 1, 2, 3, 4, 5, 14 (liste, score estimé, fiches, service et logiciel, attribution) | `site/test/build/*.test.ts` (34 tests, sur les 154 outils) | Réussi |
| 6, 7, 8, 9, 10 (filtres, recherche, aucun résultat, adresse partagée, bouton précédent) | `site/test/e2e/filtres.spec.ts` | Réussi |
| 11 (sans JavaScript) | `site/test/e2e/sans-javascript.spec.ts` | Réussi |
| 12, 13 (clavier seul, accessibilité axe A et AA, thèmes clair et sombre) | `site/test/e2e/accessibilite.spec.ts` | Réussi |
| 15 (données invalides) | `site/test/build/echecs.test.ts` | Réussi |
| 16 (données intactes) | `git status`: aucun fichier de données, schéma ou script de la racine modifié | Réussi |
| 17 (téléphone, 360 px) | `site/test/e2e/telephone.spec.ts` | Réussi |

Totaux: 62 tests unitaires, 34 tests du site bâti, 34 tests dans Chromium; `nub run check` sans erreur.

---

## Phase 9: Dépôt et build dans le pied de page (amendement du 2026-11-13)

**Goal**: le dépôt est déclaré dans `package.json`; chaque page lie le dépôt et dit de quelle version
et quand le site a été bâti (FR-037, FR-038).

- [ ] T049 Ajouter le champ `repository` (`git+https://github.com/millette/repsouv.git`) au `package.json` de la racine et à `site/package.json` (avec `directory: "site"`), et `homepage` (`https://millette.github.io/repsouv/`) aux deux
- [ ] T050 [P] Écrire `site/test/depot.test.ts`: `adresseDepot(paquet)` rend `https://github.com/millette/repsouv` pour `git+https://…/repsouv.git`, pour `https://…/repsouv`, pour `git@github.com:millette/repsouv.git` et pour un champ `repository` en chaîne, et rien si le champ manque; `infosBuild({ lirePaquet, git, maintenant })` rend l'adresse du dépôt, le hash complet et court (7 caractères), l'adresse du commit (`<dépôt>/commit/<hash>`) et la date ISO du build; si `git` échoue, le hash, le hash court et l'adresse du commit sont absents; `formaterDateHeure(iso)` écrit la date et l'heure en français, à l'heure de Toronto
- [ ] T051 [P] Ajouter à `site/test/build/commun.test.ts`: le pied de chaque page a un lien « Code source et données » vers l'adresse du dépôt déclarée dans `../package.json`; un lien dont le texte est un hash de 7 caractères hexadécimaux, vers `<dépôt>/commit/<hash complet>`, où ce hash désigne un commit qui existe dans le dépôt (`git cat-file -e`); un élément `<time datetime>` dont la date est celle d'un build récent (moins d'un jour); toutes les pages portent le même hash
- [ ] T052 Implémenter `site/src/lib/depot.ts` jusqu'à ce que T050 passe, et compléter `site/src/components/Attribution.astro` et `site/src/lib/site.ts` (infos du build calculées une fois) jusqu'à ce que T051 passe
- [ ] T053 Reporter dans `implementation.md` (pied de page), `site/README.md`, `README.md` et `historique.md`; vérifier que tous les contrôles passent

