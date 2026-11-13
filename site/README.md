# Site de consultation du répertoire

*Documentation du dépôt : [README](../README.md) · [Implémentation](../implementation.md) · [Historique](../historique.md) · [Sommaire statistique](../sommaire.md)*

Un site statique, en lecture seule, pour consulter le répertoire d'outils favorisant la souveraineté numérique : un accueil qui présente le projet (`/`), la liste des outils par catégorie, à trier, filtrer et comparer (`/explorer/`), une fiche par outil (`/outils/<id>/`) et une page de statistiques (`/statistiques/`). Il lit les fichiers JSON de la racine du dépôt tels quels, au moment du build, et ne les modifie jamais. Sa conception est décrite dans [implementation.md](../implementation.md#site-de-consultation-site).

## Commandes

Toutes se lancent dans `site/`, avec [nub](https://nubjs.com/) et Node.js 26. Les dépendances de la racine doivent être installées aussi (`nub install` à la racine du dépôt) : la page « Statistiques » exécute au build les modules de la racine qui calculent le sommaire.

```sh
nub install          # dépendances du site, d'après site/nub.lock
nub run dev          # serveur de développement
nub run build        # lit les JSON de la racine et écrit site/dist/ (158 pages, explorateur.json et graphiques/)
nub run preview      # sert site/dist/ en local
nub run check        # vérifie les types (astro check)
nub run test         # tests unitaires sur fixtures, puis tests du site bâti sur les vraies données
nub run test:e2e     # bâtit le site (à la racine, puis sous /repsouv/) et lance les tests dans Chromium
```

Les tests dans un navigateur demandent Chromium (`nub x playwright install chromium`, une fois). Le build ne fait aucun appel réseau et ne demande aucune clé d'API.

## Publication

Le site est publié sur GitHub Pages par le flux [`.github/workflows/pages.yml`](../.github/workflows/pages.yml).

- **Réglage à faire une fois** : sur GitHub, dans le dépôt, Settings, Pages, Build and deployment, Source : « GitHub Actions ».
- **Quand** : à chaque changement poussé sur la branche principale, ou à la main (onglet Actions, flux « Publier le site », « Run workflow »).
- **Où** : sous le chemin du dépôt, `https://millette.github.io/repsouv/` pour ce dépôt. L'adresse et le chemin viennent de GitHub : une copie du dépôt se publie à sa propre adresse sans modifier le code.
- **Contrôles** : avant la mise en ligne, la publication lance les contrôles de la racine (`nub run test`, `nub run typecheck`, `nub run licences`) et ceux du site (`nub run check`, `nub run test`, `nub run test:e2e`). Si l'un échoue, rien n'est publié et le site en ligne reste celui d'avant.
- **Coût** : aucun. La publication lit les données du dépôt telles quelles ; elle ne lance ni mise à jour ni enrichissement, et n'emploie aucun secret.
- **Ailleurs** : `nub run build` écrit `site/dist/`, à déposer chez n'importe quel hébergeur de fichiers statiques, avec les variables ci-dessous.

Pour essayer sur le poste le site tel qu'il sera publié : `SITE_BASE=/repsouv/ nub exec astro build --outDir dist-base`, puis `SITE_BASE=/repsouv/ nub exec astro preview --outDir dist-base` ; les tests le font d'eux-mêmes (`test/build/base.test.ts`, `test/e2e/base.spec.ts`).

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `SITE_URL` | Origine publique du site (`https://millette.github.io`) ; donnée par GitHub à la publication | Aucune |
| `SITE_BASE` | Chemin de base, si le site n'est pas à la racine du domaine (`/repsouv/`) ; donné par GitHub à la publication | `/` |
| `DONNEES` | Dossier des cinq fichiers JSON, pour bâtir avec d'autres données (les tests s'en servent) | La racine du dépôt |

## Règles

- **Données** : le site lit `outils.json`, `categories.json`, `criteres.json`, `tags.json` et `sources.json` ; un fichier manquant ou invalide, ou deux outils qui donneraient la même adresse de fiche, arrêtent le build avec un message qui nomme le fautif.
- **Provenance** : chaque champ affiché dit d'où il vient (source, déduction du dépôt, IA, Open Hub). La table est dans `src/lib/provenance.ts`, et les tests du site bâti refusent un champ produit par IA sans son signalement « à vérifier ».
- **Pied de page** : attribution et licence des données, crédit des autres sources, date des données, lien vers le dépôt (champ `repository` du `package.json` de la racine), version du dépôt dont le site est bâti (hash Git) et date du build (`src/lib/depot.ts`).
- **Lecture sans JavaScript** : toutes les pages sont du HTML complet. Seuls l'explorateur, l'interrupteur de thème et l'interaction des graphiques en demandent ; ce sont des îles [SolidJS](https://www.solidjs.com/) (`src/components/Explorateur.tsx`, `src/components/Theme.tsx`, `src/components/Graphique.tsx`). Sans JavaScript, la page « Explorer » montre la liste complète des outils par catégorie, sans son formulaire.
- **Explorateur** : l'île est montée par `client:load` et rendue aussi au build, où elle ne produit que son formulaire, replié dans « Trier et filtrer » et masqué tant que les données ne sont pas lues ; la liste statique de la page reste affichée jusque-là. Elle lit dans le navigateur `explorateur.json`, écrit au build à partir des mêmes données ; c'est le seul appel réseau du site, vers son propre fichier. Tout son état (tri, filtres, vue, outils comparés, outil dont les détails sont ouverts) vit dans l'adresse de la page, pour qu'un lien copié le restaure. Un bouton « Détails » ouvre dans une boîte modale tous les détails d'un outil, ceux de sa fiche, lue telle quelle (`src/components/explorateur/Details.tsx`) ; la fiche reste la page de l'outil. Sa logique est en fonctions pures dans `src/lib/` (`etat.ts`, `selection.ts`, `tri.ts`, `comparaison.ts`).
- **Statistiques** : les chiffres et les neuf graphiques viennent des fonctions de la racine qui produisent `sommaire.md` (`calculerStatistiques`, `construireGraphiques`), pour ne jamais le contredire. Les graphiques sont rendus en SVG au build par vega, sans `vl-convert`, en thème clair et sombre ; avec JavaScript, une île (`src/components/Graphique.tsx`) les rend interactifs quand ils deviennent visibles.
- **Styles** : [daisyUI](https://daisyui.com/) importé comme feuille de style, sans Tailwind ni classe utilitaire. La mise en page est dans `src/styles/global.css` ; deux greffons PostCSS (`postcss/`) retirent les variantes réactives de daisyUI et appliquent son thème sombre selon la préférence du système. Un interrupteur clair ou sombre, dans l'en-tête (`src/components/Theme.tsx`), retient le choix de la personne dans le navigateur.
- **Markdown** : les descriptions longues sont rendues par [Sätteri](https://satteri.bruits.org/), titres décalés sous ceux de la fiche et HTML brut neutralisé.

## Licences

Le code du site est sous `AGPL-3.0-or-later`. Les pages produites contiennent les données du répertoire, sous CC BY-SA 4.0 : chaque page porte l'attribution aux auteur·trices du répertoire d'origine et le crédit des autres sources. Voir [Licences](../README.md#licences).
