---
description: "Liste des tâches de l'explorateur interactif des outils"
---

# Tasks: Explorateur interactif des outils

**Input**: Design documents from `/specs/002-explorateur-outils/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/adresse.md, contracts/donnees.md, contracts/pages.md, quickstart.md

**Tests**: inclus. La constitution (principe V) impose le test rouge avant le code.

**Organization**: les tâches sont groupées par parcours (user story).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: réalisable en parallèle (fichiers différents, aucune dépendance sur une tâche inachevée)
- **[Story]**: le parcours de spec.md que la tâche sert (US1 à US6)

## Conventions

- Tout le code est sous `site/`; les commandes `nub …` se lancent dans `site/`, sauf mention « à la
  racine ». En-têtes SPDX (`AGPL-3.0-or-later`) dans chaque fichier `.ts`, `.tsx`, `.astro`, `.css`.
- Skill `solidjs` du dépôt pour l'île: SolidJS seule couche d'interactivité, propriétés non
  déstructurées, `<For>`, `<Show>`, `class`; daisyUI en CSS seul, aucune variante réactive.
- La logique vit dans `site/src/lib/`, sans Solid, sans Astro et sans accès au DOM.
- Avant chaque commit: `nub run test`, `nub run typecheck` et `nub run licences` à la racine;
  `nub run check`, `nub run test` et `nub run test:e2e` dans `site/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: aucune dépendance à installer; fixtures à compléter pour les nouveaux cas.

- [x] T001 Compléter les fixtures `site/test/fixtures/valide/` pour couvrir l'explorateur: au moins deux catégories avec des outils actifs, deux pays, un outil dont un verdict est « indéterminé » au milieu de verdicts rendus, un outil au score 3 et un au score 0; ajuster les tests unitaires existants (`site/test/donnees.test.ts`, `site/test/repertoire.test.ts`, `site/test/criteres.test.ts`) aux nouveaux comptes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: le fichier de données de l'explorateur et son chargement, dont tous les parcours dépendent.

### Tests (à écrire d'abord, ils doivent échouer)

- [x] T002 [P] Écrire `site/test/explorateur.test.ts` d'après contracts/donnees.md: `donneesExplorateur(donnees)` rend exactement les outils actifs, dans l'ordre des données, avec `id` (slug du nom) unique; champs toujours présents `id`, `nom`, `categorie`, `score`, `statut`, `tags`, `source`, `enrichi`, `remplace`, `deduits`, `description`; `scoreEstime`, `pays`, `licence` et `verdicts` présents seulement s'ils ont une valeur, aucun champ `null`; `statut` vaut `non-enrichi` sans `source`; `licence` vaut `licence`, sinon `custom_license`; `remplace` porte les noms d'hôte de `alternative_a`; `verdicts` donne `confirme`, `infirme` ou `indetermine` pour chacun des trois critères d'un outil vérifié; `categories`, `tags`, `sources` et `pays` ne contiennent que les valeurs d'un outil actif, `pays` avec son nom français, trié par nom; `meta` porte `data_license` et `updated_at`
- [x] T003 [P] Écrire `site/test/chargement.test.ts`: `chargerExplorateur(adresse, lire)` (où `lire` remplace `fetch` dans le test) rend les données d'une réponse valide; lève une erreur en français pour une réponse HTTP en erreur, pour un corps qui n'est pas du JSON, et pour un objet sans tableau `outils`, `categories`, `tags`, `sources`, `criteres` ou `pays`; `adresseDonnees(base)` rend `<base>explorateur.json` pour `/` et pour `/repertoire/`

### Implementation

- [x] T004 Implémenter `site/src/lib/explorateur.ts` (types `OutilExplorateur`, `DonneesExplorateur`, fonction `donneesExplorateur`) jusqu'à ce que T002 passe
- [x] T005 [P] Implémenter `site/src/lib/chargement.ts` (`chargerExplorateur`, `adresseDonnees`) jusqu'à ce que T003 passe; resserrer le test « aucun appel réseau » de `site/test/build/echecs.test.ts`: `fetch` n'est admis que dans `site/src/lib/chargement.ts`
- [x] T006 Écrire `site/test/build/explorateur.test.ts` puis créer `site/src/pages/explorateur.json.ts` (point de terminaison statique qui écrit `donneesExplorateur(site())`) jusqu'à ce qu'il passe: `site/dist/explorateur.json` existe, est du JSON valide, contient autant d'outils que d'outils actifs dans `../outils.json`, ne contient ni `description_longue` ni citation, et pèse moins de 150 ko

