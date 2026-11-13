# Guide de validation: explorateur interactif des outils

Contrats: [contracts/adresse.md](contracts/adresse.md), [contracts/donnees.md](contracts/donnees.md),
[contracts/pages.md](contracts/pages.md). Règles: [data-model.md](data-model.md).

## Prérequis et commandes

Comme la tranche 001 (voir `site/README.md`): Node.js 26, nub, Chromium de Playwright.

```sh
cd site
nub install && nub run build     # écrit site/dist/, dont explorateur.json et les pages explorer/ et outils/
nub run check                    # types
nub run test                     # unitaires, puis site bâti
nub run test:e2e                 # navigateur
```

À la racine, avant chaque commit: `nub run test && nub run typecheck && nub run licences`.

## Scénarios de validation

| Nº | Scénario | Comment | Résultat attendu | Exigences |
|---|---|---|---|---|
| 1 | Tous les outils | Ouvrir `/explorer/` | 154 outils, compteur « 154 outils affichés sur 154 », ordre par catégorie puis nom | FR-001, SC-001 |
| 2 | Tri | Trier par score décroissant, puis par nom | Ordre conforme aux données; tri indiqué en texte | FR-005 à FR-007 |
| 3 | Chaque filtre | Score minimal 2; « données: confirmé »; pays France; source FACiL; non enrichi | Résultats conformes à la règle de sélection | FR-008 à FR-014 |
| 4 | Aucun résultat | Combiner des filtres sans intersection | Message et « Effacer les choix » | FR-015 |
| 5 | Vues | Passer en tableau, puis en cartes | Mêmes outils, même ordre; cases « comparer » conservées | FR-016 à FR-018 |
| 6 | Comparaison | Choisir 1, 2, puis 4 outils; tenter un 5e; retirer un outil | Message à 1; tableau à 2 et 4; refus du 5e; mise à jour au retrait | FR-019 à FR-022 |
| 7 | Cases vides | Comparer un outil enrichi et un outil non enrichi | « Non vérifié », « Pas encore enrichi », « Non connu » écrits en clair | FR-021 |
| 8 | Adresse partagée | Faire des choix de tout type, copier l'adresse, l'ouvrir ailleurs | Même tri, filtres, vue et comparaison | FR-023, SC-004 |
| 9 | Bouton précédent | Faire trois choix, reculer | Retour à l'état précédent à chaque pas | FR-024 |
| 10 | Adresse abîmée | `?categorie=inconnue&tri=bidon&comparer=absent&score=9` | Valeurs ignorées, liste complète, aucune erreur | FR-025 |
| 11 | Chargement lent | Ralentir `explorateur.json` (test Playwright) | « Chargement des outils… » visible | FR-027 |
| 12 | Échec de chargement | Faire échouer `explorateur.json` | Message d'erreur, « Réessayer », lien vers « Outils »; réessayer charge la liste | FR-028 |
| 13 | Sans JavaScript | Désactiver JavaScript, ouvrir `/explorer/`, `/`, `/outils/` et une fiche | Message et lien sur « Explorer »; les trois autres pages lisibles | FR-029, SC-009 |
| 14 | Provenance | `nub run test:e2e` | Libellés d'IA sur statut, tags et verdicts; « score estimé »; « Déduit par ce dépôt » dans la comparaison | FR-030 à FR-032 |
| 15 | Accueil | Ouvrir `/` | Présentation, genèse, crédits, logiciels; liens vers « Outils » et « Explorer »; ni liste ni filtre | FR-041, FR-045 |
| 16 | Page « Outils » | `nub run test` (site bâti) | 154 cartes par catégorie, sans formulaire | FR-042, SC-010 |
| 17 | Liens des fiches | Sur une fiche, activer la catégorie puis un tag | Explorateur filtré sur la valeur | FR-043 |
| 18 | Navigation | Sur chaque page | Accueil, Outils, Explorer; page en cours indiquée | FR-044 |
| 19 | Clavier et accessibilité | `nub run test:e2e` | Parcours complet au clavier; aucune violation axe A ou AA, deux vues, comparaison ouverte, thèmes clair et sombre | FR-038, FR-039, SC-008 |
| 20 | Téléphone | 360 px de large, tableau et comparaison de 4 outils | Pas de défilement horizontal de la page | FR-040 |
| 21 | Données intactes | `git status` à la racine | Aucun fichier de données, schéma ou script modifié | FR-035, SC-009 |
