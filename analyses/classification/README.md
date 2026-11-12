# Analyse de la classification des étoiles

Question : peut-on mieux deviner **quel critère chaque étoile représente** (`criteres` dans `outils.json`), en prenant l'évaluation de l'enrichissement (`evaluation_enrichie.criteres`) comme second avis ? Cette analyse a tourné sur une copie de `outils.json` (57 outils enrichis, 3 non enrichis). `outils.json` n'a pas été modifié.

## Conclusion

1. **Le choix des critères de `classify.ts` est déjà au plafond** par rapport à l'évaluation enrichie : accord exact pour 39 outils sur 57, soit **tous** les outils où l'IA retient autant de critères que d'étoiles, et aucun critère retenu par l'IA n'est écarté. Les 18 autres sont des outils où l'IA en confirme **moins** que d'étoiles.
2. **Aucune version fondée sur la description ou sur l'enrichissement n'améliore cet accord de façon fiable** (essais A à D ci-dessous). La seule amélioration mesurée est `confiance` (`classify2.ts`).
3. **La piste 1** (faire confirmer chaque critère, citation à l'appui, par deux IA) montre pourquoi : les IA ne s'entendent pas sur le critère « contrôle » (21 outils de désaccord sur 57), alors qu'elles s'accordent à 100 % sur « données » et à 91 % sur « dépendance ».

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `essais/` | Les scripts des essais A à D et des mesures de base (voir plus bas; `liste.ts`, `exemples.ts` et `verif.ts` sont des aides), à lancer avec `nub analyses/classification/essais/<script>.ts <outils.json> [options]` |
| `../../confirmer.ts` | La confirmation critère par critère (piste 1), avec OpenAI ou Claude |
| `analyser-confirmations.ts` | Compare les confirmations des deux fournisseurs, jetons et coût compris |
| `confirmations-openai.json`, `confirmations-claude.json` | Les verdicts, les citations, les jetons et le coût de chaque appel |
| `resultats-confirmations.md` | La sortie de `analyser-confirmations.ts` |
| `.cache/` | Pages téléchargées (ignoré par git) |

## Essais A à D (sur 57 outils, validation croisée « un contre tous »)

Mesure de base : `criteres` contre `evaluation_enrichie.criteres`, 39 sur 57 identiques, Jaccard moyen 0,822. L'IA ne retient jamais un critère que `classify.ts` a écarté ; tous les écarts sont des outils où elle en retient moins que d'étoiles (9 outils à 2 étoiles avec 1 critère, 4 avec aucun, 5 outils à 3 étoiles avec 2).

| Essai | Script | Résultat (ensembles identiques) |
|---|---|---|
| Bornes : nombre de critères de l'IA connu à l'avance, classement de `classify.ts` | `essai-c.ts` | 53 sur 57 : le classement est bon, c'est le **nombre** de critères que la description ne dit pas |
| C. Retirer les critères retenus sans indice dans la description | `essai-c.ts` | 33 sur 57 (pire que la base) |
| A. Régression logistique sur les mots de la description, la catégorie et les indices | `essai-a.ts` | 37 à 40 |
| B. Les mêmes avec tags, statut du code source, licence, dépôt et description longue (après enrichissement) | `essai-b.ts` | 36 à 40 |
| D. Modèle de A, seuil de retrait balayé et choisi par validation imbriquée | `essai-d.ts` | 39 à 41 (3 outils gagnés, 1 perdu, test des signes p = 0,63) |

Le modèle appris a un signal au niveau du critère (AUC de 0,83 contre 0,73 pour les indices de `classify.ts` quand il s'agit de deviner quels critères retenus l'IA confirmera, `controle-modele.ts`), mais 22 critères non confirmés seulement : ce signal ne se traduit pas par un meilleur résultat sur les ensembles. Les approches B (tags et évaluation viennent du même appel à l'IA) mesurent de plus une cohérence interne, pas la vérité. Confiance : `calib.ts`, `niveau-outil.ts` et `variantes.ts` ont servi à la recalibration de `confiance` (`classify2.ts`, AUC 0,756 → 0,811, écart non significatif).

## Piste 1 : confirmer chaque critère, avec citation

`nub confirmer.ts --fournisseur=openai` et `--fournisseur=claude`. Chaque outil enrichi est envoyé séparément (nom, catégorie, lien, description, titre, méta-description et extrait de la page, 6 000 caractères au plus ; **ni score ni critères du répertoire**). L'IA répond pour chaque critère « confirmé », « infirmé » ou « indéterminé », avec une citation copiée mot pour mot (300 caractères au plus) ; une citation introuvable dans les textes fournis rend la réponse invalide et la fait redemander une fois. Aucune réponse n'a dû être redemandée (0 nouvel essai, 0 échec pour chaque fournisseur : toutes les citations conservées existent bien dans les textes fournis).

### Jetons et coût

| | OpenAI `gpt-6-astra` | Claude `claude-fable-5-2` |
|---|---|---|
| Appels | 57 | 57 |
| Jetons en entrée | 98 688 (dont 5 749 en cache) | 231 456 (dont 90 831 lus du cache) |
| Jetons en sortie | 9 977 | 21 562 |
| **Coût de l'exécution complète** | **1,4340 $** | **3,1297 $** |
| Par outil (moyenne) | 0,025 $ (1 731 jetons en entrée, 175 en sortie) | 0,055 $ (4 061 jetons en entrée, 378 en sortie) |
| Pilote de 3 outils (exécuté avant) | 0,0821 $ | 0,2054 $ |
| Essais de la CLI (voir la note) | | 0,7139 $ |
| **Coût total de l'expérience** | **1,5161 $** | **4,0490 $** |

Prix utilisés (par million de jetons, pages de tarifs OpenAI et Anthropic consultées le 2026-11-12) : `gpt-6-astra` 10 $ en entrée, 1 $ en cache, 50 $ en sortie ; `claude-fable-5-2` 8 $ en entrée, 0,20 $ en cache lu, 40 $ en sortie. Pour OpenAI, `confirmer.ts` calcule le coût avec ces prix à partir des jetons rapportés par l'API ; je l'ai vérifié à la main : (98 688 − 5 749) × 10 + 5 749 × 1 + 9 977 × 50 = 1 433 989 µ$. Pour Claude, c'est le coût au prix catalogue (`total_cost_usd`) que rapporte la CLI `claude -p` : il sert d'équivalent API, la facturation réelle dépend de l'abonnement.

Notes :
- **Jetons de Claude plus nombreux :** la CLI ajoute son propre contexte (environ 2 300 jetons de plus par appel que pour OpenAI, même avec `--strict-mcp-config`, `--setting-sources ""` et sans outil). Le texte de l'outil envoyé est le même.
- **Essais de la CLI :** un premier essai, avant d'isoler la CLI du projet, a chargé 178 221 jetons de contexte et coûté 0,7136 $ pour une réponse triviale ; un second essai, isolé, a coûté 0,0003 $. C'est pourquoi `confirmer.ts` isole la CLI.
- **Raisonnement :** les jetons de raisonnement d'OpenAI sont comptés dans `output_tokens` et facturés comme sortie ; je n'ai pas d'autre détail.

### Résultats

Le détail est dans [`resultats-confirmations.md`](resultats-confirmations.md). L'essentiel (57 outils) :

| Critère | OpenAI : confirmé / infirmé / indéterminé | Claude : confirmé / infirmé / indéterminé | Accord des deux |
|---|---|---|---|
| données | 45 / 0 / 12 | 45 / 0 / 12 | 57 sur 57 |
| contrôle | 3 / 23 / 31 | 24 / 28 / 5 | 36 sur 57 |
| dépendance | 21 / 2 / 34 | 22 / 3 / 32 | 52 sur 57 |

| Comparaison (ensembles de critères confirmés identiques) | Accord exact | Jaccard moyen |
|---|---|---|
| OpenAI contre `criteres` (déduit) | 18 sur 57 | 0,564 |
| Claude contre `criteres` (déduit) | 29 sur 57 | 0,743 |
| OpenAI contre `evaluation_enrichie.criteres` | 28 sur 57 | 0,684 |
| Claude contre `evaluation_enrichie.criteres` | 34 sur 57 | 0,760 |
| OpenAI contre Claude | 32 sur 57 | 0,708 |

Constats :
- **« Données » est stable :** les deux IA confirment le critère pour les mêmes 45 outils et jugent les 12 autres indéterminés (jamais infirmés). Le critère se confirme surtout par une mention explicite (hébergement, auto-hébergement, Canada).
- **« Contrôle » dépend de l'interprétation :** pour un outil « québécois » ou « canadien », OpenAI répond le plus souvent « indéterminé » (la nationalité ne dit pas qui contrôle l'outil), alors que Claude confirme (24 outils) et cite la description (par exemple Antidote ou cDox). Inversement, Claude infirme « Matomo » avec la citation « Il est d'origine internationale ». C'est la même ambiguïté que `classify.ts` et l'enrichissement avaient déjà : les descriptions des outils confirmés et non confirmés sont indiscernables.
- **Aucune IA ne confirme plus de critères que d'étoiles** (0 cas), et OpenAI en confirme moins que d'étoiles pour 39 outils sur 57, Claude pour 28.
- **Sur les 18 outils où l'enrichissement en confirmait moins que d'étoiles,** OpenAI retrouve exactement les critères de l'enrichissement pour 10 et n'en confirme jamais de plus ; Claude confirme plus de critères que l'enrichissement pour 7 d'entre eux (plus proche des étoiles).
- **Le verdict « indéterminé » est utile :** il sépare « la page ne dit rien » de « la page dit non », ce que `evaluation_enrichie` ne distingue pas.

### Limites

- Les deux IA lisent le même extrait de page (6 000 caractères) ; une page presque vide ou rendue par JavaScript n'est pas évaluée (comme pour l'enrichissement).
- Un seul passage par fournisseur et par outil : les résultats peuvent varier d'une exécution à l'autre.
- Aucune des deux n'est la vérité. L'accord entre IA mesure une cohérence, pas l'exactitude ; le désaccord sur « contrôle » montre qu'il faudrait d'abord préciser la définition du critère (voir `criteres.json`) ou faire valider un échantillon par une personne.
- Le modèle de Claude (`claude-fable-5-2`) et celui d'OpenAI (`gpt-6-astra`) sont les plus chers de leur catégorie ; des modèles plus petits (`gpt-6.1-sol`, `claude-sonnet-5-5`) coûteraient environ cinq fois moins par outil, mais n'ont pas été essayés.

