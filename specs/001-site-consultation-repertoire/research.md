# Recherche: site de consultation du répertoire

Décisions techniques prises pour le plan. Versions relevées le 2026-11-13 avec `nub view`.

## 1. Générateur de site

- **Décision**: Astro 7 (7.4.x), sortie statique, dans `site/`.
- **Pourquoi**: demandé pour cette fonctionnalité. Astro produit du HTML complet sans JavaScript
  par défaut, ce que FR-026 exige, et bâtit une page par outil à partir de données locales
  (`getStaticPaths`). Il demande Node.js `>=22.23.4`, compatible avec le Node.js 26 du dépôt.
- **Solutions écartées**: un script maison qui écrit le HTML (moins de dépendances, mais à
  réinventer: gabarits, CSS, serveur de développement); un cadriciel d'application (React, Vue),
  qui enverrait du JavaScript pour un contenu qui n'en demande pas.
- **À vérifier à l'implémentation**: les API d'Astro 7 dans <https://docs.astro.build> (le skill
  `astro` du dépôt est écrit pour Astro 5 et plus), en particulier `getStaticPaths`, `base`, les
  scripts client et la page 404.

## 2. Styles et composants

- **Décision**: Tailwind CSS 4 (4.3.x) par `@tailwindcss/vite`, et daisyUI 5 (5.8.x) en greffon
  CSS (`@plugin "daisyui"`).
- **Pourquoi**: demandé. daisyUI fournit des composants en classes CSS, sans JavaScript, ce qui
  convient à un site lisible sans script. Le skill `daisyui` du dépôt en documente l'installation
  et les composants.
- **Solutions écartées**: CSS écrit à la main (pas de dépendance, mais plus long et moins cohérent
  pour les états de focus et les thèmes).
- **Vigilance**: contraste des couleurs du thème (WCAG AA) et focus visible, contrôlés par axe;
  l'information ne passe jamais par la couleur seule (FR-017).

## 3. Emplacement et gestion des dépendances

- **Décision**: `site/package.json` et `site/nub.lock` propres au site, gérés par nub
  (`nub install`, `nub run build`). Aucun espace de travail commun avec la racine.
- **Pourquoi**: demandé, et la constitution veut que les scripts d'utilisation fonctionnent avec
  Node.js seul: un utilisateur de `node update.ts` n'installe pas Astro. Aucune dépendance n'est
  ajoutée au `package.json` de la racine.
- **Solutions écartées**: un espace de travail (workspace) à la racine, qui lierait les deux
  installations; mettre Astro dans les `devDependencies` de la racine.

## 4. Lecture des données au build

- **Décision**: `site/src/lib/donnees.ts` lit les cinq fichiers par `node:fs`, à partir de la
  racine du dépôt (dossier parent de `site/`, ou variable `DONNEES` pour les tests sur fixtures).
  Il vérifie la structure minimale (`meta`, tableau nommé, champs obligatoires des outils) et
  échoue avec un message qui nomme le fichier (FR-024). Les types viennent de la racine par
  `import type` (`OutilClasse`, `Categorie`, `Critere`, `Tag`, `Source`), effacés à l'exécution.
- **Pourquoi**: lire les fichiers tels quels (FR-021) sans dépendre à l'exécution du code de la
  racine, dont `fichiers.ts` et `categories.ts` tirent d'autres modules et dépendances. Les types
  partagés garantissent que le site suit la forme des données; un changement de forme casse la
  vérification des types du site plutôt que de passer inaperçu.
- **Solutions écartées**: importer `lireFichier` de la racine à l'exécution (couplage entre deux
  installations de dépendances); les collections de contenu d'Astro avec un chargeur (une couche
  de plus, avec un second schéma à tenir à jour, pour cinq fichiers déjà validés par leurs
  schémas JSON); valider avec `ajv` contre `schemas/` au build (déjà fait par `nub run test` à la
  racine; ce serait une dépendance de plus).

## 5. Adresse des fiches

- **Décision**: `/outils/<id>/`, où `<id>` est le slug du nom (minuscules, sans accents, tirets),
  la même règle que `slug()` de `categories.ts`, réécrite dans `site/src/lib/adresses.ts`. Le
  build échoue si deux outils actifs donnent le même identifiant, ou si un nom donne un
  identifiant vide.
