# Modèle de données: explorateur interactif des outils

L'explorateur ne crée aucune donnée du dépôt. Au build, le site écrit un fichier dérivé,
`explorateur.json`, à partir des cinq fichiers de la racine lus tels quels; dans le navigateur,
l'île le lit et garde l'état de la personne dans l'adresse.

## Outil de l'explorateur

Un par outil actif (sans `removed`). Forme exacte dans [contracts/donnees.md](contracts/donnees.md).

| Champ | Vient de | Provenance affichée |
|---|---|---|
| `id` | Slug de `nom` (adresse de la fiche) | |
| `nom` | `nom` | Source |
| `categorie` | `categorie` | Source |
| `score`, `scoreEstime` | `score`, `score_estime` | Source, ou « score estimé » |
| `statut` | `source`, ou `non-enrichi` | IA |
| `tags` | `tags` (vide si absent) | IA |
| `pays` | `pays` (absent si la source ne le dit pas) | Source |
| `source` | `source_repertoire_id` | Source |
| `enrichi` | `enrichi_le` présent | |
| `licence` | `licence`, sinon `custom_license` (absent sinon) | IA |
| `remplace` | Nom d'hôte de chaque `alternative_a` (vide si absent) | Source |
| `verdicts` | Pour chaque critère: `confirme`, `infirme` ou `indetermine`, d'après `criteres_confirmes`; absent si l'outil n'est pas vérifié | IA |
| `deduits` | `criteres` (identifiants) | Déduit par ce dépôt |
| `description` | `description` | Source |

Les descriptions longues, les citations, le second avis du modèle et Open Hub restent sur la
fiche.

## Référentiels joints au fichier

| Tableau | Contenu | Usage |
|---|---|---|
| `categories` | `id`, `nom`, `icone`, dans l'ordre des données, celles qui ont un outil actif | Filtre, tri par catégorie, affichage |
| `tags` | `id` des tags portés par un outil actif | Filtre |
| `sources` | `id`, `nom` des sources d'un outil actif | Filtre, colonne « Source » |
| `criteres` | `id`, `icon`, `titre` des trois critères | Filtres de verdict, comparaison |
| `pays` | `code`, `nom` français des pays d'un outil actif, triés par nom | Filtre, affichage |

`meta` porte `data_license` (`CC-BY-SA-4.0`) et `updated_at` (date des données).

## État de l'explorateur

Porté par l'adresse ([contracts/adresse.md](contracts/adresse.md)); rien n'est enregistré ailleurs.

| Champ | Type | Défaut | Valeurs |
|---|---|---|---|
| `categories`, `tags`, `statuts`, `pays`, `sources` | Ensembles | Vides | Valeurs connues du fichier |
| `q` | Texte | Vide | Partie du nom |
| `scoreMin` | Entier | 0 | 0 à 3 |
| `verdicts` | Un verdict au plus par critère | Aucun | `confirme`, `infirme`, `indetermine` |
| `enrichi` | Choix | Tous | `oui`, `non` |
| `tri` | Choix | `categorie` | `nom`, `score`, `categorie` |
| `sens` | Choix | `asc` | `asc`, `desc` |
| `vue` | Choix | `cartes` | `cartes`, `tableau` |
| `comparer` | Liste ordonnée d'`id` | Vide | Au plus 4 outils actifs |

## Règle de sélection

Un outil est retenu s'il répond à **tous** les filtres actifs:

1. `categories`, `tags`, `statuts`, `pays`, `sources`: ensemble vide, ou l'outil répond à **au
   moins une** valeur choisie (pour les tags: il en porte au moins un; un outil sans pays n'est
   retenu par aucun choix de pays);
2. `q`: vide, ou le nom normalisé (minuscules, sans accents) contient `q` normalisé;
3. `scoreMin`: `score >= scoreMin`;
4. `verdicts`: pour chaque critère qui a un verdict demandé, l'outil a des critères vérifiés **et**
   ce verdict pour ce critère;
5. `enrichi`: `oui` retient les outils enrichis, `non` les autres.

## Règle de tri

| Tri | Clé | Égalités |
|---|---|---|
| `nom` | Ordre alphabétique français, sans égard à la casse ni aux accents, nombres comparés comme des nombres | |
| `score` | `score` | Par nom, croissant |
| `categorie` | Rang de la catégorie dans les données | Par nom, croissant |

`sens = desc` inverse la clé; le départage par nom reste croissant.

## Comparaison

- De 2 à 4 outils; l'ordre est celui du choix. Avec un seul outil choisi, la comparaison n'est pas
  affichée et la page dit qu'il en faut deux. Un cinquième est refusé avec un message.
- Un outil comparé reste dans la comparaison même si les filtres ne le retiennent plus.
- Lignes, dans cet ordre, une colonne par outil:

| Ligne | Contenu | Si absent |
|---|---|---|
| Score | Étoiles, texte « N étoiles sur 3 », « score estimé » le cas échéant | |
| Un critère par ligne (3 lignes), « vérifié d'après la page de l'outil » | « Confirmé », « Infirmé » ou « Indéterminé » | « Non vérifié » |
| Critères déduits des étoiles | Les critères retenus | « Aucun » |
| Statut du code source | Libellé du statut | « Pas encore enrichi » |
| Licence | Licence | « Non connue » |
| Pays de l'éditeur | Nom français | « Non connu » |
| Services remplacés | Noms d'hôte | « Aucun connu » |

## Transitions d'état de la page

```text
(sans JavaScript) ──▶ message et lien vers « Outils »
chargement ──▶ prêt ──▶ (choix) ──▶ prêt
chargement ──▶ erreur ──▶ (Réessayer) ──▶ chargement
```
