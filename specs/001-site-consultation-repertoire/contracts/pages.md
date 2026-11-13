# Contrat: pages du site

> **Remplacé en partie par la tranche 002** (2026-11-13). La section « Accueil » ci-dessous ne vaut plus : l'accueil est devenu une page de présentation, et la liste par catégorie est sur la page « Outils », sans filtres. Voir [specs/002-explorateur-outils/contracts/pages.md](../../002-explorateur-outils/contracts/pages.md). Les sections « Toutes les pages » et « Fiche » restent valables, sauf les liens de catégorie et de tag des fiches, qui mènent à l'explorateur.

Ce que chaque page doit contenir, quelle que soit sa mise en forme. Les tests du site bâti
(`site/test/build/`) vérifient ce contrat sur le HTML produit, sans exécuter de script.

`<base>` est le chemin de base du site (`/` par défaut, `SITE_BASE` sinon). Tous les liens internes
le portent.

## Toutes les pages

| Élément | Exigence |
|---|---|
| Langue | `<html lang="fr-CA">` |
| Titre | `<title>` propre à la page, suivi du nom du site |
| Lien d'évitement | Premier élément focalisable, vers le contenu principal |
| Régions | Un `<header>`, un `<main id="contenu">`, un `<footer>`; un seul `<h1>` |
| Pied: attribution | Les noms Sven Buridans, François Delnooz et Marie-Renee Duguay, le titre « Répertoire d'outils favorisant la souveraineté numérique », et un lien vers la note sur Praxis (FR-019) |
| Pied: licence | « CC BY-SA 4.0 », lié à <https://creativecommons.org/licenses/by-sa/4.0/deed.fr> |
| Pied: autres sources | Les Services FACiLes et Charles, nommés et liés d'après `sources.json` (FR-020) |
| Pied: IA | Une phrase qui dit que les champs marqués « Produit par IA, à vérifier » résument des pages tierces |
| Pied: date | La date de dernière mise à jour des données (`meta.updated_at` de `outils.json`) |
| Pied: dépôt et build | Un lien « Code source et données » vers le dépôt déclaré dans `package.json`; le hash Git court du build, lié à son commit dans le dépôt; la date du build dans un élément `<time>` (amendement du 2026-11-13). Sans dépôt Git au moment du build, le hash est omis |
| Sans script | Tout le contenu ci-dessus et celui de la page est dans le HTML servi |

## Accueil: `<base>/`

| Élément | Exigence |
|---|---|
| `<h1>` | Le nom du répertoire |
| Introduction | À qui s'adresse le répertoire et ce que mesurent les étoiles, en une ou deux phrases |
| Filtres | Un formulaire portant l'attribut `hidden` dans le HTML servi (voir [filtres.md](filtres.md)) |
| Compteur | Une région `aria-live="polite"` avec le nombre d'outils affichés; dans le HTML servi, le nombre total |
| Catégories | Une section par catégorie ayant au moins un outil actif, dans l'ordre de `categories.json`: `<h2>` avec le nom et l'icône (icône masquée aux lecteurs d'écran), description si elle existe, avec le libellé « Produit par IA, à vérifier » |
| Carte d'outil | Une par outil actif, une seule fois, dans sa catégorie |

Chaque carte d'outil contient:

| Élément | Exigence |
|---|---|
| Nom | Un lien vers `<base>/outils/<id>/` |
| Score | Étoiles avec l'équivalent textuel « N étoiles sur 3 »; « score estimé » si `score_estime` |
| Statut du code source | Présent si l'outil est enrichi, avec le libellé d'IA; absent sinon, sans emplacement vide |
| Description courte | `description` |
| Attributs de filtre | `data-categorie`, `data-tags` (identifiants séparés par des espaces), `data-statut`, `data-nom` (nom normalisé) |

## Fiche: `<base>/outils/<id>/`

Sections dans cet ordre. Une section sans contenu n'est pas rendue (ni titre, ni conteneur).

| Section | Contenu | Provenance affichée | Présente quand |
|---|---|---|---|
| En-tête | `<h1>` nom; catégorie (lien vers l'accueil filtré sur la catégorie); score avec équivalent textuel et « score estimé » le cas échéant; statut du code source; lien « Site de l'outil » vers `lien` | Source; IA pour le statut | Toujours (statut si enrichi) |
| Description | `description` | Source | Toujours |
| Description détaillée | `description_longue` rendue depuis le Markdown | IA | Enrichi |
| Critères de souveraineté | Les trois lectures, chacune sous son titre et sa phrase d'explication (voir ci-dessous) | Par lecture | Toujours (au moins les critères déduits) |
| Code source et licence | Licence ou licence maison; dépôt de code (lien) | IA | Au moins un des champs existe |
| Tags | Chaque tag avec sa description, lié à l'accueil filtré sur ce tag | IA | L'outil a des tags |
| Logiciel et provenance | Pays de l'éditeur; logiciel dont l'outil est une instance, avec la mention que description et critères portent sur lui | Source | Au moins un des champs existe |
| Open Hub | Lien vers la page du projet; lignes non nulles; date de lecture | Open Hub | L'outil a `openhub` |
| Services remplacés | Liste de liens (`alternative_a`) | Source | La liste existe |
| Voir aussi | Outils apparentés: lien vers la fiche quand elle existe, texte sinon | Déduit par ce dépôt | La liste existe |
| Source | Nom de la source (`sources.json`), lien vers elle | Source | Toujours |
| Retour | Lien vers l'accueil | | Toujours |

### Section « Critères de souveraineté »

| Lecture | Titre | Contenu |
|---|---|---|
| Vérifiés | « Critères vérifiés d'après la page de l'outil » | Phrase: le verdict est celui d'un modèle d'IA, la citation permet de le contrôler. Pour chacun des trois critères: icône, question, verdict en texte (« Confirmé », « Infirmé », « Indéterminé ») et, sauf indéterminé, la citation dans un `<blockquote>`. Modèle et date de la vérification |
| Déduits | « Critères déduits des étoiles » | Phrase: déduction de ce dépôt à partir de la description, pas une donnée de la source. Les critères retenus et la fiabilité (« élevée », « moyenne », « faible », « indéterminée ») |
| Second avis | « Second avis du modèle » | Phrase: évaluation indépendante par un modèle d'IA. Score, critères retenus, fiabilité, et l'explication de l'écart quand `ecart` existe |

Les lectures « Vérifiés » et « Second avis » ne sont rendues que pour un outil qui a les champs
correspondants.

## Page introuvable: `<base>/404.html`

Un `<h1>` « Page introuvable », une phrase et un lien vers l'accueil. Même pied que les autres
pages.

## Échecs de génération

Le build s'arrête avec un code de sortie non nul et un message en français, sans écrire de site
partiel, quand:

| Cas | Message attendu (contient) |
|---|---|
| Fichier de données absent ou JSON invalide | Le nom du fichier |
| Structure inattendue (`meta` ou tableau manquant, champ obligatoire absent) | Le nom du fichier et le champ |
| Catégorie, source ou tag référencé mais inconnu | L'outil et l'identifiant inconnu |
| Deux outils actifs avec le même identifiant de fiche | Les deux noms et l'identifiant |
