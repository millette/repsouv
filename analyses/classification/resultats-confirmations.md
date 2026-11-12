## Jetons et coût

| Fournisseur | Modèle | Outils | Appels | Jetons en entrée (cache lu) | Jetons en sortie | Coût ($) | Échecs |
|---|---|---|---|---|---|---|---|
| openai | gpt-6-astra | 57 | 57 | 98 688 (5 749) | 9 977 | 1.4340 | 0 |
| claude | claude-fable-5-2 | 57 | 57 | 231 456 (90 831) | 21 562 | 3.1297 | 0 |

## Verdicts par critère

| Fournisseur | Critère | confirmé | infirmé | indéterminé |
|---|---|---|---|---|
| openai | donnees | 45 | 0 | 12 |
| openai | controle | 3 | 23 | 31 |
| openai | dependance | 21 | 2 | 34 |
| claude | donnees | 45 | 0 | 12 |
| claude | controle | 24 | 28 | 5 |
| claude | dependance | 22 | 3 | 32 |

## Accord des ensembles de critères confirmés

| Comparaison | Ensembles identiques | Jaccard moyen |
|---|---|---|
| openai contre `criteres` (déduit) | 18/57 (32 %) | 0.564 |
| openai contre `evaluation_enrichie.criteres` | 28/57 (49 %) | 0.684 |
| claude contre `criteres` (déduit) | 29/57 (51 %) | 0.743 |
| claude contre `evaluation_enrichie.criteres` | 34/57 (60 %) | 0.760 |
| openai contre claude (57 outils communs) | 32/57 (56 %) | 0.708 |

## Accord critère par critère entre les deux fournisseurs (confirmé ou non)

| Critère | Accord | Les deux confirment | Seulement le premier | Seulement le second | Aucun |
|---|---|---|---|---|---|
| donnees | 57/57 (100 %) | 45 | 0 | 0 | 12 |
| controle | 36/57 (63 %) | 3 | 0 | 21 | 33 |
| dependance | 52/57 (91 %) | 19 | 2 | 3 | 33 |

## Rapport entre critères confirmés et étoiles

| Fournisseur | Confirmés = étoiles | Confirmés < étoiles | Confirmés > étoiles |
|---|---|---|---|
| openai | 18 | 39 | 0 |
| claude | 29 | 28 | 0 |

## Les 18 outils où l'enrichissement confirmait moins de critères que d'étoiles

| Fournisseur | Outils | Mêmes critères confirmés que l'enrichissement | Aucun critère non retenu n'est confirmé | Plus de critères confirmés (proche du répertoire) |
|---|---|---|---|---|
| openai | 18 | 10 | 18 | 0 |
| claude | 18 | 9 | 11 | 7 |
