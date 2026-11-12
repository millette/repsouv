# Résultats de la règle A pour « contrôle »

*Documentation : [README](../../README.md) · [Implémentation](../../implementation.md) · [Historique](../../historique.md) · [Sommaire statistique](../../sommaire.md) · [Analyse de la classification](../../analyses/classification/README.md)*

*Généré le 2026-11-12 par `analyses/classification/analyser-regle-a.ts` à partir des fichiers `confirmations-*.json`. Ne pas modifier à la main.*

## Règle A, 21 outils sur 21 (divergence de départ sur « controle »)

### Jetons et coût

| Fournisseur | Modèle | Appels | Jetons en entrée (cache lu) | Jetons en sortie | Coût ($) | Échecs |
|---|---|---|---|---|---|---|
| openai | gpt-6-astra | 21 | 39 898 (0) | 2 363 | 0.5171 | 0 |
| claude | claude-fable-5-2 | 21 | 91 688 (33 550) | 4 631 | 1.1218 | 0 |

### Verdicts « controle » sur ces outils

| Fournisseur | | confirmé | infirmé | indéterminé |
|---|---|---|---|---|
| openai | départ | 0 | 0 | 21 |
| openai | règle A | 21 | 0 | 0 |
| claude | départ | 21 | 0 | 0 |
| claude | règle A | 21 | 0 | 0 |

### Accord entre OpenAI et Claude sur « controle » (mêmes outils)

| | Confirmé ou non, identique | Statut identique (3 statuts) |
|---|---|---|
| Départ (nul par construction) | 0/21 (0 %) | 0/21 (0 %) |
| Règle A | 21/21 (100 %) | 21/21 (100 %) |

### Variabilité d'une exécution à l'autre (consignes inchangées pour ces critères): verdicts qui changent entre le départ et la règle A

| Fournisseur | donnees | controle | dependance |
|---|---|---|---|
| openai | 0 | 21 | 0 |
| claude | 1 | 0 | 0 |

### Contre les autres sources, pour « controle » confirmé (mêmes outils)

| Source | Outils où « controle » est retenu |
|---|---|
| `criteres` (déduit par `classify.ts`) | 21/21 (100 %) |
| `evaluation_enrichie.criteres` | 14/21 (67 %) |
| openai, départ | 0/21 (0 %) |
| openai, règle A | 21/21 (100 %) |
| claude, départ | 21/21 (100 %) |
| claude, règle A | 21/21 (100 %) |

### Outils où les deux IA divergent encore avec la règle A

(aucun)
