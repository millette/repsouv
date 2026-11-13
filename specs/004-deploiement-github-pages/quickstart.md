# Guide de validation: déploiement sur GitHub Pages

Contrat: [contracts/publication.md](contracts/publication.md).

## Sur le poste

```sh
cd site
nub run test         # dont test/build/base.test.ts et test/publication.test.ts
nub run test:e2e     # dont test/e2e/base.spec.ts, sur le site bâti sous /repsouv/
```

## Sur GitHub (une fois)

1. Pousser la branche principale: `git push origin main`.
2. Dans le dépôt: Settings, Pages, Build and deployment, Source: « GitHub Actions ».
3. Onglet Actions: le flux « Publier le site » s'exécute; sinon, le lancer par « Run workflow ».

## Scénarios de validation

| Nº | Scénario | Comment | Résultat attendu | Exigences |
|---|---|---|---|---|
| 1 | Adresses sous le chemin du dépôt | `nub run test` (site bâti sous `/repsouv/`) | Aucune adresse interne hors de `/repsouv/`, aucun lien mort | FR-007, SC-002 |
| 2 | Site sous le chemin, dans un navigateur | `nub run test:e2e` | Navigation, explorateur, boîte « Détails », graphique interactif, page introuvable | FR-007, FR-010 |
| 3 | Site à la racine | Les autres tests, inchangés | Tous passent | FR-009, SC-006 |
| 4 | Forme du flux | `nub run test` (`publication.test.ts`) | Déclencheurs, droits, contrôles avant dépôt, aucun secret, aucune commande payante | FR-001 à FR-006 |
| 5 | Documentation | Lire `site/README.md` et `README.md` | Réglage GitHub, adresse, relance, publication ailleurs | FR-011 |
| 6 | Première publication | Sur GitHub, après les trois gestes ci-dessus | Le site répond à `https://millette.github.io/repsouv/` | FR-001, SC-001 |
| 7 | Contrôle en échec | Sur GitHub, pousser un test qui échoue | Rien n'est publié; le site reste celui d'avant | FR-003, SC-003 |

Les scénarios 6 et 7 ne peuvent être exercés que sur GitHub.