- **Pourquoi**: `nom` est la clé unique des outils; son slug est lisible, stable tant que le nom
  ne change pas (FR-005) et sans caractère à encoder (« CIRA Canadian Shield / Bouclier
  canadien » devient `cira-canadian-shield-bouclier-canadien`). Un test compare la fonction du
  site à celle de la racine sur tous les noms réels.
- **Solutions écartées**: le nom encodé dans l'adresse (barres obliques et parenthèses); un
  numéro d'ordre (change quand un outil est ajouté); un champ `id` dans les données (interdit:
  la forme des données ne change pas).

## 6. Rendu de `description_longue`

- **Décision**: `marked` 18, appelé au build dans `site/src/lib/markdown.ts`, avec les titres
  décalés de deux niveaux (un `#` de la description devient un `h3`, plafonné à `h6`) et le HTML
  brut écarté.
- **Pourquoi**: le champ est en Markdown (titres, listes, gras), et une fiche a déjà un `h1` (le
  nom) et des `h2` (sections). L'enrichissement refuse déjà le HTML dans ce champ, mais le texte
  résume des pages tierces: le site n'insère jamais de HTML venu des données. `marked` n'a aucune
  dépendance et tourne au build seulement: rien n'est envoyé au navigateur.
- **Justification écrite de la dépendance d'exécution** (principe V): sans analyseur Markdown, la
  description longue s'afficherait en texte brut avec ses symboles, pour le champ le plus lu de
  la fiche; en écrire un à la main serait plus long et moins sûr.
- **Solutions écartées**: le pipeline Markdown d'Astro (fait pour des fichiers, pas pour des
  chaînes venues de JSON); `markdown-it` (équivalent, plus de dépendances).

## 7. Filtres, recherche et état dans l'adresse

