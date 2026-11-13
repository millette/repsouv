# Contrat: page « Statistiques »

Adresse: `<base>/statistiques/`. Le contrat « Toutes les pages » de la tranche 001 et la navigation
de la tranche 002 valent ici; la navigation gagne un quatrième lien, « Statistiques », entre
« Explorer » et l'interrupteur de thème.

## Dans le HTML servi (lisible sans JavaScript)

| Élément | Exigence |
|---|---|
| `<h1>` | « Statistiques » |
| Introduction | Ce que la page montre, la date des données, et que les graphiques sont des dérivés des données, sous CC BY-SA 4.0 |
| Chiffres clés | Une section « Chiffres clés »: outils et catégories; répartition des étoiles (3, 2, 1, 0) et moyenne; scores estimés; outils enrichis, avec leur part et « sur N outils »; provenance par source; pays de l'éditeur, avec « sur N outils dont la source donne le pays » |
| Un bloc par graphique | `<figure data-graphique="<id>">`, dans l'ordre de `construireGraphiques` |
| Titre | `<h2>` avec le titre du graphique |
| Provenance | En texte, sous le titre: les libellés de data-model.md (« Produit par IA, à vérifier », « Déduit par ce dépôt »…) et la phrase de base (« Sur 154 outils », « Sur les 142 outils enrichis »…) |
| Images | Deux `<img>`, une par thème, `src` `<base>/graphiques/<id>-clair.svg` et `-sombre.svg`, le même `alt` (la description du graphique), `width` et `height`; le CSS n'en montre qu'une, selon le thème |
| Tableau | Un `<details>` fermé, `<summary>` « Voir les chiffres », contenant un `<table>` avec `<caption>`, `<th scope="col">`, une ligne par valeur; les liens de data-model.md |
| Nombres | Virgule décimale, espace avant « % » |

Un graphique que `construireGraphiques` ne rend pas n'a pas de bloc.

La page n'affiche pas le résumé par IA du sommaire, ni les sections hors tranche (dates, Open Hub,
suivi).

## Avec JavaScript

Voir [graphiques.md](graphiques.md). Rien d'autre ne change sur la page.
