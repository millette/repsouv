# Code commun aux scripts et au site

*Documentation : [README](../../README.md) · [Implémentation](../../implementation.md) · [Historique](../../historique.md) · [Sommaire statistique](../../donnees/sommaire.md)*

Le paquet `@repsouv/commun` contient ce que les [scripts](../scripts/README.md) et le [site](../site/README.md) partagent, pour qu'une même règle ne soit écrite qu'une fois : les types des données, quelques identifiants et prédicats, le calcul des statistiques et la construction des graphiques. Ce sont des modules purs : ni disque, ni réseau, ni dépendance d'exécution. Le paquet n'importe rien des deux autres, qui l'importent par chemin relatif (`../commun/modele.ts`).

## Modules

| Module | Contenu |
|---|---|
| `modele.ts` | Les types des fichiers de `donnees/` (`Outil`, `OutilClasse`, `Categorie`, `Tag`, `Critere`, `Source`, `Metadonnees` et ceux dont ils dépendent). Des types seulement. Les schémas JSON de `donnees/schemas/` en sont générés : changer un type change le schéma |
| `ids.ts` | Les identifiants fixes des données : la source Praxis (`ID_PRAXIS`) et les trois critères (`DONNEES`, `CONTROLE`, `DEPENDANCE`, `ID_PAR_ICONE`) |
| `abandon.ts` | Les outils que les scripts ne tentent plus après des échecs consécutifs : `abandonne` (enrichissement), `aCompleterOpenHub` et `abandonneOpenHub` (Open Hub), `MAX_ECHECS_PAR_DEFAUT` |
| `slug.ts` | `slug` : l'identifiant lisible tiré d'un nom, pour les catégories comme pour les adresses des fiches du site |
| `statistiques.ts` | `calculerStatistiques` et ses types : les chiffres du sommaire et de la page « Statistiques » du site, les mêmes des deux côtés |
| `graphiques.ts` | `construireGraphiques` et `IDS_GRAPHIQUES` : les neuf graphiques en spécifications Vega-Lite. Les scripts les convertissent en SVG avec `vl-convert` ; le site les compile lui-même |

## Commandes

Les dépendances s'installent une seule fois, à la racine du dépôt (`nub install`). De la racine, `nub run test` et `nub run typecheck` couvrent ce paquet avant celui des scripts. Dans `packages/commun/` :

```sh
nub run test         # tests unitaires sur données fictives (test/*.test.ts)
nub run typecheck    # vérification des types
```

## Règles

- **Pur** : aucun accès au disque, au réseau ni à un programme externe, et aucune dépendance d'exécution (`vega-lite` n'est qu'un type). C'est ce qui permet au site de bâtir sans les dépendances des scripts.
- **Un seul sens** : les scripts et le site importent ce paquet ; il n'importe rien d'eux.
- **Les données d'abord** : `modele.ts` décrit les fichiers de `donnees/` tels qu'ils sont. Après un changement de type, `nub run schemas` (à la racine) régénère les schémas, et `nub run schemas:verifier` échoue tant qu'ils divergent.
- **Tests avec le code** : `test/donnees-fictives.ts` fournit les données des tests, que ceux des scripts réemploient.

## Licences

Le code est sous `AGPL-3.0-or-later`, comme le reste du dépôt ; voir le [README](../../README.md#source-crédits-et-licences).
