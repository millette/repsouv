# Analyse : modèle OpenAI et effort de raisonnement

*Documentation : [README](../README.md) · [Implémentation](../implementation.md) · [Historique](../historique.md) · [Sommaire statistique](../donnees/sommaire.md)*

Banc d'essai du 2026-11-12 pour choisir le modèle OpenAI par défaut, son repli et l'effort de raisonnement (`reasoning.effort`) des appels d'enrichissement et de vérification des critères. Résultat : `gpt-6.1-sol` à effort `low` reproduit `gpt-6-astra` sur l'échantillon pour un cinquième du prix ; ce sont les valeurs par défaut depuis (`MODELE_PAR_DEFAUT`, `EFFORT_PAR_DEFAUT` dans `enrichir.ts`, repli `gpt-6-astra`).

## Méthode

- **Référence** : les 57 outils enrichis et vérifiés par `gpt-6-astra` (réimport du 2026-11-12). Le plancher de bruit d'un modèle contre lui-même vient de la comparaison des deux imports Astra du même jour sur 57 outils : `source` 100 %, `licence` 91 %, `repo` 96 %, `evaluation_enrichie` 96 %, tags identiques 67 %, verdicts « données » 100 %, « contrôle » 100 %, « dépendance » 95 %.
- **Échantillon** ([`echantillon.json`](echantillon.json)) : 20 outils, 10 libres ou partiels et 10 propriétaires, espacés dans l'ordre alphabétique, pages lisibles (les 3 outils non enrichis sont exclus).
- **Variantes** : `gpt-6.1-terra` × {`medium` (défaut du modèle), `low`, `none`} et `gpt-6.1-sol` × {`medium` (défaut), `low`}. Pour chacune, les 20 outils sont enrichis puis vérifiés avec le script [`banc-effort.ts`](banc-effort.ts) (mêmes consignes et validations qu'`update`, sans modèle de repli, pages lues en direct), et comparés à la référence. Une seule exécution par variante.
- **Mesures** : accord avec la référence champ par champ, réponses rejetées par la validation, échecs, jetons (entrée, sortie, raisonnement), coût réel au prix du modèle, durée par outil.
- **Coût du banc d'essai** : 1,08 $.

## Résultats

| Variante | Coût | s/outil | Raisonnement (jetons) | `source` | `licence` | `repo` | `evaluation_enrichie` | Tags identiques (Jaccard) | Verdicts données / contrôle / dépendance |
|---|---|---|---|---|---|---|---|---|---|
| Terra `medium` | 0,18 $ | 13 | 6 493 | 19/20 | 15/20 | 17/20 | 12/20 | 10 (0,85) | 20 / 20 / 17 |
| Terra `low` | 0,15 $ | 9 | 1 674 | 19 | 16 | 17 | 11 | 8 (0,80) | 19 / 20 / 17 |
| Terra `none` | 0,14 $ | 8 | 0 | 19 | 19 | 16 | 12 | 6 (0,77) | 20 / 20 / 17 |
| Sol `medium` | 0,32 $ | 16 | 3 546 | 19 | 19 | 19 | 19 | 10 (0,84) | 20 / 20 / 19 |
| **Sol `low`** | **0,29 $** | 12 | 1 232 | **20** | **20** | **20** | **20** | 12 (0,88) | 20 / 20 / 18 |

Aucune réponse rejetée ni échec, dans aucune variante. Jetons en entrée : 119 k à 127 k par variante (dont 43 k en cache dans chaque variante) ; en sortie : 11,7 k (`none`) à 18,4 k (Terra `medium`). Les fichiers `gpt-*.json` contiennent, pour chaque variante, le résumé, le journal et les 20 outils produits (descriptions longues comprises), pour une lecture manuelle.

## Lecture

- **L'effort compte peu.** Pour les deux modèles, `low` donne le même accord que `medium` pour 9 à 17 % moins cher et 25 % plus vite ; `none` dégrade les tags sans économie notable. Les jetons de raisonnement ne représentent que 9 à 35 % de la sortie.
- **Le modèle compte beaucoup.** Terra, quel que soit l'effort, est plus prudent qu'Astra : `licence` ou `repo` à `null` quand la page ne les dit pas (CiviCRM, Discourse, OpenProject, Leantime ; 2FAS Auth, Jami, Thunderbird), alors qu'Astra et Sol complètent, exactement, de mémoire ; et Terra retient moins de critères que les étoiles pour 10 à 12 outils sur 20, contre 7 pour Sol (il retirerait « contrôle » ou « dépendance » à un tiers du répertoire, ce qui changerait les statistiques du sommaire). Sol reproduit Astra presque exactement ; Sol `low` est indiscernable d'Astra sur les 20 outils pour les champs factuels (`source`, `licence`, `repo`, `evaluation_enrichie`) ; les tags ne sont identiques que pour 12 outils (60 %, pour un plancher de bruit de 67 %).
- **La vérification des critères** (citation obligatoire) est robuste partout : 20/20 sur « contrôle » dans toutes les variantes, 20/20 sur « données » sauf Terra `low` (19), 17 à 19 sur « dépendance » (plancher 95 %).
- **Le repli ne corrige pas Terra** : sans réponse rejetée, le modèle de repli n'intervient jamais ; la prudence de Terra est une réponse valide, pas un échec. Le choix entre Terra et Sol est donc une politique éditoriale (n'affirmer que ce que la page dit, ou compléter de mémoire comme la référence), pas une question d'effort.

## Décision

`OPENAI_MODEL=gpt-6.1-sol`, `OPENAI_REASONING_EFFORT=low`, repli `gpt-6-astra` (il ne sert que sur une réponse rejetée, donc presque jamais ; le repli est un modèle, pas un effort). Import complet estimé à 3,58 $ en borne haute, environ 0,9 $ en réel d'après le banc (contre environ 3 $ avec Astra), 12 s par outil.

Réserves : une seule exécution par variante sur 20 outils ; le 20/20 de Sol `low` tient peut-être pour un ou deux points à la chance (Sol `medium` est à 19/20). `gpt-6-astra` reste disponible par `OPENAI_MODEL` pour les cas difficiles.

## Refaire le banc d'essai

Depuis la racine du dépôt, avec la clé dans `.env` :

```sh
node analyse-effort/banc-effort.ts gpt-6.1-sol low 20      # une variante: modèle, effort (- pour le défaut du modèle), taille
```

L'échantillon est lu dans `analyse-effort/echantillon.json` (créé au premier passage s'il manque) ; chaque passage écrit `analyse-effort/<modèle>-<effort>.json` (`<modèle>-defaut.json` quand l'effort est `-`) et affiche le résumé. La comparaison se fait avec l'`outils.json` courant : depuis le banc d'essai, trois outils de l'échantillon (CiviCRM, Firefox, Thunderbird) ont été ré-enrichis par `gpt-6.1-sol` et le vocabulaire est passé de 37 à 52 tags, si bien qu'un nouveau passage ne reproduirait pas exactement le tableau ci-dessus.