- **Décision**: la liste complète est dans le HTML. Un seul script client (`src/scripts/filtres.ts`,
  TypeScript sans cadriciel, regroupé par Astro) révèle le formulaire de filtres, masque les
  outils et les catégories qui ne répondent pas aux choix, met à jour le compteur dans une région
  `aria-live`, et synchronise l'adresse. Chaque carte d'outil porte ses valeurs en attributs
  `data-*` (catégorie, tags, statut, nom normalisé). La logique (état, lecture et écriture de
  l'adresse, sélection) est dans `site/src/lib/filtres.ts`, sans accès au DOM.
- **Paramètres**: `categorie`, `tag` et `statut` répétables, et `q` pour la recherche (voir
  [contracts/filtres.md](contracts/filtres.md)). Un changement de case pousse une entrée
  d'historique (`history.pushState`); la frappe dans la recherche remplace l'entrée courante
  (`replaceState`), pour que le bouton précédent ne recule pas d'une lettre à la fois.
- **Sans JavaScript**: le formulaire porte l'attribut `hidden` dans le HTML, retiré par le script;
  il ne s'affiche donc pas comme utilisable (FR-027), et la liste complète reste lisible.
- **Pourquoi**: 154 outils tiennent dans une page; filtrer le DOM existant ne demande ni index, ni
  requête, ni cadriciel. La logique pure se teste sans navigateur.
- **Solutions écartées**: un îlot React ou Svelte (du JavaScript et une dépendance pour quelques
  cases à cocher); un moteur de recherche statique comme Pagefind (fait pour le plein texte sur de
  gros sites); une page par combinaison de filtres (explosion du nombre de pages).

## 8. Provenance des champs

- **Décision**: une table unique dans `site/src/lib/provenance.ts` associe chaque champ affiché à
  une provenance parmi quatre: `source`, `heuristique` (déduction de ce dépôt), `ia` (« produit
  par IA, à vérifier ») et `openhub` (données publiques d'Open Hub). Le composant `Provenance`
  l'affiche en texte visible, à côté du champ.
- **Pourquoi**: le principe II et FR-016 à FR-018. Une seule table évite qu'un composant oublie le
  signalement, et le test du HTML produit vérifie que chaque champ d'IA rendu en porte un.
- **Solutions écartées**: une infobulle au survol (inaccessible au clavier et au toucher,
  contraire à FR-017); un avertissement global unique par page (ne dit pas quel champ est généré).

## 9. Tests

- **Décision**, en trois niveaux:
  1. **Unitaires** (`site/test/*.test.ts`, `node:test` par nub, sur fixtures): chaque fonction de
     `src/lib/`. Écrits avant le code.
  2. **Site bâti** (`site/test/build/*.test.ts`): lisent `site/dist/` produit avec les vraies
     données, avec `linkedom`: une fiche par outil actif, attribution et licence sur chaque page,
     signalement sur chaque champ d'IA, aucun titre ni élément vide, liens internes valides,
     contenu présent sans exécuter de script.
  3. **Navigateur** (`site/test/e2e/*.spec.ts`, Playwright avec Chromium): filtres à choix
     multiple, recherche, adresse partagée, bouton précédent, parcours au clavier, JavaScript
     désactivé, et contrôle d'accessibilité par `@axe-core/playwright` (WCAG 2.1 A et AA).
- **Pourquoi**: FR-036 (adresse, historique) et SC-008 (accessibilité, clavier) ne se vérifient que
  dans un navigateur; tout le reste se vérifie plus vite et plus sûrement sans.
- **Justification des dépendances de développement**: `linkedom` (déjà utilisé à la racine) pour
  lire le HTML produit; `@playwright/test` et `@axe-core/playwright` pour le troisième niveau.
  Chromium est déjà présent dans le cache local de Playwright; sinon `nub x playwright install
  chromium`.
- **Solutions écartées**: axe dans jsdom ou linkedom (pas de calcul de contraste ni de focus);
  tout tester dans le navigateur (lent, et les erreurs de logique y sont plus dures à localiser).

## 10. Vérification des types du site

- **Décision**: `astro check` (`@astrojs/check`) dans `site/`, lancé par `nub run check`. Le
  `tsconfig.json` de la racine exclut `site/`, pour que `nub run typecheck` reste la vérification
  des scripts et n'exige pas les dépendances du site.
- **Pourquoi**: `tsrs -p .` à la racine prendrait sinon les fichiers `.ts` de `site/`, qui
  importent des modules installés seulement dans `site/node_modules`.
- **Solutions écartées**: une seule vérification à la racine (obligerait à installer le site pour
  vérifier les scripts).

## 11. Pays en français

- **Décision**: `Intl.DisplayNames("fr", { type: "region" })` de Node.js, au build.
- **Pourquoi**: vérifié sous Node.js 26: `FR` donne « France », `CH` « Suisse », `EU` « Union
  européenne » et `UK` « Royaume-Uni », les deux codes hors ISO que la source Charles emploie.
  Aucune table à maintenir. Un code inconnu s'affiche tel quel.
- **Solutions écartées**: une table de pays dans le site (à tenir à jour).

## 12. Publication

- **Décision**: hors de cette tranche. Le build produit `site/dist/`, publiable chez tout hébergeur
  de fichiers statiques. L'adresse publique et le chemin de base se règlent par les variables
  d'environnement `SITE_URL` et `SITE_BASE` (par défaut `/`), lues par `astro.config.mjs`; tous
  les liens internes passent par `adresses.ts`, qui applique le chemin de base.
- **Pourquoi**: la spécification laisse l'hébergeur et l'adresse au plan, et rien dans la demande
  ne les fixe. Régler le chemin de base dès maintenant évite de réécrire les liens le jour où
  l'hébergeur est choisi.
- **Reste à décider par la personne responsable du projet**: l'hébergeur, l'adresse et le
  déclenchement de la publication.

## 13. Licences des fichiers du site

- **Décision**: en-têtes SPDX dans les `.ts`, `.mjs`, `.css` et dans le bloc de code des `.astro`
  (`AGPL-3.0-or-later`); annotation `site/**` dans `REUSE.toml` pour les fichiers qui ne peuvent
  pas en porter (`package.json`, `nub.lock`, `tsconfig.json`, fixtures JSON de test). `site/dist/`
  et `site/.astro/` sont ignorés par Git, donc par `reuse lint`.
- **Pourquoi**: principe III. Le HTML produit contient des données sous CC BY-SA 4.0: chaque page
  le dit dans son pied, avec l'attribution.