## Reproduire

```sh
nub confirmer.ts --fournisseur=openai --dry-run                  # liste les outils, sans appel
nub confirmer.ts --fournisseur=openai --limite=3 --budget=2      # pilote
nub confirmer.ts --fournisseur=claude --budget=10                # exécution complète, reprise possible
nub analyses/classification/analyser-confirmations.ts outils.json
nub analyses/classification/essais/base.ts outils.json           # mesure de base; voir aussi essai-a à essai-d
```

## Règle A pour « contrôle » : la nationalité mentionnée suffit

Suite du désaccord sur « contrôle » : les consignes de `confirmer.ts` reçoivent une précision (`REGLES.A`, option `--regle=A`), sans toucher à `criteres.json` (texte des auteurs du répertoire, que `extract.ts` réécrit depuis la page). Règle A : « confirmé » si les textes disent que l'outil est canadien ou québécois, sans exiger de détail sur la propriété ; « infirmé » si origine étrangère ou filiale étrangère ; « indéterminé » sinon. Relancée sur les 21 outils où les deux IA divergeaient (`liste-desaccord-controle.json`, option `--liste`). Résultats détaillés : [`resultats-regle-a.md`](resultats-regle-a.md).

| | OpenAI `gpt-6-astra` | Claude `claude-fable-5-2` |
|---|---|---|
| Appels | 21 | 21 |
| Jetons en entrée | 39 898 | 91 688 (dont 33 550 lus du cache) |
| Jetons en sortie | 2 363 | 4 631 |
| **Coût** | **0,5171 $** | **1,1218 $** |
| Durée (les deux en parallèle) | environ 4 minutes | |

