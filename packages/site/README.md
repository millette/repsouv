# Site de consultation du répertoire

*Documentation du dépôt : [README](../../README.md) · [Implémentation](../../implementation.md) · [Historique](../../historique.md) · [Sommaire statistique](../../donnees/sommaire.md)*

Un site statique, en lecture seule, pour consulter le répertoire d'outils favorisant la souveraineté numérique : un accueil qui présente le projet (`/`), la liste des outils par catégorie, à trier, filtrer et comparer (`/explorer/`), une fiche par outil (`/outils/<id>/`) et une page de statistiques (`/statistiques/`). Il est en ligne à <https://millette.github.io/repsouv/>. Il lit les fichiers JSON de `donnees/`, à la racine du dépôt, tels quels, au moment du build, et ne les modifie jamais. Sa conception est décrite dans [implementation.md](../../implementation.md#site-de-consultation-packagessite).

## Commandes

Les dépendances s'installent une seule fois, à la racine du dépôt, pour les trois paquets de `packages/` (`nub install`). Les commandes se lancent ensuite dans `packages/site/`, avec [nub](https://nubjs.com/) et Node.js 26, ou de la racine du dépôt par les raccourcis `site:*`. Le site n'importe rien du paquet des scripts : il lit `donnees/` et importe les modules purs de `packages/commun/` (types des données, slug, statistiques, graphiques) par des imports ordinaires.

```sh
nub run dev          # serveur de développement                                                      (racine : nub run site:dev)
nub run build        # lit les JSON de donnees/ et écrit packages/site/dist/ (158 pages, explorateur.json et graphiques/)   (racine : nub run site:build)
nub run preview      # sert packages/site/dist/ en local
nub run check        # vérifie les types (astro check)                                               (racine : nub run site:check)
nub run test         # tests unitaires sur fixtures (test:unit), puis tests du site bâti sur les vraies données (test:build)   (racine : nub run site:test)
nub run test:e2e     # bâtit le site (à la racine d'un domaine, puis sous /repsouv/) et lance les tests dans Chromium   (racine : nub run site:test:e2e)
```

Les tests dans un navigateur demandent Chromium (`nub exec playwright install chromium`, une fois ; `--with-deps` s'il manque des bibliothèques du système). Le build ne fait aucun appel réseau et ne demande aucune clé d'API.

## Publication

Le site est publié sur GitHub Pages, à <https://millette.github.io/repsouv/>, par le flux [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml).

- **Réglage fait une fois** (à refaire dans une copie du dépôt) : sur GitHub, dans le dépôt, Settings, Pages, Build and deployment, Source : « GitHub Actions ».
- **Quand** : à chaque changement poussé sur la branche principale, ou à la main (onglet Actions, flux « Publier le site », « Run workflow »).
- **Où** : sous le chemin du dépôt, `https://millette.github.io/repsouv/` pour ce dépôt. L'adresse et le chemin viennent de GitHub : une copie du dépôt se publie à sa propre adresse sans modifier le code ; seul le lien du dépôt dans le pied de page vient du champ `repository` du `package.json` de la racine, à changer dans une copie.
- **Contrôles** : avant la mise en ligne, la publication installe les dépendances des trois paquets (`nub install` à la racine), puis lance les contrôles de la racine (`nub run test`, `nub run typecheck`, `nub run licences`) et, dans `packages/site/`, ceux du site (`nub run check`, `nub run test`, `nub run test:e2e`). Si l'un échoue, rien n'est publié et le site en ligne reste celui d'avant.
- **Coût** : aucun. La publication lit les données du dépôt telles quelles ; elle ne lance ni mise à jour ni enrichissement, et n'emploie aucun secret.
- **Ailleurs** : `nub run build` écrit `packages/site/dist/`, à déposer chez n'importe quel hébergeur de fichiers statiques, avec les variables ci-dessous.

Pour essayer sur le poste le site tel qu'il sera publié : `nub run build:base` (bâtit dans `dist-base/` sous `/repsouv/`), puis `SITE_BASE=/repsouv/ nub exec astro preview --outDir dist-base` ; les tests le font d'eux-mêmes (`test/build/base.test.ts`, `test/e2e/base.spec.ts`).

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `SITE_URL` | Origine publique du site (`https://millette.github.io`) ; donnée par GitHub à la publication | Aucune |
| `SITE_BASE` | Chemin de base, si le site n'est pas à la racine du domaine (`/repsouv/`) ; donné par GitHub à la publication | `/` |
| `DONNEES` | Dossier des cinq fichiers JSON, pour bâtir avec d'autres données (les tests s'en servent) | `donnees/`, à la racine du dépôt |