**Checkpoint**: `nub run build` écrit `explorateur.json`; les tests unitaires et du site bâti passent.

---

## Phase 3: User Story 6 - Comprendre le projet et lire la liste sans JavaScript (Priority: P2, faite en premier)

**Goal**: l'accueil présente le projet; la liste par catégorie est sur la page « Outils », sans
filtres; chaque page porte la navigation. Faite avant l'explorateur parce qu'elle retire l'île de
filtres de la tranche 001 et fixe la page vers laquelle l'explorateur renvoie.

**Independent Test**: sans JavaScript, `/` présente le projet et `/outils/` liste les 154 outils
par catégorie, chacun lié à sa fiche.

### Tests for User Story 6 ⚠️

- [x] T007 [P] [US6] Renommer `site/test/build/accueil.test.ts` en `site/test/build/outils.test.ts` et l'adapter à `outils/index.html`: mêmes vérifications des sections et des cartes, sauf celle des attributs de filtre `data-categorie`, `data-tags`, `data-statut` et `data-nom`, retirée avec eux; la page n'a ni `form`, ni île (`astro-island`) de filtres; elle indique le nombre total d'outils et lie `/explorer/`
- [x] T008 [P] [US6] Écrire `site/test/presentation.test.ts` et `site/test/build/accueil.test.ts`: `presentation.ts` expose les logiciels utilisés (nom, adresse, rôle) et les étapes de la genèse; chaque logiciel cité figure dans `../README.md`, dans `../implementation.md` ou dans les dépendances de `../package.json` ou de `package.json` du site (FR-045); l'accueil bâti a les sections « Le répertoire », « Genèse », « Crédits » et « Logiciels utilisés », nomme les trois auteur·trices et chaque source de `sources.json`, affiche le nombre d'outils, de catégories et de sources calculés depuis les données, lie `/outils/` et `/explorer/`, et ne contient aucune carte d'outil ni formulaire
- [x] T009 [P] [US6] Ajouter à `site/test/build/commun.test.ts`: chaque page a un `<nav aria-label="Navigation principale">` avec les liens « Accueil », « Outils » et « Explorer »; `aria-current="page"` est sur « Accueil » pour `index.html`, sur « Outils » pour `outils/index.html` et pour chaque fiche, sur « Explorer » pour `explorer/index.html`, et sur aucun pour `404.html`; le premier lien de la page reste le lien d'évitement; adapter dans `site/test/build/fiches.test.ts` les liens de catégorie et de tag attendus (`/explorer/?categorie=…`, `/explorer/?tag=…`)

### Implementation for User Story 6

- [x] T010 [US6] Créer `site/src/components/Navigation.astro` (propriété `courante`: `accueil`, `outils`, `explorer` ou aucune; page en cours avec `aria-current="page"` et un style qui ne repose pas sur la couleur seule) et l'intégrer à `site/src/layouts/Page.astro`, qui reçoit `courante`; ajouter `adresseOutils(base)` et `adresseExplorer(base, parametres)` à `site/src/lib/adresses.ts` avec leurs tests dans `site/test/adresses.test.ts`
- [x] T011 [US6] Créer `site/src/pages/outils/index.astro` avec la liste par catégorie de l'ancien accueil (sections, `CarteOutil`, total, lien vers l'explorateur), sans île; supprimer `site/src/components/Filtres.tsx`, `site/test/e2e/filtres.spec.ts` et les attributs `data-categorie`, `data-tags`, `data-statut`, `data-nom` de `site/src/components/CarteOutil.astro`; jusqu'à ce que T007 passe
- [x] T012 [US6] Écrire `site/src/lib/presentation.ts` et refaire `site/src/pages/index.astro` en page de présentation selon contracts/pages.md « Accueil », jusqu'à ce que T008 passe
- [x] T013 [US6] Dans `site/src/pages/outils/[id].astro`, faire mener la catégorie et les tags à l'explorateur (`adresseExplorer`), et passer `courante="outils"`; adapter `site/test/e2e/sans-javascript.spec.ts`, `site/test/e2e/accessibilite.spec.ts`, `site/test/e2e/telephone.spec.ts` et `site/test/e2e/theme.spec.ts` aux nouvelles pages; jusqu'à ce que T009 et tous les tests existants passent