Constats :
- **Accord total sur ces 21 outils :** avec la règle A, OpenAI passe de 21 « indéterminé » à 21 « confirmé », et Claude reste à 21 « confirmé ». Les deux IA ont donc le même verdict pour les 21 (contre 0 au départ, par construction : ces outils avaient été choisis pour leur désaccord).
- **C'est en partie tautologique :** la règle A dit aux IA de faire ce que `classify.ts` fait déjà (« québécois » ou « canadien » vaut preuve), et `criteres` retient « contrôle » pour ces 21 outils. L'accord mesure que les IA suivent la consigne, pas que le contrôle canadien est établi : `evaluation_enrichie` ne le retenait que pour 14 des 21.
- **Variabilité faible :** pour « données » et « dépendance », dont les consignes n'ont pas changé, un seul verdict sur 126 (21 outils × 3 critères × 2 fournisseurs, moins « contrôle ») a changé entre les deux exécutions (Claude, « données »). Le changement d'OpenAI sur « contrôle » est donc dû à la règle, pas au hasard.
- **Aucune citation rejetée,** aucun nouvel essai.

Ce que ça dit : le critère « contrôle » n'est pas mesurable à partir des descriptions sans une convention de lecture ; la règle A en est une, raisonnable pour un répertoire qui qualifie lui-même ses outils de « canadiens », mais elle ne vérifie pas la propriété. Pour aller plus loin, il faudrait des sources sur la propriété des entreprises (registre, page « à propos »), ou une validation humaine d'un échantillon.
