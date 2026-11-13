# Guide de validation: site de consultation du répertoire

Comment bâtir le site et prouver qu'il fait ce que la spécification demande. Les contrats sont dans
[contracts/pages.md](contracts/pages.md) et [contracts/filtres.md](contracts/filtres.md), les règles
de données dans [data-model.md](data-model.md).

## Prérequis

- Node.js 26 et nub 0.10 (voir le README du dépôt).
- Les cinq fichiers de données à la racine du dépôt (présents dans un clone).
- Pour les tests dans un navigateur: Chromium de Playwright (`nub x playwright install chromium`,
  une fois).

Aucune clé d'API n'est nécessaire: le build ne fait aucun appel réseau.

## Bâtir et consulter

```sh
cd site
nub install          # dépendances du site, d'après site/nub.lock
nub run build        # lit les JSON de la racine, écrit site/dist/
nub run preview      # sert site/dist/ en local
nub run dev          # serveur de développement
```

Résultat attendu de `nub run build`: 156 pages (accueil, 154 fiches, 404), aucun avertissement,
code de sortie 0.

## Contrôles automatiques

```sh
cd site
nub run check        # types du site (astro check)
nub run test         # tests unitaires sur fixtures, puis tests du site bâti sur les vraies données
nub run test:e2e     # Playwright: filtres, adresse, clavier, sans JavaScript, accessibilité (axe)
```

Et à la racine, avant chaque commit (constitution):

```sh
nub run test && nub run typecheck && nub run licences
```

## Scénarios de validation

| Nº | Scénario | Comment | Résultat attendu | Exigences |
|---|---|---|---|---|
| 1 | Tous les outils sont listés | `nub run test` (site bâti) | 154 cartes, une par outil actif, chacune sous sa catégorie; 154 fiches | FR-001, FR-005, SC-001 |
| 2 | Score estimé distinct | Ouvrir l'accueil, comparer Nextcloud (Praxis) et un service FACiL | Le second porte « score estimé » | FR-004 |
| 3 | Fiche d'un outil enrichi | Ouvrir `/outils/nextcloud/` | Description détaillée, trois lectures des critères avec citations, licence, dépôt, tags, Open Hub, voir aussi, source; chaque champ d'IA porte « Produit par IA, à vérifier » | FR-006 à FR-009, FR-016, FR-032 à FR-035 |
| 4 | Fiche d'un outil non enrichi | Ouvrir `/outils/en-commun/` | Champs de la source et critères déduits seulement; aucun titre vide, aucun libellé d'IA | FR-010, SC-006 |
| 5 | Service et son logiciel | Ouvrir la fiche d'un service FACiL | Logiciel nommé et lié, mention que description et critères portent sur lui | FR-035 |
| 6 | Filtres à choix multiple | Cocher deux statuts et une catégorie | Seuls les outils de cette catégorie ayant l'un des deux statuts; compteur à jour | FR-012, FR-014, FR-015 |
| 7 | Recherche | Taper « elod » | « Élodia » reste affiché | FR-013 |
| 8 | Aucun résultat | Choisir des filtres sans intersection | Message et bouton « Effacer les filtres » | FR-015 |
| 9 | Adresse partagée | Copier l'adresse après filtrage, l'ouvrir dans un nouvel onglet | Même liste, mêmes cases cochées | FR-036, SC-011 |
| 10 | Bouton précédent | Cocher deux cases l'une après l'autre, puis précédent | Retour à l'état à une seule case | FR-036 |
| 11 | Sans JavaScript | Désactiver JavaScript, ouvrir l'accueil et une fiche | Tout le contenu lisible, liens fonctionnels, formulaire de filtres absent | FR-026, FR-027, SC-007 |
| 12 | Clavier seul | Parcourir accueil, filtre, fiche et retour à la tabulation | Tout est atteignable, focus toujours visible | FR-029, SC-008 |
| 13 | Accessibilité | `nub run test:e2e` | Aucune erreur axe de niveau A ou AA sur l'accueil et les fiches échantillonnées | FR-030, SC-008 |
| 14 | Attribution | `nub run test` (site bâti) | Auteur·trices de Praxis, CC BY-SA 4.0 et lien vers la note sur chaque page; source liée sur chaque fiche | FR-019, FR-020, SC-004 |
| 15 | Données invalides | `DONNEES=test/fixtures/invalide nub run build` | Échec, message nommant le fichier, aucun site partiel | FR-024 |
| 16 | Données intactes | `git status` à la racine après build et tests | Aucun fichier de données, schéma ou script modifié | FR-022, SC-010 |
| 17 | Téléphone | Ouvrir l'accueil et une fiche à 360 px de large | Lisible sans défilement horizontal | FR-031 |

## Après une mise à jour des données

```sh
node update.ts       # à la racine: met les données à jour
cd site && nub run build
```

Le site reflète le nouvel état sans autre intervention (SC-009).
