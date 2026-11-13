# Contrat: filtres, recherche et adresse

> **Remplacé par la tranche 002** (2026-11-13). L'accueil n'a plus de filtres : ils sont dans l'explorateur, dont l'adresse est décrite dans [specs/002-explorateur-outils/contracts/adresse.md](../../002-explorateur-outils/contracts/adresse.md). Les quatre paramètres ci-dessous (`categorie`, `tag`, `statut`, `q`) y gardent leur nom et leurs valeurs, mais une ancienne adresse filtrée de l'accueil (`/?tag=…`) affiche maintenant l'accueil de présentation.

Ce contrat fixe l'interface publique des filtres: les paramètres de l'adresse de la page d'accueil
et la règle de sélection. Une adresse partagée aujourd'hui doit donner la même liste demain.

## Paramètres de l'adresse

| Paramètre | Répétable | Valeurs | Exemple |
|---|---|---|---|
| `categorie` | Oui | Un `categories[].id` | `categorie=messagerie-electronique` |
| `tag` | Oui | Un `tags[].id` | `tag=chiffrement&tag=sans-publicite` |
| `statut` | Oui | `libre`, `partiel`, `source-disponible`, `proprietaire`, `non-enrichi` | `statut=libre&statut=partiel` |
| `q` | Non | Texte libre: une partie du nom | `q=next` |

Exemple complet: `<base>/?categorie=messagerie-electronique&statut=libre&statut=partiel&q=mail`

Règles de lecture:

- Une valeur inconnue (catégorie, tag ou statut absent des données) est ignorée; les autres
  s'appliquent; la page ne tombe pas en erreur.
- Un paramètre inconnu est ignoré et conservé tel quel.
- `q` vide ou fait d'espaces équivaut à l'absence de recherche.
- Sans aucun paramètre reconnu, la liste complète s'affiche.

Règles d'écriture:

- L'adresse ne contient que les choix actifs; sans choix, elle redevient `<base>/`.
- Les valeurs sont écrites dans l'ordre des données (catégories, puis tags, puis statuts, puis
  `q`), pour qu'un même état donne toujours la même adresse.
- Cocher ou décocher une case, ou effacer les filtres, ajoute une entrée à l'historique du
  navigateur; la frappe dans la recherche remplace l'entrée courante.
- Le bouton précédent ou suivant du navigateur restaure l'état de l'entrée atteinte: cases
  cochées, texte de recherche et liste.

## Règle de sélection

Un outil est affiché si les quatre conditions sont vraies:

1. aucune catégorie n'est choisie, ou sa catégorie est l'une des catégories choisies;
2. aucun tag n'est choisi, ou il porte au moins un des tags choisis;
3. aucun statut n'est choisi, ou son statut est l'un des statuts choisis (un outil non enrichi a le
   statut `non-enrichi`);
4. `q` est vide, ou son nom normalisé contient `q` normalisé.

Normalisation: minuscules, accents retirés, espaces de début et de fin retirés. « Élodia »,
« elodia » et « ÉLODIA » sont équivalents.

Conséquences:

- « ou » à l'intérieur d'un type, « et » entre les types et avec la recherche.
- Choisir un tag exclut les outils non enrichis, qui n'en ont pas.
- Une catégorie dont aucun outil n'est affiché est masquée avec son titre.

## Interface

| Élément | Exigence |
|---|---|
| Formulaire | Rendu par l'île Solid `Filtres.tsx`, `hidden` dans le HTML servi; révélé après l'hydratation. Sans JavaScript, il n'apparaît pas (FR-027) |
| Groupes | Trois `<fieldset>` avec `<legend>`: « Catégorie », « Tag », « Statut du code source »; une case à cocher avec `<label>` par valeur |
| Recherche | Un champ de type recherche avec `<label>` « Chercher un outil par son nom » |
| Compteur | « N outils affichés sur M », dans une région `aria-live="polite"`, mis à jour à chaque changement (FR-015) |
| Aucun résultat | Un message « Aucun outil ne correspond à ces choix. » et un bouton « Effacer les filtres » |
| Effacer | Un bouton « Effacer les filtres », visible dès qu'un choix est actif; il décoche tout, vide la recherche et rend le focus au formulaire |
| Clavier | Toutes les commandes atteignables par tabulation, activables par espace ou entrée; focus visible |
| Outils masqués | Retirés de l'affichage et de l'arbre d'accessibilité (attribut `hidden`) |

## Liens internes qui utilisent ce contrat

- Sur une fiche, la catégorie mène à `<base>/?categorie=<id>`.
- Sur une fiche, chaque tag mène à `<base>/?tag=<id>`.

Sans JavaScript, ces liens ouvrent la liste complète.