**Checkpoint**: le site se bâtit avec l'accueil de présentation, la page « Outils » et la navigation; plus aucun filtre hors de l'explorateur à venir.

---

## Phase 4: User Story 1 - Explorer, trier et filtrer tous les outils (Priority: P1) 🎯 MVP

**Goal**: la page « Explorer » montre tous les outils, triés et filtrés sans rechargement, avec le
nombre de résultats.

**Independent Test**: sur `/explorer/`, un tri et un filtre de chaque type donnent exactement les
outils et l'ordre que les données donnent.

### Tests for User Story 1 ⚠️

- [x] T014 [P] [US1] Écrire `site/test/selection.test.ts` d'après data-model.md « Règle de sélection »: sans choix tout outil est retenu; « ou » dans `categories`, `tags`, `statuts`, `pays`, `sources`; « et » entre les filtres; `q` sans égard à la casse ni aux accents; `scoreMin` retient `score >= scoreMin`; un verdict demandé exige des critères vérifiés et ce verdict (un outil non vérifié n'est retenu par aucun verdict, pas même `indetermine`); un outil sans pays n'est retenu par aucun choix de pays; `enrichi` `oui` et `non`
- [x] T015 [P] [US1] Écrire `site/test/tri.test.ts` d'après data-model.md « Règle de tri »: par nom en ordre français sans égard à la casse ni aux accents (« Élodia » avant « Framapad », « outil 2 » avant « outil 10 »); par score, égalités par nom croissant; par catégorie selon le rang des catégories, égalités par nom; `desc` inverse la clé mais pas le départage par nom; la fonction ne modifie pas le tableau reçu
- [x] T016 [P] [US1] Écrire `site/test/etat.test.ts` d'après contracts/adresse.md: `etatParDefaut()`; `lireEtat(parametres, connues)` lit chaque paramètre, ignore les valeurs inconnues, applique le défaut pour `score` hors de 1 à 3 et pour `tri`, `sens`, `vue`, `enrichi` ou un verdict inconnus; `ecrireEtat(etat, connues, actuels)` n'écrit que ce qui diffère du défaut, dans l'ordre fixe du contrat, rend une chaîne vide sans choix et conserve les paramètres étrangers; `lireEtat(ecrireEtat(e))` rend `e`; `filtresActifs(etat)` dit si un filtre est actif (le tri et la vue n'en sont pas)
- [x] T017 [P] [US1] Écrire `site/test/e2e/explorateur.spec.ts` (résultats attendus calculés depuis `explorateur.json` bâti et les fonctions de `site/src/lib/`): au départ tous les outils dans l'ordre par défaut et le compteur « N outils affichés sur N »; tri par score décroissant puis par nom, le tri en cours étant écrit en texte; chaque filtre seul (score minimal, verdict d'un critère, pays, source, enrichi, catégorie, tag, statut, recherche) puis une combinaison; aucun résultat: message et « Effacer les choix » qui rétablit tout; le nom d'un résultat mène à sa fiche; un filtre s'applique en moins de 100 ms

### Implementation for User Story 1

