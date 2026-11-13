# Guide de validation: page « Statistiques »

Contrats: [contracts/page.md](contracts/page.md), [contracts/graphiques.md](contracts/graphiques.md).
Règles: [data-model.md](data-model.md).

## Prérequis et commandes

Comme les tranches précédentes (voir `site/README.md`), avec une condition de plus: les dépendances
de la racine doivent être installées (`nub install` à la racine), parce que le build du site
exécute `statistiques.ts` et `graphiques.ts`. `vl-convert` n'est pas nécessaire.

```sh
nub install                      # à la racine
cd site
nub install && nub run build     # écrit aussi site/dist/statistiques/ et site/dist/graphiques/
nub run check && nub run test && nub run test:e2e
```

## Scénarios de validation

| Nº | Scénario | Comment | Résultat attendu | Exigences |
|---|---|---|---|---|
| 1 | Chiffres clés | Ouvrir `/statistiques/` | Outils, catégories, étoiles, enrichis, provenance, pays; dénominateurs écrits; date des données | FR-002 à FR-004 |
| 2 | Neuf graphiques | `nub run test` (site bâti) | Un bloc par graphique de la racine: titre, provenance, deux images, tableau | FR-005, FR-006, FR-008 |
| 3 | Tableau fidèle | `nub run test` (site bâti) | Chaque tableau porte les valeurs de la spécification de son graphique | FR-007, SC-001 |
| 4 | Cohérence avec le sommaire | Comparer les chiffres de la page à `sommaire.md` régénéré sur les mêmes données | Identiques | FR-009, SC-002 |
| 5 | Sans JavaScript | Désactiver JavaScript | Images, textes de remplacement et tableaux; « Voir les chiffres » s'ouvre | FR-011, SC-003 |
| 6 | Survol | Survoler une barre | Valeur exacte dans une infobulle | FR-013 |
| 7 | Clavier | Tabulation jusqu'à un graphique, puis flèches | Un seul arrêt; valeur en cours affichée et annoncée | FR-014 |
| 8 | Légende | Presser une série, puis la represser | La série se détache (estompage et contour), puis tout revient | FR-015, FR-016 |
| 9 | Thème | Basculer l'interrupteur de thème | Images et vues passent au sombre, couleurs de séries inchangées | FR-010, FR-031 |
| 10 | Liens | Activer une ligne des tableaux par statut, par catégorie et statut, par tag | Explorateur filtré, autant d'outils que le chiffre | FR-017 à FR-019, SC-004 |
| 11 | Provenance | Lire les blocs des critères, du statut, des licences | Déduit, évaluation par IA, vérifié avec citation, « à vérifier » en texte | FR-020 à FR-022, SC-006 |
| 12 | Vue en échec | Faire échouer le chargement de la spécification | L'image reste | FR-012 |
| 13 | Accessibilité | `nub run test:e2e` | Aucune violation axe A ou AA, thèmes clair et sombre | FR-029, SC-007 |
| 14 | Téléphone | 360 px de large | Pas de défilement horizontal de la page | FR-030 |
| 15 | Racine intacte | `git status` à la racine | Données, schémas, scripts, `sommaire.md` et `graphiques/` inchangés | FR-026, SC-008 |
| 16 | Sans `vl-convert` | Bâtir avec un `PATH` sans `vl-convert` | Le build réussit | FR-027, SC-009 |
