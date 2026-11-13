# Implementation Plan: Site de consultation du répertoire

**Branch**: `001-site-consultation-repertoire` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-site-consultation-repertoire/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Un site statique en lecture seule qui rend le répertoire consultable: une page d'accueil qui liste
les outils actifs par catégorie, une fiche par outil, des filtres à choix multiple avec recherche
par nom, et la provenance de chaque champ.

Approche: un projet Astro en génération statique dans `site/`, avec son propre `package.json` géré
par nub. Au build, il lit les cinq fichiers JSON de la racine tels quels, les valide au minimum et
produit `site/dist/`. Les pages sont du HTML complet, lisible sans JavaScript; une seule île, sans
cadriciel d'application, ajoute les filtres, la recherche et leur état dans l'adresse: c'est une
île SolidJS, seule couche d'interactivité du site. Rien ne change à la
racine, sauf trois fichiers de configuration (`tsconfig.json`, `REUSE.toml`, documentation).

## Technical Context

**Language/Version**: TypeScript, exécuté par Node.js 26 (`>=26 <27`, comme la racine)

**Primary Dependencies**: Astro 7 (sortie statique), SolidJS 1.9 par `@astrojs/solid-js` (île des
filtres), daisyUI 5 importé directement en CSS (sans Tailwind ni classes utilitaires), Sätteri
(`satteri` 0.11, rendu de `description_longue`). Toutes dans `site/package.json`; aucune n'entre dans le
`package.json` de la racine.

**Storage**: aucun. Lecture seule des fichiers `outils.json`, `categories.json`, `criteres.json`,
`tags.json` et `sources.json` de la racine, au moment du build.

**Testing**: `node:test` lancé par nub pour les fonctions pures (`site/test/*.test.ts`) et pour le
HTML produit (`site/test/build/*.test.ts`, lu avec `linkedom`); Playwright avec
`@axe-core/playwright` pour le comportement des filtres dans un navigateur et l'accessibilité
(`site/test/e2e/`).

**Target Platform**: navigateurs courants et à jour, sur ordinateur et sur téléphone; n'importe
quel hébergeur de fichiers statiques.

**Project Type**: site Web statique (sous-projet autonome dans un dépôt de données et de scripts).

**Performance Goals**: page d'accueil utilisable en moins de 2 secondes sur une connexion mobile
courante; filtrage de 154 outils sans délai perceptible (moins de 100 ms).

**Constraints**: lecture complète sans JavaScript; WCAG 2.1 niveau AA; tout en français; aucun
appel réseau ni API payante au build; forme des données, schémas et scripts de la racine intacts.

**Scale/Scope**: 154 outils actifs, 25 catégories, 52 tags, 3 sources; 155 pages (accueil et une
fiche par outil), plus une page 404.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Comment le plan le respecte |
|---|---|---|
| I. Les données d'abord | Conforme | Le site lit les cinq fichiers tels quels. Il n'ajoute ni champ ni identifiant, ne touche ni aux types ni aux schémas; `nub run schemas:verifier` reste vert sans intervention. Les types de la racine sont importés par `import type` seulement. |
| II. Provenance et honnêteté | Conforme | Chaque champ affiché porte sa provenance (source, heuristique du dépôt, IA, Open Hub), fixée dans une table unique ([data-model.md](data-model.md)). Les champs d'IA portent « à vérifier »; les verdicts s'affichent avec leur citation, reproduite telle quelle. Un test du HTML produit le vérifie sur toutes les fiches. |
| III. Licences REUSE | Conforme | Code du site en `AGPL-3.0-or-later` (en-têtes SPDX dans les `.ts`, `.astro`, `.css`, `.mjs`; annotation `site/**` dans `REUSE.toml` pour `package.json`, `nub.lock`, `tsconfig.json`). Chaque page porte l'attribution CC BY-SA 4.0 à Praxis et le crédit des autres sources. `nub run licences` doit passer. |
| IV. Les coûts sont explicites | Conforme | Le build ne fait aucun appel réseau ni API payante: il ne lit que des fichiers locaux. Rien à chiffrer. |
| V. Tests d'abord, simplicité | Conforme | Test rouge puis code pour chaque fonction de `site/src/lib/`. Tests sans données (fixtures) séparés des tests du site bâti sur les vraies données. Une seule île Solid, limitée au formulaire de filtres; le reste est du balisage statique. Dépendances d'exécution justifiées par écrit dans [research.md](research.md). |
| VI. Tout en français | Conforme | Interface, artefacts Spec Kit, identifiants de code, messages de commit et documentation en français; `lang="fr-CA"` sur chaque page. |
| Contraintes techniques | Conforme | Node.js 26, nub pour installer, bâtir et tester (`nub install`, `nub run build`, `nub run test`); jamais npm, npx, tsc ni ts-node. Les scripts d'utilisation de la racine (`node update.ts`, `node sommaire.ts`) ne dépendent pas du site. |
| Flux de travail | Conforme | Travail sur la branche `001-site-consultation-repertoire`; `nub run test`, `nub run typecheck` et `nub run licences` à la racine avant chaque commit, plus `nub run test` dans `site/`; contenu durable reporté dans `implementation.md` et `historique.md` à la fin, puis `specs/` supprimé. |

Aucune violation: la section « Complexity Tracking » est vide.

**Réévaluation après la conception (Phase 1)**: conforme. La conception n'ajoute aucun champ aux
données, aucune dépendance à la racine et aucun appel réseau. Le seul point de vigilance est le
nombre de dépendances de développement du site (Playwright et axe), justifié dans
[research.md](research.md) par les exigences FR-036 et SC-008, qui ne se vérifient que dans un
navigateur.