- [x] T018 [P] [US1] Implémenter `site/src/lib/selection.ts` jusqu'à ce que T014 passe
- [x] T019 [P] [US1] Implémenter `site/src/lib/tri.ts` jusqu'à ce que T015 passe
- [x] T020 [US1] Implémenter `site/src/lib/etat.ts` jusqu'à ce que T016 passe, et réduire `site/src/lib/filtres.ts` à `normaliser()` (son test `site/test/filtres.test.ts` ne garde que ce cas)
- [x] T021 [US1] Créer `site/src/pages/explorer.astro` (`<h1>` « Explorer les outils », île `Explorateur` en `client:only="solid-js"` avec l'adresse des données et le chemin de base en propriétés, contenu d'attente « Chargement des outils… », bloc `<noscript>` avec lien vers « Outils », `courante="explorer"`) et `site/src/components/Explorateur.tsx` (ressource par `createResource` et `chargerExplorateur`, sous `<Suspense>` et `<ErrorBoundary>`; store de l'état initialisé depuis l'adresse)
- [x] T022 [US1] Créer `site/src/components/explorateur/Commandes.tsx` (recherche, « Trier par » et sens, groupes repliables avec légende pour chaque filtre de contracts/pages.md, libellé « Produit par IA, à vérifier » sur les groupes statut, tag et verdict, « Effacer les choix ») et `site/src/components/explorateur/Resultats.tsx` (vue en cartes: nom lié à la fiche, score en texte et « score estimé », statut avec son libellé d'IA, description; compteur dans une région `aria-live="polite"`; message d'aucun résultat), branchés dans `Explorateur.tsx` avec `selection.ts` et `tri.ts`; styles dans `site/src/styles/global.css`; jusqu'à ce que T017 passe

**Checkpoint**: l'explorateur trie et filtre; l'adresse n'est pas encore synchronisée.

---

## Phase 5: User Story 2 - Comparer deux à quatre outils côte à côte (Priority: P1)

**Goal**: choisir des outils et les comparer ligne par ligne, au-dessus des résultats.

**Independent Test**: choisir deux puis quatre outils: le tableau montre pour chacun les lignes de
data-model.md, avec leur provenance et sans case vide.

### Tests for User Story 2 ⚠️

- [x] T023 [P] [US2] Écrire `site/test/comparaison.test.ts`: `basculer(liste, id)` ajoute ou retire un outil et refuse un cinquième en le signalant; `comparable(liste)` est vrai de 2 à 4; `lignesComparaison(outils, criteres, pays)` rend, dans l'ordre de data-model.md, score, un verdict par critère, critères déduits, statut, licence, pays, services remplacés, avec pour une information absente « Non vérifié », « Aucun », « Pas encore enrichi », « Non connue », « Non connu », « Aucun connu »; chaque ligne porte sa provenance (`source`, `heuristique`, `ia`)
- [x] T024 [P] [US2] Écrire `site/test/e2e/comparaison.spec.ts`: avec un outil choisi, « Choisir au moins deux outils pour les comparer. »; avec deux puis quatre, un tableau avec légende, un outil par colonne lié à sa fiche, les lignes attendues calculées depuis les données; un cinquième est refusé avec « La comparaison est limitée à quatre outils. »; « Retirer <nom> » met le tableau à jour et le referme à un seul outil; « Vider la comparaison »; un outil comparé reste quand un filtre l'exclut des résultats; un outil enrichi comparé à un outil non enrichi montre « Non vérifié » et « Pas encore enrichi »; les libellés « Produit par IA, à vérifier », « Déduit par ce dépôt » et « score estimé » sont en texte dans le tableau

### Implementation for User Story 2

- [x] T025 [US2] Implémenter `site/src/lib/comparaison.ts` jusqu'à ce que T023 passe
- [x] T026 [US2] Créer `site/src/components/explorateur/Comparaison.tsx` (`<table>` avec légende, `<th scope="col">` par outil avec lien vers la fiche et bouton « Retirer <nom> », `<th scope="row">` par ligne avec son libellé de provenance, conteneur qui défile seul en largeur, bouton « Vider la comparaison », messages à un outil et au cinquième dans une région annoncée), ajouter la case « Comparer <nom> » à chaque carte de `Resultats.tsx`, et brancher le tout dans `Explorateur.tsx`, jusqu'à ce que T024 passe

**Checkpoint**: tri, filtres et comparaison fonctionnent en cartes.

---

## Phase 6: User Story 3 - Choisir entre cartes et tableau (Priority: P2)

**Goal**: les mêmes résultats en cartes ou en tableau.

**Independent Test**: après des filtres et un tri, les deux vues montrent les mêmes outils dans le
même ordre, et les outils choisis à comparer sont conservés.

