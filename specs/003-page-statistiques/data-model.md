# Modèle de données: page « Statistiques »

La page ne crée aucune donnée du dépôt. Au build, elle appelle `calculerStatistiques` et
`construireGraphiques` de la racine sur les cinq fichiers lus tels quels, et en dérive des chiffres
clés, des tableaux, des images et des spécifications compilées.

## Chiffres clés

| Chiffre | Vient de | Dénominateur écrit |
|---|---|---|
| Outils, catégories | `Statistiques.total`, catégories ayant un outil | |
| Étoiles: outils à 3, 2, 1 et 0 étoiles; moyenne | Compte des scores des outils actifs; `scores.moyen` | Tous les outils |
| Scores estimés | `scoresEstimes` | Tous les outils |
| Outils enrichis | `enrichissement.enrichis` | Tous les outils |
| Provenance | `provenance` (source, outils, enrichis) | Tous les outils |
| Pays de l'éditeur | `pays`, nommés en français | Outils dont la source donne le pays |

## Graphique

Un par graphique que `construireGraphiques` rend (neuf avec les données actuelles; un graphique sans
données n'est pas rendu, donc pas affiché).

| Champ | Vient de |
|---|---|
| `id`, `titre`, `description` (texte de remplacement) | `Graphique` de la racine |
| `spec` | Spécification Vega-Lite de la racine, avec ses valeurs en ligne (`data.values`) |
| `provenance` | Table du site, par `id` (ci-dessous) |
| `base` | Phrase qui dit sur combien d'outils portent ses chiffres, calculée depuis `Statistiques` |
| `tableau` | Colonnes et lignes tirées de `spec.data.values` (ci-dessous) |
| `series` | Noms des séries (domaine de l'échelle de couleur), quand le graphique en a plusieurs |

## Tableau de chaque graphique

Une ligne par valeur du graphique, dans l'ordre des valeurs. Les nombres sont écrits à la
française.

| Graphique (`id`) | Colonnes | Lien d'une ligne | Provenance affichée |
|---|---|---|---|
| `statut-code-source` | Statut, Outils, Part des outils | Explorateur, `statut` | Statut: IA |
| `categories-statut` | Catégorie, Statut, Outils | Explorateur, `categorie` et `statut` | Statut: IA |
| `criteres-repertoire-enrichie` | Critère, Évaluation, Part et nombre d'outils | Aucun | « Répertoire (déduit) »: déduit des étoiles par ce dépôt; « Évaluation enrichie »: IA |
| `criteres-par-statut` | Évaluation, Statut, Critère, Outils, Part | Aucun | Comme ci-dessus, et statut: IA |
| `criteres-verdicts` | Statut, Critère, Verdict, Outils, Outils vérifiés du statut, Part | Aucun | Vérifié par IA, citation à l'appui |
| `licences` | Licence, Famille, Outils | Aucun | Licence: IA |
| `forges` | Forge, Outils | Aucun | Dépôt de code: IA |
| `tags` | Tag, Outils | Explorateur, `tag` | Tags: IA |
| `enrichissement-jours` | Jour, Outils enrichis | Aucun | Calculé par les scripts |

Règles:

- Les chiffres d'un tableau sont les valeurs de `spec.data.values` (FR-007); aucun n'est recalculé
  autrement.
- Un lien n'existe que si la valeur correspond à un filtre de l'explorateur; le libellé d'un statut
  ou le nom d'une catégorie est ramené à son identifiant par les données du site. Une valeur sans
  identifiant connu reste du texte.
- Le nombre d'outils que l'explorateur retient pour le lien égale le chiffre de la ligne (FR-018).

## Thèmes

| Thème | Fond | Texte, titres, légendes | Axes et grilles | Séries |
|---|---|---|---|---|
| `clair` | Celui de la racine (blanc) | Ceux de la racine | Ceux de la racine | Palette de la racine |
| `sombre` | Sombre | Clairs, contraste d'au moins 4,5 pour 1 | Gris lisibles sur fond sombre | Palette de la racine, inchangée |

## Fichiers dérivés (dans `site/dist/graphiques/`)

| Fichier | Contenu |
|---|---|
| `<id>-clair.svg`, `<id>-sombre.svg` | Image du graphique, rendue au build |
| `<id>-clair.json`, `<id>-sombre.json` | Spécification Vega compilée, préparée pour l'interaction |

## État d'un graphique interactif (dans le navigateur, jamais enregistré)

| Champ | Valeurs |
|---|---|
| `courant` | Numéro de la ligne atteinte au clavier, ou aucun |
| `serie` | Série mise en évidence, ou aucune |
| `theme` | `clair` ou `sombre`, d'après la page |
