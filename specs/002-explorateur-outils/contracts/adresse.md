# Contrat: adresse de l'explorateur

Adresse de la page: `<base>/explorer/`. Un état donné s'écrit toujours de la même façon, et une
adresse partagée aujourd'hui doit restaurer le même état demain.

## Paramètres

| Paramètre | Répétable | Valeurs | Défaut (non écrit) |
|---|---|---|---|
| `categorie` | Oui | `id` d'une catégorie | |
| `tag` | Oui | `id` d'un tag | |
| `statut` | Oui | `libre`, `partiel`, `source-disponible`, `proprietaire`, `non-enrichi` | |
| `pays` | Oui | Code de pays présent dans les données (`FR`, `CH`, `EU`…) | |
| `source` | Oui | `id` d'une source (`praxis`, `facil`, `charles`…) | |
| `q` | Non | Partie du nom | |
| `score` | Non | `1`, `2` ou `3` (score minimal) | `0` |
| `donnees`, `controle`, `dependance` | Non | `confirme`, `infirme`, `indetermine` | |
| `enrichi` | Non | `oui`, `non` | |
| `tri` | Non | `nom`, `score`, `categorie` | `categorie` |
| `sens` | Non | `asc`, `desc` | `asc` |
| `vue` | Non | `cartes`, `tableau` | `cartes` |
| `comparer` | Oui | `id` d'un outil actif, quatre au plus | |

Les quatre premiers paramètres de filtre (`categorie`, `tag`, `statut`, `q`) gardent les noms et
les valeurs de la tranche 001.

Exemple: `<base>/explorer/?statut=libre&pays=FR&pays=CH&score=2&donnees=confirme&tri=score&sens=desc&vue=tableau&comparer=nextcloud&comparer=kdrive`

## Lecture

- Une valeur inconnue est ignorée; les autres s'appliquent; la page ne tombe pas en erreur.
- `score` hors de 1 à 3, `tri`, `sens`, `vue`, `enrichi` ou un verdict inconnus: la valeur par
  défaut s'applique.
- `comparer`: les identifiants inconnus et les doublons sont ignorés; au-delà de quatre, seuls les
  quatre premiers valides sont retenus.
- Un paramètre qui n'est pas de cette liste est ignoré et conservé.

## Écriture

- Seuls les choix qui diffèrent du défaut sont écrits; sans aucun choix, l'adresse est
  `<base>/explorer/`.
- Ordre fixe: `categorie`, `tag`, `statut`, `pays`, `source` (chacun dans l'ordre des données),
  `q`, `score`, `donnees`, `controle`, `dependance`, `enrichi`, `tri`, `sens`, `vue`, `comparer`
  (dans l'ordre du choix).
- Une case, le tri, le sens, la vue, un choix de comparaison ou « Effacer » poussent une entrée
  d'historique; la frappe dans la recherche remplace l'entrée courante.
- Le bouton précédent ou suivant restaure l'état complet de l'entrée atteinte.

## Liens internes qui emploient ce contrat

- Sur une fiche, la catégorie mène à `<base>/explorer/?categorie=<id>` et chaque tag à
  `<base>/explorer/?tag=<id>`.