- [x] T027 [P] [US3] Écrire `site/test/e2e/vues.spec.ts`: « Tableau » affiche un `<table>` avec légende et les colonnes Comparer, Nom, Catégorie, Score, Statut du code source, Pays, Source; mêmes outils et même ordre que les cartes après un tri et un filtre; le nom mène à la fiche; l'en-tête « Statut du code source » porte « Produit par IA, à vérifier »; un score estimé est dit estimé dans sa cellule; l'en-tête de la colonne triée porte `aria-sort`; une case « comparer » cochée en cartes l'est encore en tableau
- [x] T028 [US3] Ajouter la vue en tableau à `site/src/components/explorateur/Resultats.tsx` et le choix « Cartes » ou « Tableau » à `Commandes.tsx`, avec les styles du tableau (conteneur qui défile seul en largeur) dans `site/src/styles/global.css`, jusqu'à ce que T027 passe

---

## Phase 7: User Story 4 - Partager et retrouver un état de l'explorateur (Priority: P2)

**Goal**: l'adresse porte tout l'état; un lien le restaure; le bouton précédent fonctionne.

**Independent Test**: faire des choix de tri, de filtres, de vue et de comparaison, ouvrir
l'adresse copiée ailleurs: tout est restauré.

- [x] T029 [P] [US4] Écrire `site/test/e2e/adresse.spec.ts`: après des choix de chaque type, l'adresse est celle que `ecrireEtat` donne; l'ouvrir dans une nouvelle page restaure tri, sens, filtres, vue et outils comparés (commandes cochées comprises); sans choix l'adresse est `/explorer/`; trois choix puis trois retours ramènent pas à pas aux états précédents; la frappe dans la recherche n'ajoute qu'une entrée d'historique; `?categorie=inconnue&tri=bidon&comparer=absent&score=9` affiche la liste complète sans erreur; plus de quatre `comparer` n'en retiennent que quatre; les liens de catégorie et de tag d'une fiche ouvrent l'explorateur filtré
- [x] T030 [US4] Dans `site/src/components/Explorateur.tsx`, synchroniser l'état et l'adresse: lecture au montage une fois les données connues, `history.pushState` pour les choix discrets, `replaceState` pour la frappe, écoute de `popstate` (retirée dans `onCleanup`), jusqu'à ce que T029 passe

---

## Phase 8: User Story 5 - Toujours savoir où en est la page (Priority: P2)

**Goal**: chargement, erreur et absence de JavaScript ont chacun leur message.

**Independent Test**: ralentir puis faire échouer `explorateur.json`, puis désactiver JavaScript:
chaque cas affiche son message, jamais une zone vide.

