# Répertoire d'outils favorisant la souveraineté numérique : données

<img src="graphiques/statut-code-source.png" alt="Répartition des outils du répertoire par statut du code source : libre, partiellement libre, code source disponible, propriétaire, pas encore enrichi" width="720">

*Statut du code source des outils du répertoire, d'après [`sommaire.md`](sommaire.md) (image produite par `nub run sommaire`).*

Extraction en JSON du [répertoire d'outils favorisant la souveraineté numérique](https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/) publié sur Praxis. Le dépôt contient les données (`outils.json`, `criteres.json`, `tags.json`) et les scripts qui les produisent :

- l'extraction de la page en ligne vers du JSON;
- l'analyse des étoiles de chaque outil selon les trois critères du répertoire;
- la synchronisation avec la page en ligne, qui détecte les outils nouveaux, modifiés et retirés;
- un enrichissement facultatif par IA : description longue, tags, licence et dépôt de code, second avis sur la souveraineté;
- un sommaire statistique du répertoire (`sommaire.md`), avec des graphiques et un résumé rédigé par IA.

Le répertoire rassemble 60 outils numériques répartis en 20 catégories, sélectionnés pour les besoins des OSBL des arts et de la culture. Chaque outil reçoit de 0 à 3 étoiles (un critère satisfait = une étoile); seuls ceux qui en ont au moins 2 y figurent.

**Sommaire :** [Source, crédits et licences](#source-crédits-et-licences) · [Démarrage](#démarrage) · [Fichiers JSON](#fichiers-json) · [Scripts](#scripts) · [Classification](#classification) · [Enrichissement par IA](#enrichissement-par-ia) · [Sommaire statistique](#sommaire-statistique) · [Importer ou réimporter](#importer-ou-réimporter-depuis-le-web) · [Scripts npm](#scripts-npm-packagejson) · [Tests](#tests) · [Dépannage](#dépannage) · [Utiliser les données](#utiliser-les-données)

## Source, crédits et licences

### Le répertoire d'origine

Le contenu du répertoire est l'œuvre des auteur·trices de la note, et non de ce dépôt :

> Sven Buridans, François Delnooz, Marie-Renee Duguay. (2026). *Répertoire d'outils favorisant la souveraineté numérique*. Praxis. <https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/>

- La note a été produite par [**La bande numérique**](https://fccf.ca/initiatives/la-bande-numerique/), une initiative de la [Fédération culturelle canadienne-française (FCCF)](https://fccf.ca/).
- Elle est publiée sur **Praxis**, plateforme du projet [**En commun**](https://encommun.io/).
- Sauf indication contraire, les contenus publics de Praxis portent la licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).

### Crédits

- **Code source de cet outil** (scripts, tests, configuration) : [Robin Millette](https://robin.millette.info/).
- **Fichiers JSON générés** (`outils.json`, `criteres.json`, `tags.json`) : les auteur·trices du répertoire cité ci-dessus (Sven Buridans, François Delnooz et Marie-Renee Duguay), pour le contenu d'origine, et [Robin Millette](https://robin.millette.info/), pour l'extraction, la classification, l'enrichissement et le vocabulaire de tags.

### Licences

| Ce qui | Licence |
|---|---|
| **Code source, configuration et documentation** (`*.ts`, `test/`, `package.json`, `nub.lock`, `tsconfig*.json`, `README.md`) | [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html), identifiant SPDX `AGPL-3.0-or-later` (version 3 de la licence ou toute version ultérieure). Texte complet dans [`LICENSE`](LICENSE). Chaque fichier `.ts` commence par les en-têtes `SPDX-License-Identifier` et `SPDX-FileCopyrightText` |
| **Schémas JSON** (`schemas/*.schema.json`) | Même licence que le code, `AGPL-3.0-or-later`. Le JSON n'admet pas de commentaires : chaque schéma la déclare dans son mot-clé standard `$comment` (ajouté par `generer-schemas.ts`), et `REUSE.toml` la déclare pour `schemas/**` selon la spécification [REUSE](https://reuse.software/) |
| **Données** (`outils.json`, `criteres.json`, `tags.json`) et ce qui en est dérivé : le **sommaire** (`sommaire.md`) et ses **graphiques** (`graphiques/`) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr), identifiant SPDX `CC-BY-SA-4.0`. Texte complet dans [`LICENSE-CC-BY-SA-4.0`](LICENSE-CC-BY-SA-4.0). Le JSON n'admet pas de commentaires : chaque fichier déclare sa licence dans `meta.data_license`, que les scripts maintiennent (voir [Fichiers JSON](#fichiers-json)) |

Le dépôt suit la spécification [REUSE](https://reuse.software/) : les fichiers `.ts` portent leurs en-têtes, `REUSE.toml` déclare la licence et le droit d'auteur de tous les autres (données, sommaire, graphiques, configuration, documentation, schémas), et `LICENSES/` contient le texte de chaque licence utilisée. Pour les données, le droit d'auteur nomme les trois auteurs du répertoire d'origine et Robin Millette. `nub run licences` vérifie le tout.

Les données sont des adaptations du répertoire d'origine : elles restent donc partagées dans les mêmes conditions que lui (CC BY-SA 4.0), avec attribution. Pour les réutiliser, créditer par exemple ainsi :

> Données : Sven Buridans, François Delnooz et Marie-Renee Duguay, *Répertoire d'outils favorisant la souveraineté numérique* (Praxis, 2026), adaptées par [Robin Millette](https://robin.millette.info/). CC BY-SA 4.0.

Les champs d'enrichissement résument des pages tierces (voir [D'où viennent les champs](#doù-viennent-les-champs)) : la licence des données ne se substitue pas à celle des sites des outils.

### D'où viennent les champs

- **De la source :** la catégorie, le nom, le score, le lien et la description de chaque outil, ainsi que les trois critères.
- **Rédigé pour ce dépôt :** le vocabulaire de `tags.json` (identifiants et descriptions des 37 tags de départ).
- **Calculé et généré par les scripts :** `sommaire.md` et `graphiques/` (statistiques calculées à partir des données, plus un résumé rédigé par un modèle d'IA).
- **Calculé par les scripts :** `meta` (licence et dates des fichiers), `derniere_modification`, `changement`, `removed` et `enrichi_le` (voir `update.ts`, `enrichir.ts` et `fichiers.ts`).
- **Déduit par heuristique dans ce dépôt :** `criteres` et `confiance` (voir [Classification](#classification)).
- **Vérifié par un modèle d'IA, citation à l'appui :** `criteres_confirmes` (voir [`confirmer.ts`](#confirmerts)). La citation permet de contrôler chaque verdict ; le verdict lui-même reste celui d'un modèle.
- **Généré par un modèle d'IA :** les champs d'enrichissement (voir [Enrichissement](#enrichissement-par-ia)). Ils résument des pages tierces et sont à vérifier avant de s'y fier ou de les diffuser, surtout la licence et le dépôt.

## Démarrage

Prérequis : [nub](https://nubjs.com/), qui exécute le TypeScript directement, et un accès au réseau (`extract`, `update` et l'enrichissement téléchargent des pages en ligne). Les commandes `nub run` sont définies dans `package.json`. Seul le sommaire (y compris sa mise à jour par `update`) a besoin d'un programme de plus, [vl-convert](https://github.com/vega/vl-convert) (voir [Sommaire statistique](#sommaire-statistique)), pour ses graphiques. La génération des schémas JSON (`nub run schemas`) n'a pas besoin du réseau, mais RunTypes demande Node 24 ou plus, et `nub run licences` demande [uv](https://docs.astral.sh/uv/).

```sh
nub install                      # installe les dépendances
nub run test                     # lance les tests (et vérifie que les schémas JSON sont à jour)
nub run typecheck                # vérifie les types
nub run schemas                  # régénère schemas/*.schema.json à partir des types
nub run licences                 # vérifie la conformité REUSE des licences (uvx reuse lint; demande uv)
nub run update --dry-run         # compare outils.json à la page en ligne, sans rien écrire
nub run update                   # synchronise outils.json avec la page en ligne
nub run update --sommaire        # idem, puis met à jour le sommaire si la synchronisation a détecté des changements
nub run enrichir --limite=5      # enrichit 5 outils par IA (nécessite OPENAI_API_KEY), puis met à jour le sommaire si quelque chose a changé
nub run sommaire                 # écrit sommaire.md et graphiques/ (--sans-resume, --sans-graphiques pour s'en passer)
```

Pour l'enrichissement, copier `.env.example` vers `.env` et y mettre la clé `OPENAI_API_KEY` (`.env` est ignoré par Git).

### Flux de travail

```
Import initial   page en ligne ──▶ extract.ts ──▶ classify.ts ──▶ outils.json
Suivi courant    page en ligne ──▶ update.ts ──▶ outils.json   (nouveau, modification, retrait, comeback)   [──▶ sommaire avec --sommaire]
Enrichissement   update.ts --enrichir ──▶ API OpenAI ──▶ outils.json (+ tags.json si de nouveaux tags) ──▶ sommaire (si quelque chose a changé)
Sommaire         outils.json ──▶ sommaire.ts ──▶ sommaire.md + graphiques/   (vl-convert; résumé: API OpenAI)
Schémas          schemas-types.ts ──▶ obuild + RunTypes ──▶ generer-schemas.ts ──▶ schemas/*.schema.json   (à relancer après un changement de type)
```

`extract` et `update` téléchargent la page en ligne (le dépôt n'en contient aucune copie). Après l'import initial, `update` suffit pour suivre le répertoire. Voir [Importer ou réimporter depuis le web](#importer-ou-réimporter-depuis-le-web) avant de relancer `extract` ou `build`.

### Contenu du dépôt

| Fichier | Rôle |
|---|---|
| `outils.json`, `criteres.json`, `tags.json` | Les données (voir [Fichiers JSON](#fichiers-json)) |
| `extract.ts`, `classify.ts`, `update.ts` | Les trois scripts du flux de travail |
| `confirmer.ts`, `appliquer-confirmations.ts`, `analyses/classification/` | Confirmation des critères par IA avec citation, son inscription dans `outils.json` (`criteres_confirmes`), et la trace de l'analyse de classification (essais, résultats chiffrés, sorties des deux fournisseurs) : voir [`analyses/classification/README.md`](analyses/classification/README.md) |
| `classify4.ts` | Quatrième version : les critères de `classify.ts` moins ceux que l'enrichissement et les confirmations d'IA contredisent (47 outils sur 57 d'accord avec l'évaluation enrichie, contre 39). Pas utilisée par `build` ni `update` ; voir [Classification](#classification) |
| `classify2.ts` | Deuxième version de `classify.ts` (mêmes critères, `confiance` recalibrée d'après l'évaluation enrichie). Pas encore utilisée par `build` ni par `update`; voir [Classification](#classification) |
| `sommaire.ts`, `sommaire.md`, `graphiques/` | Le script du sommaire statistique, le sommaire qu'il a généré et les graphiques (SVG et PNG) qu'il contient (mis à jour automatiquement par `nub run enrichir`, ou par `nub run update --sommaire`, quand quelque chose a changé; sinon à regénérer avec `nub run sommaire`) |
| `enrichir.ts`, `statistiques.ts`, `graphiques.ts`, `fichiers.ts`, `temps.ts`, `spdx.ts`, `progress.ts`, `couleurs.ts`, `ids.ts`, `cli.ts` | Modules utilisés par les scripts |
| `schemas/`, `generer-schemas.ts`, `schemas-types.ts`, `affiner-schema.ts`, `build.config.ts`, `tsconfig.schemas.json` | Les schémas JSON des trois fichiers de données et ce qui les génère (voir [Schémas JSON](#schémas-json)) |
| `test/` | Les tests |
| `package.json`, `nub.lock`, `tsconfig.json` | Dépendances, scripts npm et configuration TypeScript |
| `.env.example` | Modèle du fichier `.env` (la clé OpenAI) |
| `LICENSE` | Texte de la licence AGPL-3.0 du code |
| `LICENSE-CC-BY-SA-4.0` | Texte de la licence CC BY-SA 4.0 des données (voir [Licences](#licences)) |
| `LICENSES/`, `REUSE.toml` | Les mêmes textes de licence, nommés par identifiant SPDX (`AGPL-3.0-or-later.txt`, `CC-BY-SA-4.0.txt`), et la déclaration de licence des fichiers sans en-tête, selon la spécification [REUSE](https://reuse.software/) (voir [Licences](#licences)) |
| `.gitignore` | Ignore `.env`, `node_modules/`, `dist/` et `.mion/` (sorties de la génération des schémas), `analyses/classification/.cache/` (pages téléchargées par `confirmer.ts`), les dossiers locaux `.claude` et `.agents` (et `skills-lock.json`), et des copies de sauvegarde (`pre-enrichir-outils.json`, voir [Enrichissement par IA](#enrichissement-par-ia), et `orig-sommaire.md`) |

## Fichiers JSON

Les trois fichiers de données ont la même structure : un objet dont le champ `meta` porte les métadonnées du fichier, suivi du tableau de données.

```json
{
  "meta": {
    "data_license": "CC-BY-SA-4.0",
    "created_at": "2026-11-11T16:43:11-05:00",
    "updated_at": "2026-11-11T16:48:12-05:00"
  },
  "outils": [ ... ]
}
```

| Champ | Description |
|---|---|
| `meta.data_license` | Licence des données, toujours `CC-BY-SA-4.0` (identifiant SPDX). Si un fichier en porte une autre, les scripts la rétablissent à l'écriture (un fichier sans `data_license` est refusé) |
| `meta.created_at` | Date et heure de création du fichier. Fixée une fois, puis conservée par tous les scripts, même quand `extract` remplace le contenu |
| `meta.updated_at` | Date et heure de la dernière modification du **contenu**. Un script qui réécrit le même contenu ne la change pas |
| `outils`, `criteres` ou `tags` | Le tableau de données, nommé d'après le fichier |

**Toutes les dates et heures sont locales, en heure de Toronto** (`America/Toronto`, heure d'été comprise), au format ISO 8601 avec le décalage : `-05:00` en hiver, `-04:00` en été. C'est le cas de `meta.created_at` et `meta.updated_at`, et aussi de `derniere_modification` de chaque outil. Cette dernière est la date affichée par la page d'origine, qui donne l'heure de l'Est (Toronto), à laquelle on ajoute le décalage de la saison; elle ne se confond pas avec `meta.updated_at`, qui date des écritures du fichier.

Le format est **strict** : un fichier de données qui n'a pas cette structure (sans `meta` complet, simple tableau, dates de `meta` sans décalage) est refusé avec un message clair. Pour le recréer depuis la page en ligne, voir [Importer ou réimporter depuis le web](#importer-ou-réimporter-depuis-le-web).

### `outils.json`

Fichier unifié : le tableau `outils` contient 60 outils (plus d'éventuels outils retirés). Chaque outil contient :

| Champ | Description |
|---|---|
| `categorie` | Nom de la catégorie (le `h3`, sans l'icône) |
| `icone` | Icône de la catégorie, champ séparé |
| `nom` | Nom de l'outil. Sert de clé d'identification |
| `score` | Nombre d'étoiles ★ sur 3 |
| `lien` | Lien externe de l'outil |
| `description` | Description fournie par la source |
| `derniere_modification` | Dernière date de modification connue : ISO 8601 en heure de Toronto, avec le décalage (ex. `2026-11-05T09:53:00-05:00`) |
| `changement` | Dernier changement détecté par `update.ts` : `"nouveau"`, `"modification"`, `"retrait"` ou `"comeback"`; `null` si jamais modifié depuis l'import |
| `removed` | Présent (`true`) seulement pour un outil disparu de la page; l'entrée est conservée, à la fin du tableau |
| `criteres` | Identifiants (voir `criteres.json`) des critères que les étoiles représentent. Déduits, voir [Classification](#classification) |
| `confiance` | Fiabilité de cette déduction : `"élevée"`, `"moyenne"` ou `"faible"` |

Champs ajoutés par l'[enrichissement](#enrichissement-par-ia), absents tant que l'outil n'est pas enrichi :

| Champ | Description |
|---|---|
| `description_longue` | Description détaillée en français (150 à 350 mots), en Markdown (plusieurs paragraphes, titres, gras, italique, listes), sans image, sans HTML, sans tiret cadratin et sans émoji ni émoticône |
| `tags` | De 1 à 5 identifiants de `tags.json` |
| `source` | Statut du code source : `"libre"` (licence libre, code public), `"partiel"` (édition communautaire libre mais édition complète ou services propriétaires, « open core »), `"source-disponible"` (code visible, licence non libre) ou `"proprietaire"` |
| `licence` | Expression de licence [SPDX](https://spdx.org/licenses/) valide (ex. `AGPL-3.0-or-later`, `MIT OR Apache-2.0`); `null` pour un logiciel propriétaire, si elle est inconnue ou si aucun identifiant SPDX ne convient |
| `custom_license` | Nom ou identifiant d'une licence absente de la liste SPDX (licence maison ou propre à l'éditeur), tel que l'éditeur l'écrit. Exclusif avec `licence`; `null` si la licence est SPDX, si le logiciel est propriétaire ou si elle est inconnue |
| `custom_license_url` | URL du texte de la licence maison, quand elle est disponible; `null` sinon. Exige `custom_license` |
| `repo` | URL du dépôt de code source, sur n'importe quelle forge (GitHub, GitLab, Codeberg, Framagit…); `null` si aucun ou inconnu |
| `enrichi_le` | Date et heure de l'enrichissement de l'outil (ISO 8601, heure de Toronto). Les 41 outils enrichis avant l'ajout de ce champ portent la date de substitution `2026-11-11T17:29:24-05:00` (celle du premier enrichissement daté), qui n'est pas leur date exacte; la date des enrichissements suivants est exacte. Dans `outils.json`, 42 outils portent cette valeur : les 41 de substitution et le premier enrichissement daté |
| `page_lue` | `true` si la page de l'outil a servi à l'enrichissement; `false` si l'outil a été enrichi sans page lisible (option `--sans-page`), à partir de sa seule description : résultat moins fiable, voir [Pages inaccessibles](#pages-inaccessibles-ou-presque-vides) |
| `evaluation_enrichie` | Second avis du modèle sur la souveraineté de l'outil : `score` (nombre de critères satisfaits, de 0 à 3, égal à `criteres.length`), `criteres` (identifiants de `criteres.json`) et `confiance` (`"élevée"`, `"moyenne"` ou `"faible"`). S'y ajoute `ecart`, une explication en français de la différence, seulement quand cette évaluation diffère du `score` et des `criteres` du répertoire |
| `criteres_confirmes` | Critères **vérifiés** par une IA d'après la page de l'outil, citation à l'appui (`confirmer.ts`, puis `appliquer-confirmations.ts`) : `criteres` (ceux qui sont confirmés, dans l'ordre de `criteres.json`), `preuves` (une citation copiée mot pour mot de la description ou de la page, pour chaque critère confirmé), `infirmes` (une citation pour chaque critère que la page contredit ; un critère absent des deux est indéterminé), `modele`, `regle` (règle de lecture ajoutée aux consignes, ou `null`) et `date` (heure de Toronto). Indépendant de `criteres`, qui reste lié aux étoiles : il peut en compter moins, jamais plus. Présent pour les 57 outils enrichis (modèle `claude-fable-5-2`), absent pour les autres |

La page n'affiche qu'une seule date pour toute la note. `derniere_modification` est donc la date de la page au moment où l'outil a été ajouté ou a changé, et non la date exacte du changement de cet outil.

### `criteres.json`

Les trois critères du répertoire (« trois critères simples et concrets »), dans le tableau `criteres`, sous forme de `{ id, icon, titre, description }` :

| `id` | `icon` | Question |
|---|---|---|
| `donnees` | 📍 | Où peuvent rester les données ? |
| `controle` | 🏢 | Qui contrôle l'outil ? |
| `dependance` | 🔗 | De qui dépend-il pour fonctionner ? |

Les `id` sont la forme courte utilisée dans les champs `criteres` de `outils.json`.

### `tags.json`

Le vocabulaire restreint de tags : le tableau `tags` contient des `{ id, description }`, avec une description en français pour chaque tag (37 au départ). Chaque outil reçoit de 1 à 5 de ces tags, jamais plus.

De nouveaux tags peuvent s'ajouter après cette première phase, avec `--enrichir --nouveaux-tags`. Chaque tag ajouté doit être **justifié** : il porte alors en plus un champ `justification` (pourquoi aucun tag existant ne convient) et `propose_pour` (l'outil pour lequel il a été proposé). Un nouveau tag peut ne concerner qu'un seul outil.

### Schémas JSON

Le dossier `schemas/` contient un [JSON Schema](https://json-schema.org/) (draft 2020-12) par fichier de données : `schemas/outils.schema.json`, `schemas/criteres.schema.json` et `schemas/tags.schema.json`. Ils décrivent la structure complète (`meta` puis le tableau de données), les valeurs permises (`source`, `changement`, `confiance`, identifiants de critères), le type de chaque champ, et refusent les clés inconnues, comme le font les scripts. Chacun porte sa licence (`AGPL-3.0-or-later`) dans `$comment`, ce que les validateurs ignorent.

Ils sont générés, pas écrits à la main : les types TypeScript (`schemas-types.ts`, qui s'appuie sur `Outil`, `OutilClasse`, `Critere`, `Tag` et `Metadonnees`) sont convertis par [mion RunTypes](https://mion.io/runtypes) (`createJsonSchemaFn<T>()`), le générateur étant empaqueté par [obuild](https://github.com/unjs/obuild) avec le plugin RunTypes pour rolldown (`build.config.ts`). Après un changement de type, `nub run schemas` régénère les trois fichiers, et `nub run schemas:verifier` échoue si les fichiers commités sont périmés (il est aussi lancé par `nub run test`).

Ce que les types ne disent pas est ajouté par `affiner-schema.ts`, par nom de champ : `score` entier de 0 à 3, `tags` de 1 à 5 identifiants distincts, `criteres` d'au plus 3 identifiants distincts, dates `derniere_modification`, `enrichi_le`, `created_at` et `updated_at` au format ISO 8601 avec décalage. Les règles qui croisent plusieurs champs ou fichiers (licence SPDX valide, `custom_license` exclusif avec `licence`, tags présents dans `tags.json`, `score` égal au nombre de critères) ne sont pas dans les schémas : elles restent dans les scripts et les tests.

Les schémas valent pour du JSON ordinaire : les types du dépôt (chaînes, nombres, booléens, tableaux, `null`, valeurs littérales, objets) donnent le même JSON que celui du fichier. Si un champ devait un jour utiliser `Date`, `Map` ou une union contenant un `Date`, le schéma de RunTypes décrirait son propre encodage (tableaux étiquetés) et non le JSON naturel : à éviter dans les fichiers de données. Pour valider un fichier avec [Ajv](https://ajv.js.org/), utiliser `Ajv2020` (voir `test/schemas.test.ts`). Les versions de RunTypes (`@mionjs/*` 0.14.0) et d'obuild sont figées dans `package.json` : RunTypes n'a pas encore atteint la version 1.0.

## Scripts

Les quatre scripts (`extract.ts`, `classify.ts`, `update.ts` et `sommaire.ts`) se lancent avec `nub`; `generer-schemas.ts` est un cinquième programme, qui ne se lance que par `nub run schemas` (il doit d'abord être empaqueté, voir plus bas); les autres fichiers sont des modules, utilisés par les scripts et par les tests. Tout est en TypeScript. Les fonctions principales sont exportées pour être réutilisables; le code de ligne de commande ne s'exécute que lorsque le script est lancé directement.

### `extract.ts`

```sh
nub extract.ts [--force] <outils.json> [criteres.json] [url]
```

Télécharge la page en ligne (`[url]`, par défaut celle du répertoire) et écrit les outils et, si demandé, les critères. Utilise [linkedom](https://github.com/WebReflection/linkedom) pour interroger le DOM. Lit la date de modification affichée sur la page (heure de l'Est) et lui ajoute le décalage de Toronto; refuse une page sans date ou contenant deux outils de même nom. Un échec de téléchargement (réseau, erreur HTTP) n'écrit rien.

Si `criteres.json` est donné, il est réécrit lui aussi, sans protection : il ne dépend que de la page.

Les outils sont écrits **sans** classification ni enrichissement, et le fichier de sortie est **entièrement remplacé**. Sans `--force`, le script refuse d'écraser un `outils.json` qui contient des champs d'enrichissement ou un historique de changement (`changement`, `removed`), ou qui n'a pas le format attendu (il pourrait contenir du travail). Voir [Importer ou réimporter depuis le web](#importer-ou-réimporter-depuis-le-web).

### `classify.ts`

```sh
nub classify.ts <outils.json> [sortie.json]
```

Ajoute `criteres` et `confiance` à chaque outil (réécrit `outils.json` en place si aucune sortie n'est donnée), en gardant tous les autres champs. `meta.updated_at` ne change que si le contenu change. Voir [Classification](#classification). Une option inconnue est refusée; seule `--force` est tolérée, sans effet, pour que `nub run build --force` ne laisse pas un fichier à moitié construit.

### `classify2.ts`

```sh
nub classify2.ts <outils.json> [sortie.json]
```

Variante de `classify.ts` : mêmes options, mêmes `criteres` (le test vérifie qu'ils sont identiques pour tous les outils), mais `confiance` recalibrée (fonctions exportées `classer2` et `confianceV2`). Elle n'est appelée ni par `build` ni par `update`, et n'a pas été appliquée à `outils.json` : pour l'essayer sans risque, `nub classify2.ts outils.json /tmp/outils-v2.json`. Les raisons et les mesures sont dans [Classification](#classification).

### `classify4.ts`

```sh
nub classify4.ts [--confirmations=F] <outils.json> [sortie.json]
```

Part des critères de `classify.ts` (et de la confiance de `classify2.ts`) et en **retire** ceux que les données contredisent, sans jamais en ajouter : R1, « dépendance » pour un outil propriétaire sans tag `auto-hebergeable` ni `hors-ligne` (champs d'enrichissement) ; R2, « données » quand il ne tient qu'à l'a priori « un fournisseur canadien héberge au Canada » et qu'aucune confirmation d'IA ne l'établit (`--confirmations=F`, un fichier de `confirmer.ts` ; sans lui, R2 ne s'applique pas). Un outil non enrichi garde les critères de `classify.ts`. Le résultat peut compter **moins de critères que d'étoiles**, ce qui rompt la convention de `outils.json` : à utiliser sur une copie ou un fichier de sortie. Mesures et réserves dans [Classification](#classification).

### `confirmer.ts`

```sh
nub confirmer.ts --fournisseur=openai|claude [--modele=M] [--limite=N] [--budget=USD] [--sortie=F] [--regle=A] [--liste=noms.json] [--dry-run] [outils.json]
```

Pour chaque outil enrichi, donne à une IA la page de l'outil et les trois critères (sans le score ni les critères du répertoire) et lui demande, critère par critère, « confirmé », « infirmé » ou « indéterminé », avec une **citation copiée mot pour mot** des textes fournis. Une citation introuvable rejette la réponse (redemandée une fois). C'est la piste 1 de l'[analyse de classification](analyses/classification/README.md) ; le résultat est écrit dans `analyses/classification/confirmations-<fournisseur>.json`, puis inscrit dans `outils.json` (champ `criteres_confirmes`) par `appliquer-confirmations.ts`.

- `openai` : API OpenAI (Responses), clé `OPENAI_API_KEY` ; modèle par défaut celui de l'enrichissement. `claude` : la commande `claude -p` (aucune clé `ANTHROPIC_API_KEY`, mais la session Claude Code ; isolée du projet, sans outil), modèle par défaut `claude-fable-5-2`.
- **Coût :** les jetons et le coût en dollars de chaque appel sont inscrits dans la sortie (`totaux`). Pour OpenAI, le coût est calculé avec les prix de `PRIX` ; pour `claude`, c'est le coût au prix catalogue que rapporte la CLI. `--budget` (15 $ par défaut) arrête avant l'appel suivant quand le coût cumulé l'atteint.
- **Reprise :** les outils déjà confirmés dans le fichier de sortie ne sont pas redemandés. `--liste=F` limite aux outils nommés dans `F` (tableau JSON de noms).
- **Règles de lecture :** `--regle=A` ajoute aux consignes une précision pour le critère « contrôle » (la nationalité mentionnée suffit, sauf origine ou filiale étrangère), sans modifier `criteres.json`. Les règles sont dans `REGLES` ; leur effet est mesuré dans l'[analyse](analyses/classification/README.md).
- **Confidentialité :** le nom, la catégorie, le lien, la description et l'extrait de la page (6 000 caractères au plus) de chaque outil sont envoyés au fournisseur choisi.

### `appliquer-confirmations.ts`

```sh
nub appliquer-confirmations.ts <confirmations.json> <outils.json> [sortie.json]
```

Inscrit `criteres_confirmes` (voir [`outils.json`](#outilsjson)) dans chaque outil qui a un verdict dans le fichier de `confirmer.ts` ; les autres gardent leur champ tel quel. Fonction exportée `appliquerConfirmations`. `nub run appliquer-confirmations` applique les confirmations de Claude commitées. Le champ est protégé par `extract.ts` et conservé par `update.ts`, comme les autres champs d'enrichissement.

### `update.ts`

```sh
nub update.ts [--dry-run] [--sans-couleur] [--sommaire] [--enrichir [--nouveaux-tags] [--sans-page] [--sans-sommaire] [--limite=N]] [outils.json] [url]
```

Télécharge la page en ligne (`[url]`, par défaut celle du répertoire; le même téléchargement qu'`extract.ts`), la compare à `outils.json` (par défaut `./outils.json`, qui doit exister : pour un premier import, utiliser `nub run build`) et met le fichier à jour. `--dry-run` affiche les changements sans écrire (et le rappelle par une ligne « Simulation »). Pour chaque outil :

- absent du fichier : `changement: "nouveau"`;
- marqué `removed` et de retour sur la page : `"comeback"`, et `removed` disparaît;
- catégorie, icône, score, lien ou description différents : `"modification"`;
- absent de la page : `"retrait"` et `removed: true`, l'entrée est conservée;
- identique : rien ne change, ni sa date ni son `changement`.

Les outils nouveaux, modifiés, retirés ou de retour reçoivent la date de modification de la page; les nouveaux, modifiés et de retour sont reclassés. Les champs d'enrichissement d'un outil survivent à une modification ou à un retour, mais ils ne sont pas recalculés (voir la dernière remarque de [Importer ou réimporter](#importer-ou-réimporter-depuis-le-web)). Le fichier n'est réécrit que s'il y a au moins un changement; `meta.updated_at` est alors mis à jour, et `tags.json` aussi quand de nouveaux tags s'ajoutent.

Avec `--enrichir`, la synchronisation est suivie de l'[enrichissement](#enrichissement-par-ia), qui lit `tags.json` et `criteres.json` dans le même dossier que `outils.json`. Une option inconnue est refusée, de même que `--nouveaux-tags`, `--sans-page` ou `--sans-sommaire` sans `--enrichir`.

**Sommaire automatique.** Avec `--enrichir`, ou avec `--sommaire` seul (hors `--dry-run`), `update.ts` met à jour le [sommaire](#sommaire-statistique) à la fin de l'exécution, **seulement si quelque chose a changé** : au moins un outil nouveau, modifié ou retiré, ou au moins un outil enrichi. Une page inchangée sans enrichissement ne fait rien.

- Avec `--enrichir`, c'est le comportement **par défaut** : il n'y a pas d'option pour le demander, et `--sans-sommaire` le désactive (si quelque chose a changé, un avertissement le rappelle, voir plus bas).
- Sans `--enrichir`, `nub run update --sommaire` le demande au besoin. Rien n'est enrichi : le sommaire n'est mis à jour que si la synchronisation a détecté des changements. `--sommaire` est inutile avec `--enrichir`, et `--sommaire` avec `--sans-sommaire` est refusé.
- `nub run update` seul ne touche pas au sommaire, mais **avertit** si des changements ont été détectés (voir ci-dessous).

La mise à jour demande la clé `OPENAI_API_KEY` (pour le résumé) et `vl-convert` (pour les graphiques), et prend environ 30 secondes. Deux garde-fous évitent d'abîmer un bon sommaire :

- si la clé ou `vl-convert` manque, un avertissement jaune le dit, le sommaire n'est pas touché et le code de sortie n'est pas modifié; il reste à lancer `nub run sommaire` après avoir réglé le problème;
- si le résumé ne peut pas être rédigé (erreur de l'API, réponses invalides), le sommaire existant et ses graphiques sont conservés tels quels, un message rouge l'explique et le code de sortie est 1. (Lancé directement, `nub run sommaire` écrit au contraire un sommaire avec une note à la place du résumé.)

Un enrichissement par lots (`--limite=N`) met donc le sommaire à jour à chaque lot.

**Avertissement.** Chaque fois que des changements ont eu lieu (un outil nouveau, modifié ou retiré, ou un outil enrichi) **sans** que le sommaire soit mis à jour, `update.ts` le dit, pour qu'on ne laisse pas un sommaire en retard sans le savoir :

- `nub run update` seul : « Le sommaire n'est plus à jour (des changements ont été détectés): lancer `nub run sommaire`, ou ajouter --sommaire à update »;
- avec `--sans-sommaire` : « Le sommaire n'est plus à jour (… , --sans-sommaire): lancer `nub run sommaire` », où la parenthèse dit « des outils ont été enrichis » ou « des changements ont été détectés » selon le cas;
- clé ou `vl-convert` manquant, ou résumé impossible : les messages décrits plus haut.

L'avertissement est jaune, n'est pas une erreur (le code de sortie n'est pas modifié) et n'apparaît pas quand rien n'a changé, ni avec `--dry-run`, où rien n'est écrit.

**Couleurs.** Dans un terminal, `update.ts` colore ses messages pour les rendre plus lisibles :

| Couleur | Sens |
|---|---|
| Vert | Succès et rien à signaler : `nouveau`, outil enrichi, « 0 changement(s) », « 0 échec » |
| Jaune | À regarder : `modification`, avertissement (page inaccessible, réponse rejetée, évaluation différente du répertoire, sommaire qui n'est plus à jour) |
| Rouge | `retrait`, échec d'un outil, erreur |
| Magenta | `comeback` |
| Cyan | Les dates, les listes d'outils à enrichir, les nouveaux tags et le nom de l'outil en cours sur la barre |
| Atténué | Les messages secondaires : simulation, « Enrichissement de … » hors terminal, partie vide de la barre |

Le résumé (stdout) et le journal avec la barre de progression (stderr) sont colorés **séparément** : si l'un est redirigé vers un fichier, il reste sans couleur pendant que l'autre en garde. Hors terminal, le texte est identique, sans aucun code de couleur. `--sans-couleur` ou la variable `NO_COLOR` désactivent les couleurs (y compris celle de « Erreur: »), `FORCE_COLOR` les impose même hors terminal (sauf `0` ou `false`), et un terminal `TERM=dumb` n'en a pas. Seul `update.ts` est coloré, ainsi que le mot « Erreur: » de tous les scripts.

### `sommaire.ts`

```sh
nub sommaire.ts [--sans-resume] [--sans-graphiques] [outils.json] [sommaire.md]
```

Écrit `sommaire.md` (par défaut dans le dossier de `outils.json`) et, à côté, le dossier `graphiques/` : voir [Sommaire statistique](#sommaire-statistique). La fonction exportée `genererSommaire` fait ce travail; `update.ts` l'appelle après un enrichissement ou avec `--sommaire`.

### `enrichir.ts`

Module de l'enrichissement : lecture de la page de l'outil, requêtes à l'API OpenAI, validation des réponses (`validerProposition`, `validerEcart`) et boucle `enrichirOutils`. Cette boucle reçoit ses générateurs en paramètres, ce qui permet de la tester sans réseau.

### `statistiques.ts`

Le calcul des statistiques du répertoire (`calculerStatistiques`), sans entrée-sortie : statuts du code source, licences et familles, forges, tags, critères par statut, dates. Il alimente le sommaire et les graphiques.

### `graphiques.ts`

Les graphiques du sommaire. `construireGraphiques(statistiques)` produit des spécifications [Vega-Lite](https://vega.github.io/vega-lite/) (calcul pur, avec les données incluses dans chaque spécification), et `ecrireGraphiques` les convertit en SVG et en PNG avec [vl-convert](https://github.com/vega/vl-convert). Les paquets `vega-lite` et `vega` fournissent les types TypeScript des spécifications.

### `fichiers.ts`

Lecture et écriture des trois fichiers de données : `lireFichier`, `lireSiExiste` et `ecrireFichier` maintiennent `meta` (`data_license`, `created_at`, `updated_at`), décrit dans [Fichiers JSON](#fichiers-json). La lecture est stricte : un fichier au mauvais format est refusé. Tous les scripts qui lisent ou écrivent ces fichiers passent par ce module.

### `temps.ts`

Les dates et heures, toujours en heure de Toronto : `horodatage()` donne le moment présent (`2026-11-11T16:42:07-05:00`), `localVersIso()` ajoute à une date locale le décalage qui s'applique ce jour-là (heure d'été comprise). Sans dépendance : le calcul passe par `Intl`.

### `spdx.ts`

`problemeLicenceSpdx(texte)` vérifie qu'une licence est une expression SPDX valide (avec [spdx-expression-parse](https://www.npmjs.com/package/spdx-expression-parse)) et retourne le problème, ou `null`. Sont refusés :

- les noms en toutes lettres (« GNU Affero General Public License v3.0 ») et une casse incorrecte;
- les identifiants inexistants (`BSL-1.1`; le bon est `BUSL-1.1`);
- les identifiants dépréciés ou ambigus (`GPL-3.0`, `GPL-2.0+` : écrire `-only` ou `-or-later`);
- les `LicenseRef-` maison, absents de la liste SPDX. Une telle licence se décrit plutôt dans `custom_license` (nom ou identifiant) et `custom_license_url` (URL du texte, si disponible), avec `licence` à `null`.

### `progress.ts`

Barre de progression minimale sur une ligne, sans dépendance : `createProgress(total, options)` retourne `update(valeur, étiquette?)` (l'étiquette, par exemple l'outil en cours, s'affiche après le pourcentage), `message(texte)` (écrit une ligne au-dessus de la barre sans l'abîmer) et `end()`. Écrit sur stderr par défaut. L'option facultative `paint` colore les parties de la barre (rempli, vide, étiquette) sans changer sa largeur.

### `couleurs.ts`

Couleurs ANSI sans dépendance : `couleursActives(flux, env, sansCouleur)` décide si un flux doit être coloré (terminal, `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb`, voir [`update.ts`](#updatets)), et `creerCouleurs(actif)` donne les fonctions `gras`, `attenue`, `rouge`, `vert`, `jaune`, `magenta` et `cyan`, qui rendent le texte tel quel quand les couleurs sont inactives.

### `cli.ts`

`lancer(principal)` exécute le corps d'un script en ligne de commande : toute erreur (option invalide, fichier manquant, réseau, erreur HTTP) s'affiche en un message clair (`Erreur: …`, en rouge dans un terminal), sans trace de pile, et donne le code de sortie 1. Utilisé par `extract.ts`, `classify.ts`, `update.ts` et `sommaire.ts`.

### `ids.ts`

Module partagé : les trois identifiants de critères (`donnees`, `controle`, `dependance`) et la correspondance icône → id utilisée par `extract.ts`, car la page n'identifie les critères que par leur icône.

### `generer-schemas.ts`

Génère `schemas/*.schema.json` à partir des types de `schemas-types.ts` avec `createJsonSchemaFn<T>()` de RunTypes, en mode `portable` (sans les mots-clés propres à RunTypes), puis applique `affiner()` (de `affiner-schema.ts`). Il ne s'exécute pas directement : les appels `createJsonSchemaFn<T>()` ne fonctionnent qu'après la transformation du plugin RunTypes, donc `nub run schemas` empaquette d'abord le script avec obuild (`dist/generer-schemas.mjs`, ignoré par git, avec un fichier `THIRD-PARTY-LICENSES.md.gz` que produit obuild) puis l'exécute. `--verifier` n'écrit rien et échoue si un schéma commité diffère de celui que les types produisent. Le plugin écrit aussi des fichiers intermédiaires dans `.mion/` (ignoré par git). `tsconfig.schemas.json` limite la compilation du plugin au seul point d'entrée.

## Classification

La page ne dit pas quelle étoile correspond à quel critère. `classify.ts` le déduit des descriptions :

1. Des règles (expressions régulières) mesurent, pour chaque critère, la force des indices dans la description : « auto-hébergé » ou « au Canada » pour les données, « canadien » ou « québécois » (contre « non canadien », « international ») pour le contrôle, « pair-à-pair », « hors ligne », « libre » pour la dépendance.
2. Le `score` connu fixe le nombre de critères satisfaits : 3 étoiles = les trois critères; 2 = on écarte celui dont l'indice est le plus faible.
3. `confiance` reflète l'écart entre le dernier critère retenu et le premier écarté.

Pour une description sans score connu, la fonction exportée `classer(description)` retient les critères dont l'indice atteint un seuil (2), et la confiance est `"indéterminée"` (valeur absente de `outils.json`, où chaque outil a un score).

C'est une heuristique, pas une vérité : un critère retenu avec une confiance « faible » ou « moyenne » est une hypothèse (par exemple, un fournisseur canadien à 2 étoiles est supposé héberger au Canada). L'enrichissement fournit un second avis indépendant (`evaluation_enrichie`) pour repérer les cas douteux.

Le [sommaire](sommaire.md) montre l'effet de cette heuristique : dans l'état actuel du répertoire, elle attribue le critère « données » à tous les outils, alors que l'évaluation enrichie ne le retient que pour une partie des outils enrichis. Les critères du répertoire sont donc des déductions prudentes à lire avec l'évaluation enrichie, pas des mesures.

### Comparaison avec l'évaluation enrichie et `classify2.ts`

Sur les 57 outils enrichis, `criteres` (déduit) et `evaluation_enrichie.criteres` (second avis de l'IA) concordent exactement pour 39 outils (68 %). Ces 39 sont **tous** les outils où l'IA retient autant de critères que d'étoiles. Pour les 18 autres, l'IA confirme **moins** de critères que d'étoiles (9 outils à 2 étoiles avec 1 critère confirmé, 4 avec aucun, 5 outils à 3 étoiles avec 2) et ne retient jamais un critère que `classify.ts` a écarté. Le **choix** des critères est donc déjà au plafond : la différence vient de ce que la page de l'outil permet de confirmer, pas d'une erreur de classement, et le `score` de la source reste la référence. Une version qui produirait moins de critères que d'étoiles contredirait la source.

Ce qui s'améliore, c'est `confiance`. `classify.ts` la tire de l'écart entre le dernier critère retenu et le premier écarté : à 3 étoiles, tous les critères sont retenus, donc elle vaut toujours « élevée », alors que l'IA n'en confirme que deux pour 5 des 8 outils à 3 étoiles. `classify2.ts` tient aussi compte du nombre de critères retenus **sans aucun indice dans la description** (0 : « élevée », 1 : « moyenne », 2 ou plus : « faible ») et garde le plus bas des deux niveaux. Mesure sur une copie de `outils.json` (10 outils changent de confiance, aucun critère ne change) :

| Confiance | Accord de l'IA sur le nombre de critères, `classify.ts` | `classify2.ts` |
|---|---|---|
| élevée | 33 sur 39 | 27 sur 29 |
| moyenne | 5 sur 15 | 10 sur 21 |
| faible | 1 sur 3 | 2 sur 7 |

La capacité de la confiance à séparer les outils où l'IA est d'accord de ceux où elle ne l'est pas (AUC) passe de 0,756 à 0,811. **Cet écart n'est pas significatif** avec 57 outils (intervalle bootstrap à 95 % de la différence : environ de -0,08 à +0,19), et la règle a été choisie en regardant ces mêmes données : à confirmer quand d'autres outils seront enrichis. Limite : la description seule ne permet pas de prévoir quels critères « canadiens » l'IA ne confirmera pas (les descriptions des outils confirmés et non confirmés sont indiscernables), et l'IA n'est pas une vérité : c'est un deuxième avis.

**`classify4.ts` : retirer plutôt que choisir.** Puisque le classement est bon et que l'écart tient au nombre de critères, `classify4.ts` retire ceux que les données contredisent (règles R1 et R2 ci-dessus). Sur une copie de `outils.json`, avec les confirmations de Claude : 47 outils sur 57 d'accord avec l'évaluation enrichie (82 %, Jaccard 0,874) contre 39 (68 %), 10 outils gagnés et 2 perdus (test des signes, p ≈ 0,04) ; 17 outils changent, par retrait seulement, et ont alors un critère de moins que d'étoiles. Sans confirmations (R1 seule) : 43. Les règles ont été choisies en regardant ces mêmes 57 outils, et `source` et `tags` viennent du même appel à l'IA que l'évaluation enrichie : c'est une cohérence, à reconfirmer sur d'autres outils. Le détail des 17 règles essayées est dans [`analyses/classification/README.md`](analyses/classification/README.md).

**Décision.** Les étoiles et les critères vérifiés ne mesurent pas la même chose : les premières sont une donnée de la source, les seconds dépendent de ce que la page de l'outil dit. Aucune règle ne peut les faire coïncider sans sacrifier l'une des deux informations. `criteres` reste donc lié aux étoiles, et les critères vérifiés sont exposés à part, dans `criteres_confirmes`, avec la citation à l'appui (voir [`outils.json`](#outilsjson)). `classify2.ts` et `classify4.ts` restent disponibles comme variantes, non adoptées.

## Enrichissement par IA

`update.ts --enrichir` génère, **une seule fois** par outil, les champs décrits plus haut : description longue, tags, `source`, `licence` (ou `custom_license`), `repo` et `evaluation_enrichie`. Un outil qui a déjà une `description_longue` n'est jamais régénéré, même si sa description courte change. Les outils retirés sont ignorés. L'enrichissement s'exécute aussi quand la page n'a pas changé. Quand tous les outils sont déjà enrichis, aucun appel d'enrichissement n'est fait et la clé n'est pas nécessaire (seule la mise à jour du sommaire, si quelque chose a changé, la demande).

| Option | Effet |
|---|---|
| `--enrichir` | Active l'enrichissement après la synchronisation |
| `--limite=N` | N'enrichit pas plus de N outils par exécution. Seuls les succès comptent : un outil en échec ne compte pas dans la limite, mais n'est essayé qu'une fois par exécution |
| `--sans-page` | Enrichit aussi les outils dont la page est inaccessible ou presque vide, à partir de leur seule description (ils portent alors `page_lue: false`). Voir [Pages inaccessibles](#pages-inaccessibles-ou-presque-vides) |
| `--nouveaux-tags` | Autorise le modèle à proposer de nouveaux tags, au plus 2 par outil selon sa consigne (justification obligatoire, validée par le script); ils sont ajoutés à `tags.json` |
| `--sans-sommaire` | Ne met pas à jour le sommaire à la fin (voir [`update.ts`](#updatets)) |
| `--dry-run` | Liste les outils concernés sans appeler l'API |

**Conseil :** l'enrichissement coûte des appels à l'API et ne se refait pas (un outil enrichi n'est jamais régénéré). Avant de le lancer, commiter `outils.json` ou en garder une copie, par exemple `cp outils.json pre-enrichir-outils.json` : ce nom est ignoré par Git.

**Configuration :** `OPENAI_API_KEY` dans `.env` (voir `.env.example`), et `OPENAI_MODEL` pour changer le modèle (`gpt-6-astra` par défaut). Compter environ 20 secondes par outil (mesuré sur quelques outils).

**Confidentialité :** pour chaque outil, le script télécharge la page publique (`lien`), en extrait le texte (limité à 6 000 caractères) et les liens vers des dépôts de code (GitHub, GitLab, Codeberg, Framagit, Bitbucket, SourceHut, SourceForge, et les hôtes `gitlab.*`, `git.*`, `forge.*` ou `gitea.*`), puis envoie à l'API OpenAI (Responses API, sortie JSON structurée) le nom, la catégorie, le lien, la description et cet extrait. Quand l'évaluation diffère du répertoire, le second appel y ajoute les deux évaluations. Les tags sont limités au vocabulaire de `tags.json`. La page est lue d'abord : voir [Pages inaccessibles ou presque vides](#pages-inaccessibles-ou-presque-vides).

**Sommaire automatique :** la mise à jour du sommaire qui suit un enrichissement (ou `update --sommaire`) envoie aussi à l'API OpenAI les statistiques et la liste des outils (nom, catégorie, score, critères, statut, licence, forge, tags, description courte), comme décrit dans [Sommaire statistique](#sommaire-statistique).

**Validation :** chaque réponse est vérifiée avant d'être écrite :

- de 1 à 5 tags connus, sans doublon;
- URL de dépôt valide, licence SPDX valide (voir `spdx.ts`);
- licence maison cohérente : exclusive avec `licence`, URL seulement avec un nom, et un nom qui n'est pas lui-même un identifiant SPDX;
- ni dépôt, ni licence, ni licence maison pour un logiciel propriétaire;
- description longue sans image Markdown, sans HTML (balises, entités, liens entre chevrons), sans tiret cadratin et sans émoji ni émoticône;
- évaluation cohérente (score égal au nombre de critères).

Une réponse invalide est redemandée une fois, avec la raison du rejet, puis consignée comme échec. Un outil n'est modifié que si tout son enrichissement a réussi; sinon il sera retenté à la prochaine exécution.

**Évaluation indépendante :** le modèle reçoit la description des trois critères, mais pas le score ni les critères du répertoire, pour ne pas simplement les confirmer. Quand son évaluation diffère (score ou critères), un second appel explique l'écart en 2 à 4 phrases, sans prétendre savoir laquelle des deux est correcte et en rappelant que les critères du répertoire sont eux-mêmes déduits. Cette explication, soumise aux mêmes interdits typographiques que la description longue, est inscrite dans `evaluation_enrichie.ecart`. Le `score` et les `criteres` du répertoire ne sont jamais modifiés, et les écarts sont résumés à la fin de l'exécution.

**Progression :** la barre de progression et le journal vont sur stderr; les résumés (changements, nombre d'outils enrichis, écarts, nouveaux tags) restent sur stdout. Le nom de l'outil en cours s'affiche à droite de la barre (en terminal) ou sur une ligne `Enrichissement de <outil>...` (hors terminal, où une ligne de pourcentage est aussi écrite par tranche de 10 %). Dans un terminal, la barre et le journal sont colorés (voir [Couleurs](#updatets)) : succès en vert, avertissements en jaune, échecs en rouge.

**Reprise :** `outils.json` est écrit après chaque outil, donc une interruption ne perd rien et une relance reprend où on s'est arrêté. Le code de sortie est 1 si au moins un outil a échoué (page inaccessible comprise).

### Pages inaccessibles ou presque vides

La page de chaque outil est lue avant tout appel à l'API. Elle est jugée inutilisable si elle est inaccessible (erreur réseau, délai de 20 secondes dépassé, réponse HTTP non réussie comme un 403 de blocage anti-robot) ou presque vide (moins de 200 caractères de texte, par exemple un site rendu par JavaScript). Dans ce cas (exemples rencontrés : En commun, dont la page est vide parce qu'elle est générée par JavaScript, ainsi que Paperless-ngx et CIRA Canadian Shield, qui répondent par une erreur HTTP 403) :

- un **avertissement** est affiché dans le journal, avec la raison;
- **par défaut**, l'outil n'est **pas enrichi** : aucun appel à l'API n'est fait, l'échec est consigné (code de sortie 1) et l'outil sera retenté à la prochaine exécution. Un résultat bâti sur la seule description serait moins fiable (licence et dépôt tirés de la mémoire du modèle, description générique), et comme un outil enrichi n'est jamais régénéré, il serait figé;
- avec **`--sans-page`**, l'outil est enrichi quand même, à partir de la description seule. Le modèle est alors invité à la prudence (`null` pour la licence et le dépôt dans le doute, confiance faible). Le champ **`page_lue: false`** signale cet état, et le script liste ces outils à la fin de l'exécution.

Les outils enrichis avec une page lisible portent `page_lue: true`. Pour refaire plus tard les outils enrichis sans page (une fois leur page redevenue accessible, ou après avoir changé de stratégie), supprimer leurs champs d'enrichissement, puis relancer `nub run enrichir` :

```sh
# à faire après un commit de outils.json (meta.updated_at sera mis à jour à la prochaine écriture par un script)
jaq '.outils |= map(if .page_lue == false then del(.description_longue, .tags, .source, .licence, .custom_license, .custom_license_url, .repo, .evaluation_enrichie, .page_lue, .enrichi_le) else . end)' outils.json > /tmp/outils.json && mv /tmp/outils.json outils.json
```

## Sommaire statistique

Le sommaire est mis à jour **automatiquement** par `update.ts --enrichir` (ou `update.ts --sommaire`) quand quelque chose a changé (voir [`update.ts`](#updatets)), et se lance aussi à la main avec `nub run sommaire`. Il analyse `outils.json` (et `tags.json` et `criteres.json`, lus dans le même dossier) et écrit `sommaire.md`, un document en Markdown qui regroupe :

- **un résumé de 3 ou 4 paragraphes** sur le répertoire et son utilité, rédigé par l'API OpenAI;
- les **chiffres clés** (outils, catégories, scores, outils enrichis, libres ou partiels);
- les **dates** : les outils les plus anciens et les plus récents du répertoire (`derniere_modification`), les changements détectés, et les dates d'enrichissement (premier, dernier, nombre d'outils par jour, outils enrichis sans date);
- les **catégories** (outils, enrichis, libres ou partiels, score moyen);
- le **statut du code source** (libre, partiellement libre, code source disponible, propriétaire, pas encore enrichi);
- les **licences** : par licence SPDX, par famille (copyleft fort ou faible, permissive; classement indicatif d'après l'identifiant), licences maison, et outils sans licence connue;
- les **critères de souveraineté** : nombre d'outils par critère, et critères satisfaits par statut du code source, d'abord pour le répertoire (déduits) puis pour l'évaluation enrichie, avec les écarts entre les deux;
- les **forges de code** : nombre d'outils par forge (GitHub, GitLab, Codeberg…) et logiciels libres sans dépôt connu;
- les **tags** : utilisation de chacun, tags inutilisés, moyenne par outil, paires les plus fréquentes, tags ajoutés;
- la **fiabilité** : confiance de la classification, outils enrichis sans page lisible, outils restant à enrichir;
- des **graphiques**, insérés dans la section qu'ils illustrent (voir plus bas).

Tant que tous les outils ont la même date (aucune modification détectée depuis l'import), les lignes « outils les plus anciens » et « outils les plus récents » sont identiques. Les outils enrichis avant l'ajout de `enrichi_le` ont tous la même date de substitution : ils apparaissent donc ensemble comme « premier enrichissement » (voir le champ `enrichi_le`).

Les retirés (`removed`) sont comptés à part. Les statistiques sur le statut du code source, les licences, les forges et les tags ne portent que sur les outils déjà enrichis : le sommaire dit combien il y en a, et reste valide à n'importe quel stade de l'enrichissement. Il reflète l'état du fichier au moment de l'exécution. `update --enrichir` le met à jour tout seul quand quelque chose a changé, et `update --sommaire` fait de même après une simple synchronisation. Il reste à le relancer à la main après un `nub run update` sans `--sommaire`, après un enrichissement fait avec `--sans-sommaire`, ou quand la mise à jour automatique a été sautée.

Le calcul est local; seul le résumé passe par le réseau. Pour le rédiger, le script envoie à l'API OpenAI toutes les statistiques et, pour chaque outil du répertoire, son nom, sa catégorie, son score, ses critères, son statut, sa licence, sa forge, ses tags et sa description courte. Le résumé est validé (3 ou 4 paragraphes de texte continu, sans liste, sans gras, sans HTML, sans tiret cadratin ni émoji; redemandé une fois avec la raison du rejet), puis inscrit dans le sommaire avec le nom du modèle et la date, et la mention qu'il est à relire. Si la rédaction échoue, le sommaire, lancé directement, est tout de même écrit avec une note à la place du résumé, et le code de sortie est 1 (la mise à jour automatique, elle, conserve l'ancien sommaire).

| Option | Effet |
|---|---|
| `--sans-resume` | Omet le résumé : aucun appel à l'API, aucune clé nécessaire |
| `--sans-graphiques` | Omet les graphiques : vl-convert n'est pas nécessaire, et le dossier `graphiques/` n'est pas touché (il garde les images des exécutions précédentes, que le nouveau sommaire n'insère pas) |

### Graphiques

Les graphiques sont des spécifications Vega-Lite construites à partir des statistiques, puis converties par **vl-convert** en **SVG** (images vectorielles, dans `graphiques/`) et en **PNG** (insérés dans `sommaire.md`, à deux fois la résolution pour rester nets). Les nombres et les axes sont en français (locale `fr-CA`), et un statut du code source garde la même couleur dans tous les graphiques (palette Okabe-Ito, lisible par les personnes daltoniennes).

| Fichier (`graphiques/…`) | Contenu | Section |
|---|---|---|
| `statut-code-source` | Outils par statut du code source (aussi affiché en tête du README) | Statut du code source |
| `categories-statut` | Outils par catégorie, empilés par statut | Catégories |
| `criteres-repertoire-enrichie` | Part des outils satisfaisant chaque critère, répertoire (déduit) et évaluation enrichie | Critères de souveraineté |
| `criteres-par-statut` | Carte de chaleur : critères satisfaits par statut, répertoire et évaluation enrichie | Critères de souveraineté |
| `licences` | Outils par licence SPDX, colorés par famille | Licences |
| `forges` | Outils par forge de code | Forges de code |
| `tags` | Les 15 tags les plus fréquents | Tags |
| `enrichissement-jours` | Outils enrichis par jour, seulement à partir de deux jours distincts (absent du dépôt tant que tous les enrichissements datent du même jour, comme actuellement) | Dates |

Un graphique sans données est omis (par exemple, sans outil enrichi, ni licences, ni forges, ni tags), et les fichiers d'un graphique qui n'est plus produit sont supprimés du dossier (les autres fichiers y restent). Chaque image du sommaire a un texte alternatif qui résume son contenu. L'image en tête du README pointe vers `graphiques/statut-code-source.png` (par une balise `<img>`, la seule balise HTML du README, pour en fixer la largeur) : elle se met à jour quand ce fichier est régénéré et commité. Les graphiques ne contiennent que des statistiques déjà publiées dans le sommaire; aucune donnée ne quitte l'ordinateur pour les produire.

**Installer vl-convert** : `cargo install vl-convert`, ou télécharger un binaire sur la [page des versions](https://github.com/vega/vl-convert/releases). Le programme doit être dans le `PATH`. Le script vérifie sa présence au début, avant tout appel à l'API, et propose `--sans-graphiques` s'il est absent. Les spécifications visent Vega-Lite 6.1, la version la plus récente que gère `vl-convert` 1.9.

Le dépôt contient un `sommaire.md` déjà généré ([le consulter](sommaire.md)); il reflète l'état des données au moment où il a été produit, et son introduction donne la date de génération. Le résumé rédigé par l'IA est différent à chaque exécution : régénérer le sommaire en change le texte, même si les données n'ont pas bougé.

Configuration : `OPENAI_API_KEY` dans `.env` et, facultativement, `OPENAI_MODEL`, comme pour l'enrichissement. Un seul appel est fait par exécution, deux si la première réponse est rejetée. Le résumé est obtenu avant l'écriture des graphiques, de sorte qu'un échec du résumé, dans la mise à jour automatique, ne laisse rien de modifié.

## Importer ou réimporter depuis le web

`extract` et `build` servent à **construire `outils.json` depuis zéro** à partir de la page en ligne :

- `nub run extract` télécharge la page et **réécrit `outils.json` en entier**, avec seulement les champs de la source. Il ne fusionne rien : le contenu est remplacé. Les seuls fichiers qu'il lit sont ses fichiers de **sortie** (`outils.json` et, s'il est donné, `criteres.json`), s'ils existent déjà : pour conserver leur `meta.created_at` et, pour `outils.json`, appliquer le garde-fou ci-dessous. Il ne lit ni n'écrit **jamais de fichier HTML** : la page est téléchargée en mémoire à chaque exécution.
- `nub run build` enchaîne `extract` puis `classify` : le fichier produit est complet, avec `criteres` et `confiance`.

C'est la voie de l'import initial. Ensuite, `update` fait la synchronisation courante : il télécharge la même page, mais compare, détecte les changements, conserve les dates des outils inchangés et ne touche jamais à l'enrichissement.

Parce que `extract` remplace tout, un réimport détruit :

- l'**enrichissement** (descriptions longues, tags, licences, évaluations), qui coûte des appels à l'API OpenAI;
- l'**historique des changements** (`changement`, `removed`) et les dates de `update` : tous les outils reçoivent la date de modification actuelle de la page, avec `changement: null`. Le fichier garde en revanche son `meta.created_at`, et son `meta.updated_at` n'est modifié que si le contenu diffère.

C'est pourquoi `extract` refuse d'écraser un `outils.json` qui contient ce genre de travail, ou qu'il ne peut pas lire. La classification n'est pas protégée : `classify` la recalcule toujours.

Comme la page est téléchargée à chaque exécution, un réimport n'est **pas reproductible** : il donne l'état du répertoire au moment où il est lancé. Pour retrouver un état précis, utiliser l'historique Git de `outils.json`.

| Besoin | Commande |
|---|---|
| Suivre la page en ligne (usage courant) | `nub run update` |
| Première construction (pas encore de `outils.json`) | `nub run build` |
| `outils.json` invalide, vide ou corrompu | `nub run build:force` (le script refuse sinon, de peur d'écraser du travail) |
| Appliquer de nouvelles règles de classification, sans rien perdre | `nub run classify` |
| Tout remplacer volontairement depuis le web | `nub run build:force` (ou `nub run extract --force`) |

Les options de `nub run` sont transmises à la **dernière** commande du script. `nub run extract --force` agit donc bien sur `extract`, alors que `nub run build --force` transmettrait `--force` à `classify`, où il est ignoré : pour forcer une reconstruction, utiliser `build:force`.

Si le `score` ou les `criteres` d'un outil déjà enrichi changent, après un `classify` ou parce que `update` détecte une modification, son `evaluation_enrichie` (et son `ecart`) peut devenir périmé : rien ne le recalcule, puisqu'un outil enrichi n'est jamais régénéré. Pour le refaire, supprimer ses champs d'enrichissement (même méthode que la recette de [Pages inaccessibles](#pages-inaccessibles-ou-presque-vides), en adaptant le filtre `select`), puis relancer `nub run enrichir`.

## Scripts npm (`package.json`)

| Commande | Effet |
|---|---|
| `nub run extract` | `nub extract.ts outils.json criteres.json` : importe depuis la page en ligne. Refuse d'écraser un travail existant sans `--force` |
| `nub run classify` | `nub classify.ts outils.json` : classe les outils en place |
| `nub run classify2` | `nub classify2.ts outils.json` : comme `classify`, avec la `confiance` recalibrée (pas encore adoptée; modifie `confiance` et `meta.updated_at` de `outils.json`, voir [Classification](#classification)) |
| `nub run build` | `extract` puis `classify` : construit `outils.json` depuis la page en ligne. Refuse d'écraser un enrichissement ou un historique existant |
| `nub run build:force` | Comme `build`, mais **remplace tout**, enrichissement et historique compris |
| `nub run update` | `nub update.ts` : synchronise `outils.json` avec la page en ligne. Les options passent directement : `nub run update --dry-run`, ou `nub run update --sommaire` pour mettre aussi le sommaire à jour si des changements sont détectés |
| `nub run enrichir` | `nub update.ts --enrichir` : synchronise, enrichit les outils sans description longue, puis met à jour le sommaire si quelque chose a changé. Par exemple : `nub run enrichir --limite=5` |
| `nub run sommaire` | `nub sommaire.ts` : écrit `sommaire.md` et `graphiques/` (`--sans-resume` évite l'appel à l'API, `--sans-graphiques` évite vl-convert) |
| `nub run schemas` | `obuild && nub dist/generer-schemas.mjs` : régénère `schemas/*.schema.json` à partir des types (voir [Schémas JSON](#schémas-json)) |
| `nub run schemas:verifier` | Comme `schemas`, mais sans rien écrire : échoue si les schémas commités sont périmés |
| `nub run licences` | `uvx reuse lint` : vérifie que chaque fichier suivi déclare sa licence et son droit d'auteur ([REUSE](https://reuse.software/) 3.3). Demande [uv](https://docs.astral.sh/uv/) et un accès réseau la première fois ; non inclus dans `nub run test` |
| `nub run confirmer` | `nub confirmer.ts` : confirme les critères un par un avec une IA (`--fournisseur=openai` ou `--fournisseur=claude`, obligatoire), citation à l'appui. **Appelle une API payante** ; voir [`confirmer.ts`](#confirmerts) |
| `nub run classify4` | `nub classify4.ts --confirmations=analyses/classification/confirmations-claude.json outils.json` : comme `classify`, mais retire les critères que l'enrichissement et les confirmations contredisent (pas adopté ; **modifie `outils.json` en place** et y laisse des outils avec moins de critères que d'étoiles, voir [Classification](#classification)) |
| `nub run appliquer-confirmations` | `nub appliquer-confirmations.ts analyses/classification/confirmations-claude.json outils.json` : inscrit `criteres_confirmes` dans `outils.json` à partir des confirmations de Claude commitées |
| `nub run test` | Lance les dix-sept fichiers de tests, puis `schemas:verifier` |
| `nub run typecheck` | `tsrs -p .` : vérifie les types avec [tsrs](https://www.npmjs.com/package/tsrs), un portage en Rust de `tsc` |

## Tests

Dans `test/`, avec `node:test` lancé par `nub` :

- `classify.test.ts` : cas de classification connus, un nombre de critères égal au score pour les 60 outils, les options de la ligne de commande, le refus d'un fichier au mauvais format, et la couleur de « Erreur: ».
- `confirmer.test.ts` : validation des verdicts (statuts, citation obligatoire, exacte et d'au plus 300 caractères), accord entre ensembles, coût OpenAI, lecture de la sortie de `claude -p`, et la boucle avec de faux fournisseurs (nouvel essai, échec, page inaccessible, budget, limite, requête sans score ni critères du répertoire).
- `appliquer-confirmations.test.ts` : forme de `criteres_confirmes` (critères, citations des confirmés et des infirmés, modèle, règle, date de Toronto), outils sans verdict laissés intacts, entrées non modifiées, champ compté parmi les champs d'enrichissement, la CLI sur une copie, et le fichier réel (le champ est présent pour chaque outil enrichi, chaque critère confirmé a sa citation, jamais plus de critères confirmés que d'étoiles).
- `classify4.test.ts` : repli sur `classify.ts` sans enrichissement, règles R1 et R2 (cas gardés et retirés), sous-ensemble ordonné de `classify.ts` pour tous les outils, confiance de `classify2.ts`, accord de 47 contre 39 avec l'évaluation enrichie sur les confirmations commitées, lecture des confirmations, et la CLI sur une copie.
- `classify2.test.ts` : mêmes critères que `classify.ts` pour tous les outils, les niveaux de `confiance` (élevée, moyenne, faible, indéterminée, trois étoiles), `confianceV2`, la comparaison avec l'évaluation enrichie (aucun faux négatif, AUC au moins égale à celle de `classify.ts`), et la CLI sur une copie de `outils.json`.
- `extract.test.ts` : conversion de la date de la page en heure de Toronto, cohérence de `criteres.json` et `outils.json`, rejet d'une page sans date, téléchargement (sur un serveur local, sans réseau), erreurs de téléchargement, le garde-fou contre l'écrasement (avec et sans `--force`, y compris pour un fichier au mauvais format), et la preuve qu'aucun fichier HTML local n'est lu.
- `update.test.ts` : nouveau, modification, retrait, comeback, conservation des dates des outils inchangés et des champs d'enrichissement, la présentation colorée du résumé et du journal (même texte avec ou sans couleurs), et les conditions de la mise à jour automatique du sommaire (dont `--sommaire` et `--sans-sommaire`) et l'avertissement quand le sommaire n'est pas à jour.
- `enrichir.test.ts` : vocabulaire de `tags.json`, date d'enrichissement, validation (tags, Markdown permis et interdit, licences SPDX et maison, évaluation), explication des écarts, extraction de la page, pages inaccessibles ou presque vides (avertissement, refus par défaut, `--sans-page`), enrichissement une seule fois, limite, reprise et échecs, avec de faux générateurs.
- `spdx.test.ts` : licences SPDX valides et refusées.
- `progress.test.ts` : barre en terminal et hors terminal, bornes, étiquette, `end()` idempotent, `message()`, peinture de la barre.
- `couleurs.test.ts` : règles d'activation (terminal, `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb`, `--sans-couleur`) et codes ANSI.
- `temps.test.ts` : heure de Toronto (hiver, été, minuit, passage à l'heure d'été), décalage ajouté à une date locale.
- `fichiers.test.ts` : structure et `meta` des fichiers de données (création, contenu inchangé ou modifié, licence rétablie, refus des formats invalides), et conformité des trois fichiers du dépôt.
- `sommaire.test.ts` : statistiques (statuts, licences, familles, tags, critères par statut, forges, dates), rendu Markdown (sections, images insérées dans leur section, cas sans outil enrichi), validation du résumé et nouvelle tentative, `genererSommaire` (écriture, options, conservation du sommaire existant en cas d'échec), avec des données fictives (jamais `outils.json`, jamais le réseau).
- `graphiques.test.ts` : spécifications Vega-Lite (données incluses, champs existants, pourcentages, graphiques omis sans données), écriture et nettoyage des fichiers, message si vl-convert est absent, et conversion réelle en SVG et PNG (ignorée si vl-convert n'est pas installé). Les données fictives des tests sont dans `donnees-fictives.ts`.
- `schemas.test.ts` : les trois fichiers de données réels sont valides selon les schémas (avec Ajv, indépendant de RunTypes), et des variantes invalides sont refusées (clé inconnue, `score` hors de 0 à 3, `source` ou `changement` inconnus, tags en trop ou en double, date non ISO, `meta` manquant).
- `en-tetes.test.ts` : chaque fichier `.ts` porte les en-têtes SPDX; la licence du code est la même dans `package.json`; les deux textes de licence sont présents, à la racine (`LICENSE*`) et dans `LICENSES/`; chaque schéma JSON déclare la licence du code dans `$comment`; et `REUSE.toml` annote `schemas/**` et le reste des fichiers sans en-tête (AGPL-3.0-or-later), ainsi que les données et leurs dérivés (CC-BY-SA-4.0). Ce test ne remplace pas `nub run licences`, qui contrôle tous les fichiers.

## Dépannage

| Message | Cause et remède |
|---|---|
| `Refus d'écraser: …` | `extract` (ou `build`) a trouvé dans `outils.json` un enrichissement, un historique de changement, ou un format inattendu. Pour suivre la page sans rien perdre, utiliser `nub run update`; pour tout remplacer quand même, `nub run build:force` |
| `… format invalide …` ou `« meta » invalide …` | Un fichier de données n'a pas la structure décrite dans [Fichiers JSON](#fichiers-json). Le restaurer depuis Git (`git checkout outils.json`) ou, pour `outils.json`, le recréer avec `nub run build:force` |
| `Téléchargement impossible (url): …` | Réseau, délai de 30 secondes dépassé ou erreur HTTP en téléchargeant le répertoire. Rien n'a été écrit : réessayer |
| `OPENAI_API_KEY absente` | Il y a des outils à enrichir (ou un résumé à rédiger pour `nub run sommaire`), mais `.env` n'a pas la clé. La synchronisation, elle, a déjà été écrite. Pour le sommaire, `--sans-resume` évite la clé |
| `page inaccessible …` ou `page presque vide …`, `outil non enrichi` | La page de l'outil n'a pas pu être lue : réessayer plus tard, ou enrichir à partir de la description seule avec `--sans-page`. Voir [Pages inaccessibles](#pages-inaccessibles-ou-presque-vides) |
| Des séquences comme `^[[32m` ou `[32m` apparaissent dans la sortie | Les couleurs sont forcées (`FORCE_COLOR`). Les désactiver avec `--sans-couleur` (ou retirer `FORCE_COLOR`) |
| `Le sommaire n'est plus à jour …` | `update` a détecté des changements (ou enrichi des outils) sans mettre le sommaire à jour, parce qu'on ne l'a pas demandé ou qu'on l'a refusé avec `--sans-sommaire`. Lancer `nub run sommaire`, ou utiliser `--sommaire` (ou `--enrichir`) la prochaine fois |
| `Sommaire non mis à jour: …` | Après `--enrichir` ou `--sommaire`, le sommaire n'a pas pu être mis à jour : clé ou vl-convert manquant (avertissement, rien n'est modifié) ou résumé impossible à rédiger (le sommaire existant est conservé, code de sortie 1). Régler le problème, puis lancer `nub run sommaire` (ou le désactiver avec `--sans-sommaire`) |
| `vl-convert est introuvable …` | Le sommaire a besoin de vl-convert pour ses graphiques. L'installer (voir [Graphiques](#graphiques)) ou utiliser `nub run sommaire --sans-graphiques` |
| `vl-convert vl2svg: …` ou `vl-convert vl2png: …` | vl-convert a refusé une spécification de graphique : le message de vl-convert dit pourquoi. Vérifier sa version (`vl-convert --version`, 1.9 ou plus) |
| `Schémas périmés ou absents: …` | `nub run schemas:verifier` (ou `nub run test`) a trouvé un schéma commité qui diffère de celui que les types produisent. Lancer `nub run schemas`, puis commiter `schemas/` |
| `Option inconnue: …` | Option mal orthographiée. Les options valides sont décrites dans la section de chaque script |

## Utiliser les données

Pour un aperçu chiffré, voir [`sommaire.md`](sommaire.md). Pour obtenir le répertoire courant, ignorer les outils portant `removed`. Pour les logiciels libres, filtrer sur `source` (`libre` ou `partiel`) et utiliser `licence` (ou `custom_license`) et `repo`. Par exemple, avec [jaq](https://github.com/01mf02/jaq) :

```sh
# licence et dates du fichier
jaq '.meta' outils.json

# outils actuellement au répertoire
jaq '[.outils[] | select(.removed | not)]' outils.json

# logiciels libres enrichis, avec leur licence et leur dépôt
jaq '.outils[] | select(.source == "libre" or .source == "partiel") | {nom, licence, custom_license, repo}' outils.json

# outils enrichis sans page lisible (résultat moins fiable)
jaq '.outils[] | select(.page_lue == false) | .nom' outils.json

# outils enrichis depuis une date donnée
jaq '.outils[] | select(.enrichi_le != null and .enrichi_le >= "2026-11-12") | .nom' outils.json

# outils portant un tag
jaq '.outils[] | select((.tags // []) | index("chiffrement")) | .nom' outils.json

# critères vérifiés par IA, avec la citation, quand ils diffèrent des étoiles
jaq '.outils[] | select(.criteres_confirmes and (.criteres_confirmes.criteres | length) < .score) | {nom, score, criteres, confirmes: .criteres_confirmes.criteres, preuves: .criteres_confirmes.preuves}' outils.json
```