## Project Structure

### Documentation (this feature)

```text
specs/001-site-consultation-repertoire/
├── plan.md              # Ce fichier
├── research.md          # Décisions techniques et solutions écartées
├── data-model.md        # Entités lues, provenance de chaque champ, règles d'affichage
├── quickstart.md        # Comment bâtir, vérifier et valider le site
├── contracts/
│   ├── pages.md         # Adresses, structure et contenu obligatoire de chaque page
│   └── filtres.md       # Paramètres d'adresse et règle de combinaison des filtres
├── checklists/
│   └── requirements.md  # Qualité de la spécification
└── tasks.md             # Produit par /speckit-tasks
```

### Source Code (repository root)

```text
site/
├── package.json             # Dépendances et scripts du site (build, dev, test, test:e2e, check)
├── nub.lock
├── astro.config.mjs         # Sortie statique, intégration Solid, adresse et chemin de base par variables d'environnement
├── tsconfig.json
├── playwright.config.ts
├── .gitignore               # dist/, .astro/, résultats de tests
├── src/
│   ├── lib/                 # Fonctions pures, sans Astro: testables seules
│   │   ├── donnees.ts       # Lit et valide les cinq fichiers JSON; échoue avec le nom du fichier
│   │   ├── repertoire.ts    # Outils actifs, groupes par catégorie, jointures (tags, sources, voir_aussi)
│   │   ├── adresses.ts      # Identifiant de fiche (slug du nom), détection des collisions, chemin de base
│   │   ├── provenance.ts    # Table champ → provenance, libellés « à vérifier »
│   │   ├── criteres.ts      # Les trois lectures des critères d'un outil
│   │   ├── libelles.ts      # Statuts, étoiles, pays en français, textes d'interface
│   │   ├── markdown.ts      # description_longue → HTML sûr, titres décalés
│   │   └── filtres.ts       # État des filtres, lecture et écriture de l'adresse, sélection des outils
│   ├── components/          # Composants Astro de présentation
│   │   ├── Etoiles.astro
│   │   ├── Provenance.astro # Signalement de provenance, lisible sans couleur ni survol
│   │   ├── CarteOutil.astro
│   │   ├── Criteres.astro
│   │   ├── OpenHub.astro
│   │   ├── Filtres.tsx      # Seule île Solid: formulaire, compteur, état dans l'adresse
│   │   └── Attribution.astro
│   ├── layouts/
│   │   └── Page.astro       # Langue, titre, lien d'évitement, régions nommées, pied d'attribution
│   ├── pages/
│   │   ├── index.astro      # Accueil: catégories, outils, filtres
│   │   ├── outils/[id].astro  # Une fiche par outil actif
│   │   └── 404.astro
│   └── styles/
│       └── global.css       # daisyUI importé en CSS, thème, mise en page propre au site
├── postcss.config.mjs       # Charge le greffon ci-dessous
├── postcss/
│   └── sans-variantes.mjs   # Retire du CSS les variantes réactives de daisyUI (sm:, md:, lg:, xl:)
└── test/
    ├── *.test.ts            # Unitaires, sur fixtures: lib/
    ├── fixtures/            # Petits fichiers de données fictifs, dont des cas limites
    ├── build/*.test.ts      # Sur site/dist bâti avec les vraies données
    └── e2e/*.spec.ts        # Playwright: filtres, adresse, clavier, sans JavaScript, axe

# Fichiers de la racine modifiés (configuration et documentation seulement)
tsconfig.json                # « exclude »: site/, pour que `nub run typecheck` reste celui des scripts
REUSE.toml                   # Annotation de site/** pour les fichiers sans en-tête
README.md, implementation.md, historique.md   # À la fin de la fonctionnalité
```

**Structure Decision**: un sous-projet autonome `site/`, avec ses dépendances, son verrou et ses
tests, pour que les scripts de la racine restent utilisables avec Node.js seul et sans rien
installer de plus. La logique vit dans `site/src/lib/` en fonctions pures, que les composants
Astro, l'île Solid et les tests appellent; les composants ne font que présenter. Le skill `solidjs`
du dépôt fixe les règles de l'île et des styles.

## Complexity Tracking

Aucune violation à justifier.

## Amendement du 2026-11-13: dépôt et build dans le pied de page

Ajout après la livraison (FR-037, FR-038), à la suite de la clarification « ajouter le dépôt à
`package.json`; le pied de page porte un lien vers ce dépôt, le hash Git et la date du build ».

**Approche**: le champ `repository` est ajouté au `package.json` de la racine et à celui du site.
Au build, `site/src/lib/depot.ts` lit l'adresse du dépôt dans le `package.json` de la racine, le
hash du commit en cours par `git rev-parse HEAD` (commande locale, sans réseau) et l'heure du build;
le composant `Attribution.astro` les affiche. La logique est en fonctions pures, les lectures
(fichier, commande, horloge) étant injectées pour les tests. Hors d'un dépôt Git, le hash est omis.

**Constitution**: conforme. Aucune dépendance ajoutée, aucun appel réseau; le hash et la date sont
des faits du build, pas du contenu généré; tests écrits avant le code.

**Limite connue**: la date du build rend deux builds successifs différents d'une ligne; les tests
vérifient sa forme et sa fraîcheur, pas sa valeur.

**Fichiers touchés**: `package.json`, `site/package.json`, `site/src/lib/depot.ts`,
`site/src/components/Attribution.astro`, `site/test/depot.test.ts`, `site/test/build/commun.test.ts`.

