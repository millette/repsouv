# Modèle de données: site de consultation du répertoire

Le site ne crée aucune donnée. Il lit les cinq fichiers de la racine tels quels; leurs types sont
ceux du dépôt (`extract.ts`, `classify.ts`, `categories.ts`, `enrichir.ts`, `sources.ts`), importés
par `import type`. Ce document dit ce que le site lit, d'où vient chaque champ affiché, et les
règles d'affichage qui en découlent.

## Fichiers lus

| Fichier | Tableau | Type du dépôt | Rôle dans le site |
|---|---|---|---|
| `outils.json` | `outils` | `OutilClasse` | Les outils: liste et fiches |
| `categories.json` | `categories` | `Categorie` | Regroupement de la liste, filtre |
| `criteres.json` | `criteres` | `Critere` | Question et icône de chaque critère |
| `tags.json` | `tags` | `Tag` | Description des tags, filtre |
| `sources.json` | `sources` | `Source` | Nom et lien de la source de chaque outil |

Chaque fichier a la forme `{ meta, <tableau> }`. `meta.updated_at` de `outils.json` est affiché
dans le pied de page (« Données du … »).

**Validation au chargement** (`donnees.ts`), avec un message qui nomme le fichier fautif:

- le fichier existe et est du JSON valide;
- `meta` et le tableau attendu sont présents, le tableau est non vide;
- chaque outil a `nom`, `categorie`, `score`, `lien`, `description` et `source_repertoire_id`;
- chaque `outils[].categorie` existe dans `categories.json`, chaque `source_repertoire_id` dans
  `sources.json`, chaque tag dans `tags.json`.

Le reste de la forme est garanti par les schémas JSON du dépôt et par `nub run test`.

## Entités dérivées (calculées au build, jamais écrites)

### Outil actif

Un outil de `outils.json` sans `removed`. Seuls les outils actifs ont une carte et une fiche
(FR-023).

| Attribut dérivé | Calcul |
|---|---|
| `id` | Slug de `nom` (minuscules, sans accents, tirets). Unique parmi les outils actifs, sinon le build échoue (FR-005, FR-024) |
| `adresse` | `<base>/outils/<id>/` |
| `enrichi` | `enrichi_le` est présent |
| `statut` | `source` (`libre`, `partiel`, `source-disponible`, `proprietaire`), ou `non-enrichi` si absent |
| `nomNormalise` | `nom` en minuscules, sans accents: sert à la recherche (FR-013) |
| `apparentes` | Pour chaque nom de `voir_aussi`: l'outil actif de même nom s'il existe (lien vers sa fiche), sinon le nom seul (FR-009) |
| `sourceRepertoire` | L'entrée de `sources.json` désignée par `source_repertoire_id` |

### Groupe de catégorie

Une catégorie de `categories.json` et ses outils actifs, dans l'ordre des données. Une catégorie
sans outil actif n'est pas affichée.

### Lectures des critères (FR-007, FR-032 à FR-034)

Pour un outil, trois lectures distinctes des mêmes trois critères:

| Lecture | Champs | Provenance | Présente quand |
|---|---|---|---|
| **Critères vérifiés** | `criteres_confirmes`: `criteres`, `preuves`, `infirmes`, `modele`, `date` | IA, avec citation | L'outil a `criteres_confirmes` |
| **Critères déduits des étoiles** | `criteres`, `confiance` | Heuristique du dépôt | Toujours (tout outil a `criteres`) |
| **Second avis du modèle** | `evaluation_enrichie`: `score`, `criteres`, `confiance`, `ecart` | IA | L'outil a `evaluation_enrichie` |

Verdict d'un critère vérifié, pour chaque `id` de `criteres.json`:

- **confirmé** si `id` est dans `criteres_confirmes.criteres`; citation: `preuves[id]`;
- **infirmé** si `infirmes[id]` existe; citation: `infirmes[id]`;
- **indéterminé** sinon: aucune citation, et la mention que la page de l'outil ne permet pas de
  conclure.

Les citations sont affichées telles quelles, dans un élément de citation, sans correction ni
troncature.

## Provenance de chaque champ affiché

Quatre provenances, fixées dans une table unique (`provenance.ts`). Le libellé est affiché en texte
à côté du champ ou de la section.

