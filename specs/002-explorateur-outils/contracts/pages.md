# Contrat: pages de la tranche 002

Ce contrat complète celui de la tranche 001
([pages.md](../../001-site-consultation-repertoire/contracts/pages.md)), dont « Toutes les pages »
et « Fiche » restent valables. Il remplace sa section « Accueil ».

## Toutes les pages: navigation

| Élément | Exigence |
|---|---|
| Navigation | Dans l'en-tête, un `<nav aria-label="Navigation principale">` avec les liens « Accueil » (`<base>/`), « Outils » (`<base>/outils/`) et « Explorer » (`<base>/explorer/`) |
| Page en cours | Son lien porte `aria-current="page"`; une fiche indique « Outils » |
| Premier élément focalisable | Toujours le lien d'évitement vers le contenu |

## Accueil: `<base>/`

Page de présentation, sans liste d'outils ni filtre, lisible sans JavaScript.

| Section | Contenu |
|---|---|
| `<h1>` | Le nom du répertoire |
| Le répertoire | Ce qu'il est, à qui il s'adresse, les trois critères, le nombre d'outils, de catégories et de sources (calculés depuis les données), et deux liens d'action: « Voir tous les outils » et « Explorer et comparer » |
| Genèse | D'où vient le répertoire (la note de Praxis, La bande numérique, FCCF) et les étapes du dépôt (extraction, enrichissement, autres sources, site), d'après `historique.md` |
| Crédits | Les auteur·trices du répertoire d'origine, les autres sources de `sources.json`, l'auteur du dépôt, les licences |
| Logiciels utilisés | Les logiciels qui servent à produire les données et le site, chacun nommé, lié et décrit en une phrase |
| Mise en garde | Les champs produits par IA résument des pages tierces, à vérifier |

## Outils: `<base>/outils/`

La liste de l'accueil de la tranche 001, déplacée: mêmes sections par catégorie, mêmes cartes
(nom lié à la fiche, score avec équivalent textuel et « score estimé », statut avec son libellé
d'IA, description), lisible sans JavaScript. Elle n'a ni formulaire de filtres, ni île. Elle
indique le nombre total d'outils et renvoie à l'explorateur pour trier, filtrer et comparer.

## Explorer: `<base>/explorer/`

| Élément | Exigence |
|---|---|
| `<h1>` | « Explorer les outils » |
| Sans JavaScript | Un bloc `<noscript>`: l'explorateur demande JavaScript, avec un lien vers « Outils ». La page n'est jamais vide |
| Chargement | Un message « Chargement des outils… » dans une région `role="status"` |
| Erreur | Un message `role="alert"`: les outils n'ont pas pu être chargés; un bouton « Réessayer »; un lien vers « Outils » |
| Commandes | Un formulaire nommé: recherche par nom; tri (liste « Trier par ») et sens; vue (« Cartes », « Tableau »); filtres en groupes repliables avec légende: statut du code source, catégorie, tag, score minimal, verdict de chaque critère, pays de l'éditeur, source du répertoire, enrichissement; bouton « Effacer les choix » dès qu'un choix est actif |
| Provenance des filtres | Les groupes « Statut du code source », « Tag » et « Verdict » portent « Produit par IA, à vérifier » |
| Compteur | « N outils affichés sur M », dans une région `aria-live="polite"` |
| Aucun résultat | « Aucun outil ne correspond à ces choix. » et le bouton « Effacer les choix » |
| Vue en cartes | Une carte par outil: nom lié à la fiche, score (texte, « score estimé »), statut avec son libellé d'IA, description, case « Comparer <nom> » |
| Vue en tableau | `<table>` avec légende; colonnes: Comparer, Nom (lié à la fiche), Catégorie, Score, Statut du code source (libellé d'IA dans l'en-tête), Pays, Source; `<th scope="col">`; `aria-sort` sur la colonne triée |
| Comparaison | Au-dessus des résultats, dès que deux outils sont choisis: `<table>` avec légende, un outil par colonne (nom lié à la fiche, bouton « Retirer <nom> »), une information par ligne avec `<th scope="row">`, dans l'ordre de data-model.md; un bouton « Vider la comparaison » |
| Un seul outil choisi | « Choisir au moins deux outils pour les comparer. » |
| Cinquième outil | Refusé, avec « La comparaison est limitée à quatre outils. » dans une région annoncée |
| Pied | Attribution, licence et date des données, comme les autres pages |
