# Scripts du répertoire

*Documentation : [README](../../README.md) · [Implémentation](../../implementation.md) · [Historique](../../historique.md) · [Sommaire statistique](../../donnees/sommaire.md)*

Le paquet `@repsouv/scripts` produit et maintient les fichiers de `donnees/` : il suit le répertoire en ligne, importe les autres sources, enrichit les outils par IA, vérifie leurs critères, génère le sommaire, ses graphiques et les schémas JSON. Les scripts sont en TypeScript, que Node.js 26 exécute tel quel. Ce fichier donne la vue d'ensemble ; le détail de chaque script et de chaque module est dans [implementation.md](../../implementation.md), et la marche à suivre dans le [README](../../README.md#démarrage-rapide).

Certaines commandes **coûtent de l'argent** : l'enrichissement, la vérification, les descriptions de catégories et le résumé du sommaire passent par l'API OpenAI. `--dry-run` chiffre le travail et le coût de `update.ts` sans rien dépenser ni écrire.

## Scripts

Ils se lancent avec `node`, de la racine du dépôt ou d'ailleurs en donnant leur chemin : sans chemin de fichier, ils prennent `donnees/outils.json` d'après leur propre emplacement (sauf `extract.ts` et `classify.ts`, qui demandent le chemin), et `update.ts` et `sommaire.ts` lisent le `.env` de la racine.

| Script | Rôle |
|---|---|
| `update.ts` | La porte d'entrée : synchronise `donnees/` avec la page Praxis (import initial si `outils.json` manque), enrichit et vérifie les outils qui ne le sont pas encore, complète par Open Hub, décrit les catégories et régénère le sommaire si quelque chose a changé. `--dry-run` pour l'aperçu et l'estimation des coûts |
| `sommaire.ts` | Écrit `donnees/sommaire.md` et `donnees/graphiques/`. `--sans-resume` évite l'appel à l'API, `--sans-graphiques` se passe de `vl-convert` |
| `extract-facil.ts` | Importe ou met à jour les Services FACiLes |
| `extract-charles.ts` | Importe ou met à jour les alternatives de l'extension Charles |
| `ajouter.ts` | Ajoute à la main un outil qui ne vient d'aucune source extraite |
| `extract.ts` | Outil exceptionnel : reconstruit `outils.json` et `categories.json` (et `criteres.json` s'il est donné) depuis la page, en écrasant l'existant avec `--force` |
| `classify.ts` | Outil exceptionnel : reclasse tous les outils après un changement des règles de classification |

Les autres fichiers sont des modules que ces scripts partagent : `enrichir.ts`, `confirmer.ts`, `categories.ts` (descriptions des catégories) et `openhub.ts` (appels aux API), `sources.ts` et `fichiers.ts` (lecture et écriture des fichiers de données, chemins du dépôt), `logiciel.ts` (logiciel derrière un service, renvois `voir_aussi`), `graphiques.ts` (écriture des SVG par `vl-convert`), `prix.ts`, `spdx.ts`, `agent.ts`, `env.ts`, `cli.ts`, `progress.ts`, `duree.ts`, `temps.ts` et `couleurs.ts` ; `generer-schemas.ts`, `schemas-types.ts`, `affiner-schema.ts` et `build.config.ts` produisent les schémas JSON. Les types des données, le calcul des statistiques et la construction des graphiques viennent de [`packages/commun`](../commun/README.md).

## Commandes

Les dépendances s'installent une seule fois, à la racine du dépôt (`nub install`). Les commandes de la racine (`nub run update`, `sommaire`, `test`, `typecheck`, `schemas`, `schemas:verifier`) délèguent à ce paquet. Dans `packages/scripts/` :

```sh
nub run test               # test:unit, test:data, puis schemas:verifier
nub run test:unit          # tests unitaires sur données fictives et dossiers temporaires (test/*.test.ts)
nub run test:data          # tests des vraies données de donnees/ (test/donnees/*.test.ts)
nub run typecheck          # vérification des types, analyse-effort/ compris
nub run schemas            # régénère donnees/schemas/ d'après les types de packages/commun/modele.ts
nub run schemas:verifier   # échoue si un schéma commité diverge des types
```

## Règles

- **Les données d'abord** : les scripts écrivent `donnees/` ; rien d'autre dans le dépôt ne les modifie. Un outil enrichi n'est jamais régénéré, et `meta.updated_at` ne change que si le contenu change.
- **Coûts explicites** : tout appel payant de `update.ts` est chiffré par `--dry-run`, et le premier import demande une confirmation. Sans clé, `update.ts` saute ce qui passe par l'API.
- **Provenance** : chaque champ produit par IA est distinct de ceux de la source ; un critère vérifié porte sa citation.
- **Variables d'environnement** : `.env` à la racine du dépôt, d'après [`.env.example`](../../.env.example) (`OPENAI_API_KEY`, et facultativement `OPENHUB_API_KEY`, `OPENAI_MODEL`, `OPENAI_MODEL_FALLBACK`, `OPENAI_REASONING_EFFORT`).
- **Tests** : les tests unitaires n'appellent ni le réseau ni une API ; ils emploient les données fictives de `packages/commun/test/donnees-fictives.ts`, des dossiers temporaires et un serveur local.

## Licences

Le code est sous `AGPL-3.0-or-later` ; les données qu'il produit sont sous `CC-BY-SA-4.0`. Voir le [README](../../README.md#source-crédits-et-licences).
