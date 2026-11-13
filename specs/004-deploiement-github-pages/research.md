# Recherche: déploiement sur GitHub Pages

## 1. Publication par GitHub Actions

- **Décision**: un flux `.github/workflows/pages.yml` avec deux tâches. `construire`: récupérer le
  dépôt, installer Node.js (version de `.node-version`), nub (script d'installation) et uv,
  installer les dépendances de la racine et du site, lancer tous les contrôles, bâtir le site pour
  l'adresse de publication, déposer `site/dist` comme artefact Pages. `publier`: mettre l'artefact
  en ligne (`actions/deploy-pages`), dans l'environnement `github-pages`.
- **Pourquoi**: c'est la voie que GitHub recommande pour un site bâti (source « GitHub Actions »):
  aucune branche `gh-pages` à tenir, et la mise en ligne n'a lieu que si la première tâche réussit
  en entier (FR-003): le site en ligne reste celui d'avant quand un contrôle échoue.
- **Solutions écartées**: pousser `site/dist` sur une branche `gh-pages` (écrit dans le dépôt, ce
  que FR-006 exclut); bâtir sur le poste et publier à la main (ne répond pas à la demande).

## 2. Déclencheurs et concurrence

- **Décision**: `push` sur `main` et `workflow_dispatch` (à la main). Un groupe de concurrence
  `pages`, sans annuler une publication en cours: deux changements rapprochés donnent deux
  publications en file, la dernière l'emporte.
- **Pourquoi**: clarification du 2026-11-13. Une demande de fusion ne déclenche rien: le flux ne
  tourne ni sur les branches de travail ni sur les forks (FR-004).

## 3. Droits et secrets

- **Décision**: droits minimaux, déclarés dans le flux: `contents: read`, `pages: write`,
  `id-token: write`. Aucun secret du dépôt n'est référencé.
- **Pourquoi**: FR-005 et FR-006. Le site se bâtit sans clé (tranches 001 à 003): la publication ne
  lance ni `update.ts` ni `sommaire.ts`.

## 4. Adresse et chemin déduits du dépôt

- **Décision**: l'étape `actions/configure-pages` donne l'origine et le chemin du site (`origin`,
  `base_path`); le build les reçoit par `SITE_URL` et `SITE_BASE`, que `site/astro.config.mjs` lit
  depuis la tranche 001. Rien n'est écrit en dur.
- **Pourquoi**: FR-008: une copie du dépôt se publie à sa propre adresse; un domaine personnalisé
  donne un chemin vide, donc un site à la racine (FR-009).
- **Essai du 2026-11-13**: bâti avec `SITE_BASE=/repsouv`, le site n'a aucune adresse interne hors
  de `/repsouv/` et aucun lien mort (159 pages).

## 5. Contrôles avant la mise en ligne

- **Décision**: dans l'ordre: à la racine `nub run test`, `nub run typecheck`, `nub run licences`;
  dans `site/` `nub run check`, `nub run test`, `nub run test:e2e`; puis le build de publication.
- **Ordre**: les tests du site bâtissent `site/dist` à la racine du domaine; le build de
  publication vient après eux et réécrit `site/dist` pour l'adresse du dépôt, juste avant le dépôt.
- **Outils**: `nub run licences` demande uv (`astral-sh/setup-uv`); les tests dans un navigateur
  demandent Chromium (`playwright install --with-deps chromium`). `vl-convert` n'est pas
  nécessaire: les tests de la racine qui en dépendent se sautent d'eux-mêmes (vérifié le
  2026-11-13 sans `vl-convert` dans le `PATH`: 355 tests passent).
- **Pourquoi**: clarification du 2026-11-13 (« tout, navigateur compris »).

## 6. Vérifier sur le poste ce qui peut l'être

- **Décision**: trois tests.
  1. `site/test/build/base.test.ts` bâtit le site avec `SITE_BASE=/repsouv/` dans un dossier à
     part et vérifie que toute adresse interne des pages (liens, images, feuilles de style,
     scripts, îles) commence par `/repsouv/` et mène à un fichier bâti.
  2. `site/test/e2e/base.spec.ts` sert ce site sous `/repsouv/` et y vérifie, dans un navigateur,
     la navigation, l'explorateur et sa boîte « Détails », un graphique interactif et la page
     introuvable.
  3. `site/test/publication.test.ts` lit le fichier de flux: déclencheurs, droits, absence de
     secret, contrôles présents et placés avant le dépôt, aucune commande payante.
- **Limite**: le flux ne s'exécute que sur GitHub. Sa première exécution réelle a lieu après le
  premier `git push` et l'activation de GitHub Pages; la documentation le dit.

## 7. Page introuvable

- **Décision**: rien à ajouter. GitHub Pages sert `404.html` à la racine du site pour toute adresse
  inconnue; le site en bâtit une depuis la tranche 001, dont les liens passent par le chemin de
  base.