- [x] T031 [P] [US5] Écrire `site/test/e2e/etats.spec.ts`: avec `explorateur.json` retardé (route interceptée), « Chargement des outils… » est visible dans une région `role="status"`; avec une réponse 500, puis avec un corps invalide, un message `role="alert"` dit que les outils n'ont pas pu être chargés, avec « Réessayer » et un lien vers « Outils »; « Réessayer » après rétablissement de la route affiche la liste; sans JavaScript, `/explorer/` montre le message et le lien vers « Outils », et `/`, `/outils/` et une fiche montrent tout leur contenu
- [x] T032 [US5] Compléter `site/src/components/Explorateur.tsx` et `site/src/pages/explorer.astro` (contenu d'attente, repli de `<Suspense>`, repli de `<ErrorBoundary>` avec « Réessayer » qui relance la ressource, `<noscript>`) jusqu'à ce que T031 passe

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T033 [P] Étendre `site/test/e2e/accessibilite.spec.ts`: aucune violation axe A ou AA sur l'accueil, la page « Outils », l'explorateur en cartes, en tableau et avec une comparaison de quatre outils, en thème clair et sombre; parcours au clavier seul sur l'explorateur (chercher, filtrer, trier, choisir deux outils, lire la comparaison, ouvrir une fiche) avec un focus visible; corriger les violations dans `site/src/components/` et `site/src/styles/global.css`
- [x] T034 [P] Étendre `site/test/e2e/telephone.spec.ts` (360 px): l'accueil, la page « Outils », l'explorateur en cartes, en tableau et avec une comparaison de quatre outils n'ont pas de défilement horizontal de la page; corriger les styles au besoin
- [x] T035 Relire à la main que tout le texte des trois pages est en français (FR-037) et qu'on compare trois outils connus en moins d'une minute (SC-003); dérouler les 21 scénarios de `specs/002-explorateur-outils/quickstart.md`, consigner les résultats dans ce fichier (section « Résultats »), et vérifier par `git status` à la racine qu'aucun fichier de données, schéma ou script n'a changé
- [x] T036 Reporter le contenu durable: `implementation.md` (section du site: pages, explorateur, fichier de données, état dans l'adresse, tests), `README.md`, `site/README.md` et `historique.md` (étape, décisions, changements apportés à la tranche 001, dont les anciennes adresses filtrées de l'accueil qui ne filtrent plus); ajouter en tête de `specs/001-site-consultation-repertoire/contracts/pages.md` et `contracts/filtres.md` une note disant ce que la tranche 002 remplace; vérifier que tous les contrôles passent

---

## Dependencies & Execution Order

- **Setup, Foundational**: d'abord; bloquent tout.
- **US6 (Phase 3)**: avant l'explorateur, parce qu'elle retire les filtres de la tranche 001 et crée la page « Outils » vers laquelle l'explorateur renvoie.
- **US1 (Phase 4)**: après Foundational et US6. **US2, US3, US4, US5**: après US1; indépendantes entre elles, mais toutes modifient `Explorateur.tsx`, donc réalisées dans l'ordre.
- **Polish**: à la fin.

### Parallel Opportunities

- T002 et T003; T007, T008 et T009; T014 à T017; T018 et T019; T023 et T024; T033 et T034.

## Parallel Example: User Story 1

```bash
Task: "Écrire site/test/selection.test.ts"
Task: "Écrire site/test/tri.test.ts"
Task: "Écrire site/test/etat.test.ts"
Task: "Écrire site/test/e2e/explorateur.spec.ts"
```

## Implementation Strategy

1. Setup et Foundational: le fichier de données existe.
2. US6: le site est réorganisé (accueil, « Outils », navigation), sans filtre nulle part.
3. US1: l'explorateur trie et filtre (MVP de la tranche).
4. US2, US3, US4, US5: comparaison, tableau, adresse, états.
5. Polish: accessibilité, téléphone, validation, documentation.

Un commit par parcours, tous les contrôles verts.

---

## Résultats

Validation du 2026-11-13 (T035). Les 21 scénarios de [quickstart.md](quickstart.md) passent.

| Scénarios | Vérifiés par | Résultat |
|---|---|---|
| 1 à 4 (tous les outils, tri, chaque filtre, aucun résultat) | `site/test/e2e/explorateur.spec.ts`, `site/test/selection.test.ts`, `site/test/tri.test.ts` | Réussi |
| 5 (vues) | `site/test/e2e/vues.spec.ts` | Réussi |
| 6, 7 (comparaison, cases sans valeur) | `site/test/e2e/comparaison.spec.ts`, `site/test/comparaison.test.ts` | Réussi |
| 8, 9, 10 (adresse partagée, bouton précédent, adresse abîmée) | `site/test/e2e/adresse.spec.ts`, `site/test/etat.test.ts` | Réussi |
| 11, 12, 13 (chargement lent, échec et « Réessayer », sans JavaScript) | `site/test/e2e/etats.spec.ts`, `site/test/e2e/sans-javascript.spec.ts` | Réussi |
| 14 (provenance) | `site/test/e2e/explorateur.spec.ts`, `site/test/e2e/comparaison.spec.ts`, `site/test/e2e/vues.spec.ts` | Réussi |
| 15, 16, 17, 18 (accueil, page « Outils », liens des fiches, navigation) | `site/test/build/accueil.test.ts`, `outils.test.ts`, `fiches.test.ts`, `commun.test.ts` | Réussi |
| 19, 20 (clavier, accessibilité, téléphone) | `site/test/e2e/accessibilite.spec.ts`, `site/test/e2e/telephone.spec.ts` | Réussi |
| 21 (données intactes) | `git status`: aucun fichier de données, schéma ou script de la racine modifié | Réussi |

Totaux: 97 tests unitaires, 45 tests du site bâti, 79 tests dans Chromium; `nub run check` sans erreur.

Relecture à la main: tout le texte des trois pages est en français (FR-037). SC-003 (comparer trois outils connus en
moins d'une minute) n'a pas été chronométré avec une personne; le parcours au clavier de
`accessibilite.spec.ts` (chercher, filtrer, choisir deux outils, lire la comparaison) s'exécute en moins de deux secondes.

---

## Phase 10: User Story 7 - Consulter tous les détails d'un outil sans quitter l'explorateur (amendement du 2026-11-13)

**Goal**: une boîte modale de l'explorateur montre tous les détails d'un outil, ceux de sa fiche;
la fiche reste la page de l'outil.

**Independent Test**: dans l'explorateur, « Détails » d'un outil ouvre une boîte qui montre les
sections de sa fiche; la fermer rend l'explorateur dans le même état.

### Tests for User Story 7 ⚠️

- [x] T037 [P] [US7] Ajouter à `site/test/etat.test.ts`: l'état par défaut a `fiche: ""`; `lireEtat("fiche=automate")` rend l'identifiant d'un outil connu et ignore un outil inconnu; `ecrireEtat` écrit `fiche` en dernier, après `comparer`, et rien quand il est vide; l'aller-retour conserve `fiche`; `filtresActifs` ne compte pas `fiche`
- [x] T038 [P] [US7] Ajouter à `site/test/chargement.test.ts`: `chargerFiche(adresse, lire)` rend le texte d'une réponse valide et lève une erreur en français pour une réponse en erreur ou une panne; `contenuFiche(document)` (document lu avec linkedom) rend le titre (texte du `<h1>`) et le HTML du contenu principal sans le `<h1>` ni le lien de retour, et lève une erreur si la page n'a pas de contenu principal
- [x] T039 [P] [US7] Écrire `site/test/e2e/details.spec.ts`: « Détails de <nom> » sur une carte ouvre un `<dialog>` modal nommé par l'outil, avec « Chargement des détails… » puis les mêmes sections (`data-section`) que la fiche de l'outil et ses libellés de provenance; de même depuis une ligne du tableau et depuis une colonne de la comparaison; un outil non enrichi n'y montre aucun libellé d'IA; « Ouvrir la fiche » mène à la fiche; la boîte se ferme par « Fermer », par Échap et par un clic hors d'elle, le focus revient sur le bouton « Détails », et le tri, les filtres, la vue et la comparaison sont inchangés; l'adresse porte `fiche=<id>`, l'ouvrir ailleurs rouvre la boîte, le bouton précédent la ferme; `fiche=inconnu` n'ouvre rien; quand la fiche ne se charge pas (route en échec), la boîte montre un message `role="alert"` et le lien vers la fiche; le focus reste dans la boîte à la tabulation

### Implementation for User Story 7

- [x] T040 [US7] Étendre `site/src/lib/etat.ts` (`fiche`) jusqu'à ce que T037 passe, et `site/src/lib/chargement.ts` (`chargerFiche`, `contenuFiche`) jusqu'à ce que T038 passe
- [x] T041 [US7] Créer `site/src/components/explorateur/Details.tsx` (dialog natif, classes « modal » de daisyUI, `showModal()` et `close()`, ressource de la fiche sous `<Suspense>` et `<ErrorBoundary>`, titre, « Fermer », « Ouvrir la fiche », arrière-plan `method="dialog"`), ajouter le bouton « Détails » aux cartes et aux lignes de `Resultats.tsx` et aux colonnes de `Comparaison.tsx`, brancher l'ouverture et la fermeture dans `Explorateur.tsx` (état `fiche`, adresse), styles dans `site/src/styles/global.css`, jusqu'à ce que T039 passe
- [x] T042 [P] [US7] Étendre `site/test/e2e/accessibilite.spec.ts` (aucune violation axe A ou AA avec la boîte ouverte, thèmes clair et sombre) et `site/test/e2e/telephone.spec.ts` (boîte ouverte à 360 px: pas de défilement horizontal de la page); corriger au besoin
- [x] T043 [US7] Reporter dans `implementation.md` (paragraphe « Explorateur »), `site/README.md` et `historique.md`; vérifier que tous les contrôles passent

### Résultats de la phase 10

Validation du 2026-11-13: les sept scénarios de US7 passent, par `site/test/e2e/details.spec.ts` (10 tests),
`site/test/etat.test.ts`, `site/test/chargement.test.ts`, et les ajouts à `accessibilite.spec.ts` et
`telephone.spec.ts`. Totaux du site: 126 tests unitaires, 56 tests du site bâti, 107 tests dans Chromium.
