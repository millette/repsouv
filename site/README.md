# Site de consultation du répertoire

*Documentation du dépôt : [README](../README.md) · [Implémentation](../implementation.md) · [Historique](../historique.md) · [Sommaire statistique](../sommaire.md)*

Un site statique, en lecture seule, pour consulter le répertoire d'outils favorisant la souveraineté numérique : un accueil qui présente le projet (`/`), la liste des outils par catégorie (`/outils/`), une fiche par outil (`/outils/<id>/`), un explorateur pour trier, filtrer et comparer (`/explorer/`) et une page de statistiques (`/statistiques/`). Il lit les fichiers JSON de la racine du dépôt tels quels, au moment du build, et ne les modifie jamais. Sa conception est décrite dans [implementation.md](../implementation.md#site-de-consultation-site).

## Commandes

Toutes se lancent dans `site/`, avec [nub](https://nubjs.com/) et Node.js 26. Les dépendances de la racine doivent être installées aussi (`nub install` à la racine du dépôt) : la page « Statistiques » exécute au build les modules de la racine qui calculent le sommaire.

```sh
nub install          # dépendances du site, d'après site/nub.lock
nub run dev          # serveur de développement
nub run build        # lit les JSON de la racine et écrit site/dist/ (159 pages, explorateur.json et graphiques/)
nub run preview      # sert site/dist/ en local
nub run check        # vérifie les types (astro check)
nub run test         # tests unitaires sur fixtures, puis tests du site bâti sur les vraies données
nub run test:e2e     # tests dans Chromium : filtres, adresse, clavier, sans JavaScript, accessibilité, téléphone
```

Les tests dans un navigateur demandent Chromium (`nub x playwright install chromium`, une fois). Le build ne fait aucun appel réseau et ne demande aucune clé d'API.

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `SITE_URL` | Adresse publique du site, une fois l'hébergeur choisi | Aucune |
| `SITE_BASE` | Chemin de base, si le site n'est pas à la racine du domaine (`/repertoire/`) | `/` |
| `DONNEES` | Dossier des cinq fichiers JSON, pour bâtir avec d'autres données (les tests s'en servent) | La racine du dépôt |

## Règles

- **Données** : le site lit `outils.json`, `categories.json`, `criteres.json`, `tags.json` et `sources.json` ; un fichier manquant ou invalide, ou deux outils qui donneraient la même adresse de fiche, arrêtent le build avec un message qui nomme le fautif.
- **Provenance** : chaque champ affiché dit d'où il vient (source, déduction du dépôt, IA, Open Hub). La table est dans `src/lib/provenance.ts`, et les tests du site bâti refusent un champ produit par IA sans son signalement « à vérifier ».
- **Lecture sans JavaScript** : toutes les pages sont du HTML complet. Seuls l'explorateur, l'interrupteur de thème et l'interaction des graphiques en demandent ; ce sont des îles [SolidJS](https://www.solidjs.com/) (`src/components/Explorateur.tsx`, `src/components/Theme.tsx`, `src/components/Graphique.tsx`). Sans JavaScript, la page « Explorer » le dit et renvoie à la page « Outils ».
- **Explorateur** : il lit dans le navigateur `explorateur.json`, écrit au build à partir des mêmes données ; c'est le seul appel réseau du site, vers son propre fichier. Tout son état (tri, filtres, vue, outils comparés, outil dont les détails sont ouverts) vit dans l'adresse de la page, pour qu'un lien copié le restaure. Un bouton « Détails » ouvre dans une boîte modale tous les détails d'un outil, ceux de sa fiche, lue telle quelle (`src/components/explorateur/Details.tsx`) ; la fiche reste la page de l'outil. Sa logique est en fonctions pures dans `src/lib/` (`etat.ts`, `selection.ts`, `tri.ts`, `comparaison.ts`).
- **Statistiques** : les chiffres et les neuf graphiques viennent des fonctions de la racine qui produisent `sommaire.md` (`calculerStatistiques`, `construireGraphiques`), pour ne jamais le contredire. Les graphiques sont rendus en SVG au build par vega, sans `vl-convert`, en thème clair et sombre ; avec JavaScript, une île (`src/components/Graphique.tsx`) les rend interactifs quand ils deviennent visibles.
- **Styles** : [daisyUI](https://daisyui.com/) importé comme feuille de style, sans Tailwind ni classe utilitaire. La mise en page est dans `src/styles/global.css` ; deux greffons PostCSS (`postcss/`) retirent les variantes réactives de daisyUI et appliquent son thème sombre selon la préférence du système. Un interrupteur clair ou sombre, dans l'en-tête (`src/components/Theme.tsx`), retient le choix de la personne dans le navigateur.
- **Markdown** : les descriptions longues sont rendues par [Sätteri](https://satteri.bruits.org/), titres décalés sous ceux de la fiche et HTML brut neutralisé.

## Licences

Le code du site est sous `AGPL-3.0-or-later`. Les pages produites contiennent les données du répertoire, sous CC BY-SA 4.0 : chaque page porte l'attribution aux auteur·trices du répertoire d'origine et le crédit des autres sources. Voir [Licences](../README.md#licences).