## Règles

- **Données** : le site lit `outils.json`, `categories.json`, `criteres.json`, `tags.json` et `sources.json` dans `donnees/` (`src/lib/donnees.ts` ; `src/lib/chemins.ts` situe la racine du dépôt deux dossiers au-dessus du dossier courant, celui du site) ; leurs types viennent de `packages/commun/modele.ts` ; un fichier manquant ou invalide, ou deux outils qui donneraient la même adresse de fiche, arrêtent le build avec un message qui nomme le fautif.
- **Provenance** : chaque champ affiché dit d'où il vient (source, déduction du dépôt, IA, Open Hub). La table est dans `src/lib/provenance.ts`, et les tests du site bâti refusent un champ produit par IA sans son signalement « à vérifier ».
- **Pied de page** : attribution et licence des données, crédit des autres sources, mise en garde sur les champs produits par IA, date des données, lien vers le dépôt (champ `repository` du `package.json` de la racine), version du dépôt dont le site est bâti (hash Git) et date du build (`src/lib/depot.ts`) ; hors d'un dépôt Git, le hash est omis.
- **Lecture sans JavaScript** : toutes les pages sont du HTML complet. Seuls l'explorateur, l'interrupteur de thème et l'interaction des graphiques en demandent ; ce sont des îles [SolidJS](https://www.solidjs.com/) (`src/components/Explorateur.tsx`, `src/components/Theme.tsx`, `src/components/Graphique.tsx`). Sans JavaScript, la page « Explorer » montre la liste complète des outils par catégorie, sans son formulaire.
- **Explorateur** : l'île est montée par `client:load` et rendue aussi au build, où elle ne produit que son formulaire, replié dans « Trier et filtrer » et masqué tant que les données ne sont pas lues ; la liste statique de la page reste affichée jusque-là. Elle lit dans le navigateur `explorateur.json`, écrit au build à partir des mêmes données. Les seuls appels réseau du site vont vers ses propres fichiers statiques : `explorateur.json`, la fiche d'un outil quand on ouvre ses détails, et la spécification d'un graphique quand il devient interactif (`src/lib/chargement.ts`, seul module qui appelle `fetch`). Tout son état (tri, filtres, vue, outils comparés, outil dont les détails sont ouverts) vit dans l'adresse de la page, pour qu'un lien copié le restaure. Le nom d'un outil, lien vers sa fiche, ouvre par un clic simple une boîte modale avec tous les détails de l'outil, ceux de sa fiche, lue telle quelle (`src/components/explorateur/Details.tsx`) ; la fiche reste la page de l'outil, où mènent ce même lien sans JavaScript, un clic modifié (Ctrl, Cmd, Maj, Alt) et « Ouvrir la fiche » dans la boîte. Sa logique est en fonctions pures dans `src/lib/` (`etat.ts`, `selection.ts`, `filtres.ts`, `tri.ts`, `comparaison.ts`, et `clic.ts` pour la règle du clic simple).
- **Statistiques** : les chiffres et les neuf graphiques viennent des fonctions de `packages/commun/` qui produisent aussi `donnees/sommaire.md` (`calculerStatistiques`, `construireGraphiques`), pour ne jamais le contredire. Les graphiques sont rendus en SVG au build par vega, sans `vl-convert`, en thème clair et sombre ; avec JavaScript, une île (`src/components/Graphique.tsx`) les rend interactifs quand ils deviennent visibles.
- **Styles** : [daisyUI](https://daisyui.com/) importé comme feuille de style, sans Tailwind ni classe utilitaire. La mise en page est dans `src/styles/global.css` ; deux greffons PostCSS (`postcss/`) retirent les variantes réactives de daisyUI et appliquent son thème sombre selon la préférence du système. Un interrupteur clair ou sombre, dans l'en-tête (`src/components/Theme.tsx`), retient le choix de la personne dans le navigateur.
- **Markdown** : les descriptions longues sont rendues par [Sätteri](https://satteri.bruits.org/), titres décalés sous ceux de la fiche et HTML brut neutralisé.

## Licences

Le code du site est sous `AGPL-3.0-or-later`. Les pages produites contiennent les données du répertoire, sous CC BY-SA 4.0 : chaque page porte l'attribution aux auteur·trices du répertoire d'origine et le crédit des autres sources. Voir [Licences](../../README.md#licences).