| Provenance | Libellé affiché | Champs |
|---|---|---|
| `source` | « Selon la source » (ou rien, quand le contexte le dit déjà) | `nom`, `categorie`, `score` sans `score_estime`, `description`, `lien`, `pays`, `alternative_a`, `instance_de`, `source_repertoire_id` |
| `heuristique` | « Déduit par ce dépôt » | `criteres`, `confiance`, `score` avec `score_estime` (« score estimé »), `voir_aussi` (calculé) |
| `ia` | « Produit par IA, à vérifier » | `description_longue`, `tags`, `source` (statut du code), `licence`, `custom_license`, `custom_license_url`, `repo`, `evaluation_enrichie`, `criteres_confirmes`, `categories[].description` |
| `openhub` | « Données publiques d'Open Hub, lues le … » | `openhub_id`, `openhub.*` |

Règles:

- Un champ de provenance `ia` n'est jamais rendu sans son libellé (FR-016, SC-005).
- Le libellé ne repose ni sur la couleur ni sur le survol (FR-017).
- Un score avec `score_estime` porte la mention textuelle « score estimé », dans la liste comme
  sur la fiche (FR-004).
- La section des critères vérifiés dit que le verdict est celui d'un modèle d'IA et que la
  citation permet de le contrôler (FR-018).

## Règles d'affichage

- **Champ absent** (`undefined`, `null`, tableau vide, chaîne vide): ni titre, ni emplacement, ni
  mention « inconnu » (FR-010, FR-011). Une section dont tous les champs sont absents n'est pas
  rendue.
- **Outil non enrichi**: carte et fiche avec les champs de provenance `source`, plus les critères
  déduits sur la fiche. Aucun libellé d'IA, puisqu'aucun champ d'IA n'est rendu.
- **Fiabilité « indéterminée »** des critères déduits: affichée en clair (« fiabilité
  indéterminée: l'outil n'est pas encore enrichi »).
- **Licence**: `licence` (expression SPDX) en texte; sinon `custom_license`, lié à
  `custom_license_url` quand il existe.
- **Statut du code source**: libellés « Libre », « Partiellement libre », « Code source
  disponible », « Propriétaire »; « Pas encore enrichi » dans les filtres seulement.
- **Score**: de 0 à 3 étoiles, avec l'équivalent textuel « N étoiles sur 3 ».
- **Pays**: nom en français d'après le code (`Intl.DisplayNames`), présenté comme une affirmation
  de la source; un code inconnu s'affiche tel quel.
- **Services remplacés** (`alternative_a`): liste de liens; le texte du lien est le nom d'hôte de
  l'URL.
- **Logiciel sous-jacent** (`instance_de`): nom lié à son URL, avec la mention que la description
  longue et les critères portent sur ce logiciel.
- **Open Hub**: lien vers `https://www.openhub.net/p/<openhub_id>`; chaque ligne (`organisation`,
  `activite`, `licences`, `langage_principal`, `lignes_de_code`, `contributeurs_total`,
  `contributeurs_12_mois`, `commits_12_mois`) n'apparaît que si sa valeur n'est pas `null`; la date
  `consulte_le` est toujours affichée.
- **Description longue**: Markdown rendu en HTML, titres décalés sous ceux de la fiche, HTML brut
  écarté.
- **Nombres et dates**: format français (`3 938 168`, « 12 novembre 2026 »).

## Relations

```text
Catégorie 1 ─── n Outil n ─── 1 Source
                  │
                  ├── n Tag (0 à 5, outils enrichis)
                  ├── n Outil apparenté (voir_aussi, par nom)
                  ├── 3 lectures des critères ─── 3 Critère
                  └── 0..1 Données Open Hub
```

## État des filtres (côté navigateur, jamais enregistré)

| Champ | Type | Valeurs |
|---|---|---|
| `categories` | ensemble d'identifiants | `categories[].id` |
| `tags` | ensemble d'identifiants | `tags[].id` |
| `statuts` | ensemble | `libre`, `partiel`, `source-disponible`, `proprietaire`, `non-enrichi` |
| `q` | texte | Recherche par nom, normalisée comme `nomNormalise` |

Un outil est retenu si, pour chaque ensemble non vide, il répond à au moins une de ses valeurs, et
si `nomNormalise` contient `q` normalisé (FR-014). Le détail des paramètres d'adresse est dans
[contracts/filtres.md](contracts/filtres.md).
