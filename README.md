# Répertoire d'outils favorisant la souveraineté numérique : données

Extraction en JSON du [répertoire d'outils favorisant la souveraineté numérique](https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/) publié sur Praxis. Le dépôt contient les données (`outils.json`, `criteres.json`, `tags.json`) et les scripts qui les produisent :

- l'extraction de la page en ligne vers du JSON;
- l'analyse des étoiles de chaque outil selon les trois critères du répertoire;
- la synchronisation avec la page en ligne, qui détecte les outils nouveaux, modifiés et retirés;
- un enrichissement facultatif par IA : description longue, tags, licence et dépôt de code, second avis sur la souveraineté.

Le répertoire rassemble 60 outils numériques répartis en 20 catégories, sélectionnés pour les besoins des OSBL des arts et de la culture. Chaque outil reçoit de 0 à 3 étoiles (un critère satisfait = une étoile); seuls ceux qui en ont au moins 2 y figurent.

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
| **Code source** (`*.ts`, `test/`, `package.json`, `tsconfig.json`) | [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html), identifiant SPDX `AGPL-3.0-only`. Texte complet dans [`LICENSE`](LICENSE). Chaque fichier `.ts` commence par les en-têtes `SPDX-License-Identifier` et `SPDX-FileCopyrightText` |
| **Données** (`outils.json`, `criteres.json`, `tags.json`) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr), identifiant SPDX `CC-BY-SA-4.0`. Texte complet dans [`LICENSE-CC-BY-SA-4.0`](LICENSE-CC-BY-SA-4.0). Le JSON n'admet pas de commentaires : chaque fichier déclare sa licence dans `meta.data_license`, que les scripts maintiennent (voir [Fichiers JSON](#fichiers-json)) |

Les données sont des adaptations du répertoire d'origine : elles restent donc partagées dans les mêmes conditions que lui (CC BY-SA 4.0), avec attribution. Pour les réutiliser, créditer par exemple ainsi :

> Données : Sven Buridans, François Delnooz et Marie-Renee Duguay, *Répertoire d'outils favorisant la souveraineté numérique* (Praxis, 2026), adaptées par [Robin Millette](https://robin.millette.info/). CC BY-SA 4.0.

Les champs d'enrichissement résument des pages tierces (voir [D'où viennent les champs](#doù-viennent-les-champs)) : la licence des données ne se substitue pas à celle des sites des outils.

### D'où viennent les champs

- **De la source :** la catégorie, le nom, le score, le lien et la description de chaque outil, ainsi que les trois critères.
- **Calculé par les scripts :** `meta` (licence et dates des fichiers), `derniere_modification`, `changement` et `removed` (voir `update.ts` et `fichiers.ts`).
- **Déduit par heuristique dans ce dépôt :** `criteres` et `confiance` (voir [Classification](#classification)).
- **Généré par un modèle d'IA :** les champs d'enrichissement (voir [Enrichissement](#enrichissement-par-ia)). Ils résument des pages tierces et sont à vérifier avant de s'y fier ou de les diffuser, surtout la licence et le dépôt.

## Démarrage

Prérequis : [nub](https://nubjs.com/), qui exécute le TypeScript directement, et un accès au réseau (`extract`, `update` et l'enrichissement téléchargent des pages en ligne). Les commandes `nub run` sont définies dans `package.json`.

```sh
nub install                      # installe les dépendances
nub run test                     # lance les tests
nub run typecheck                # vérifie les types
nub run update --dry-run         # compare outils.json à la page en ligne, sans rien écrire
nub run update                   # synchronise outils.json avec la page en ligne
nub run enrichir --limite=5      # enrichit 5 outils par IA (nécessite OPENAI_API_KEY)
```

Pour l'enrichissement, copier `.env.example` vers `.env` et y mettre la clé `OPENAI_API_KEY` (`.env` est ignoré par Git).

### Flux de travail

```
Import initial   page en ligne ──▶ extract.ts ──▶ classify.ts ──▶ outils.json
Suivi courant    page en ligne ──▶ update.ts ──▶ outils.json   (nouveau, modification, retrait, comeback)
Enrichissement   update.ts --enrichir ──▶ API OpenAI ──▶ outils.json (+ tags.json si de nouveaux tags)
```

`extract` et `update` téléchargent la page en ligne (le dépôt n'en contient aucune copie). Après l'import initial, `update` suffit pour suivre le répertoire. Voir [Importer ou réimporter depuis le web](#importer-ou-réimporter-depuis-le-web) avant de relancer `extract` ou `build`.

### Contenu du dépôt

| Fichier | Rôle |
|---|---|
| `outils.json`, `criteres.json`, `tags.json` | Les données (voir [Fichiers JSON](#fichiers-json)) |
| `extract.ts`, `classify.ts`, `update.ts` | Les trois scripts du flux de travail |
| `enrichir.ts`, `fichiers.ts`, `temps.ts`, `spdx.ts`, `progress.ts`, `ids.ts`, `cli.ts` | Modules utilisés par les scripts |
| `test/` | Les tests |
| `package.json`, `nub.lock`, `tsconfig.json` | Dépendances, scripts npm et configuration TypeScript |
| `.env.example` | Modèle du fichier `.env` (la clé OpenAI) |
| `LICENSE` | Texte de la licence AGPL-3.0 du code |
| `LICENSE-CC-BY-SA-4.0` | Texte de la licence CC BY-SA 4.0 des données (voir [Licences](#licences)) |
| `.gitignore` | Ignore `.env` et `node_modules/` |

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
| `page_lue` | `true` si la page de l'outil a servi à l'enrichissement; `false` si l'outil a été enrichi sans page lisible (option `--sans-page`), à partir de sa seule description : résultat moins fiable, voir [Pages inaccessibles](#pages-inaccessibles-ou-presque-vides) |
| `evaluation_enrichie` | Second avis du modèle sur la souveraineté de l'outil : `score` (nombre de critères satisfaits, de 0 à 3, égal à `criteres.length`), `criteres` (identifiants de `criteres.json`) et `confiance` (`"élevée"`, `"moyenne"` ou `"faible"`). S'y ajoute `ecart`, une explication en français de la différence, seulement quand cette évaluation diffère du `score` et des `criteres` du répertoire |

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

## Scripts

Les trois scripts (`extract.ts`, `classify.ts` et `update.ts`) se lancent avec `nub`; les autres fichiers sont des modules, utilisés par les scripts et par les tests. Tout est en TypeScript. Les fonctions principales sont exportées pour être réutilisables; le code de ligne de commande ne s'exécute que lorsque le script est lancé directement.

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

### `update.ts`

```sh
nub update.ts [--dry-run] [--enrichir [--nouveaux-tags] [--sans-page] [--limite=N]] [outils.json] [url]
```

Télécharge la page en ligne (`[url]`, par défaut celle du répertoire; le même téléchargement qu'`extract.ts`), la compare à `outils.json` (par défaut `./outils.json`, qui doit exister : pour un premier import, utiliser `nub run build`) et met le fichier à jour. `--dry-run` affiche les changements sans écrire. Pour chaque outil :

- absent du fichier : `changement: "nouveau"`;
- marqué `removed` et de retour sur la page : `"comeback"`, et `removed` disparaît;
- catégorie, icône, score, lien ou description différents : `"modification"`;
- absent de la page : `"retrait"` et `removed: true`, l'entrée est conservée;
- identique : rien ne change, ni sa date ni son `changement`.

Les outils nouveaux, modifiés, retirés ou de retour reçoivent la date de modification de la page; les nouveaux, modifiés et de retour sont reclassés. Les champs d'enrichissement d'un outil survivent à une modification ou à un retour. Le fichier n'est réécrit que s'il y a au moins un changement; `meta.updated_at` est alors mis à jour, et `tags.json` aussi quand de nouveaux tags s'ajoutent.

Avec `--enrichir`, la synchronisation est suivie de l'[enrichissement](#enrichissement-par-ia), qui lit `tags.json` et `criteres.json` dans le même dossier que `outils.json`. Une option inconnue est refusée, de même que `--nouveaux-tags` ou `--sans-page` sans `--enrichir`.

### `enrichir.ts`

Module de l'enrichissement : lecture de la page de l'outil, requêtes à l'API OpenAI, validation des réponses (`validerProposition`, `validerEcart`) et boucle `enrichirOutils`. Cette boucle reçoit ses générateurs en paramètres, ce qui permet de la tester sans réseau.

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

Barre de progression minimale sur une ligne, sans dépendance : `createProgress(total, options)` retourne `update(valeur, étiquette?)` (l'étiquette, par exemple l'outil en cours, s'affiche après le pourcentage), `message(texte)` (écrit une ligne au-dessus de la barre sans l'abîmer) et `end()`. Écrit sur stderr par défaut.

### `cli.ts`

`lancer(principal)` exécute le corps d'un script en ligne de commande : toute erreur (option invalide, fichier manquant, réseau, erreur HTTP) s'affiche en un message clair (`Erreur: …`), sans trace de pile, et donne le code de sortie 1. Utilisé par `extract.ts`, `classify.ts` et `update.ts`.

### `ids.ts`

Module partagé : les trois identifiants de critères (`donnees`, `controle`, `dependance`) et la correspondance icône → id utilisée par `extract.ts`, car la page n'identifie les critères que par leur icône.

## Classification

La page ne dit pas quelle étoile correspond à quel critère. `classify.ts` le déduit des descriptions :

1. Des règles (expressions régulières) mesurent, pour chaque critère, la force des indices dans la description : « auto-hébergé » ou « au Canada » pour les données, « canadien » ou « québécois » (contre « non canadien », « international ») pour le contrôle, « pair-à-pair », « hors ligne », « libre » pour la dépendance.
2. Le `score` connu fixe le nombre de critères satisfaits : 3 étoiles = les trois critères; 2 = on écarte celui dont l'indice est le plus faible.
3. `confiance` reflète l'écart entre le dernier critère retenu et le premier écarté.

Pour une description sans score connu, la fonction exportée `classer(description)` retient les critères dont l'indice atteint un seuil, et la confiance est `"indéterminée"`.

C'est une heuristique, pas une vérité : un critère retenu avec une confiance « faible » ou « moyenne » est une hypothèse (par exemple, un fournisseur canadien à 2 étoiles est supposé héberger au Canada). L'enrichissement fournit un second avis indépendant (`evaluation_enrichie`) pour repérer les cas douteux.

## Enrichissement par IA

`update.ts --enrichir` génère, **une seule fois** par outil, les champs décrits plus haut : description longue, tags, `source`, `licence` (ou `custom_license`), `repo` et `evaluation_enrichie`. Un outil qui a déjà une `description_longue` n'est jamais régénéré, même si sa description courte change. Les outils retirés sont ignorés. L'enrichissement s'exécute aussi quand la page n'a pas changé. Quand tous les outils sont déjà enrichis, aucun appel n'est fait et la clé n'est pas nécessaire.

| Option | Effet |
|---|---|
| `--enrichir` | Active l'enrichissement après la synchronisation |
| `--limite=N` | N'enrichit pas plus de N outils par exécution. Seuls les succès comptent : un outil en échec ne compte pas dans la limite, mais n'est essayé qu'une fois par exécution |
| `--sans-page` | Enrichit aussi les outils dont la page est inaccessible ou presque vide, à partir de leur seule description (ils portent alors `page_lue: false`). Voir [Pages inaccessibles](#pages-inaccessibles-ou-presque-vides) |
| `--nouveaux-tags` | Autorise le modèle à proposer de nouveaux tags (justification obligatoire); ils sont ajoutés à `tags.json` |
| `--dry-run` | Liste les outils concernés sans appeler l'API |

**Configuration :** `OPENAI_API_KEY` dans `.env` (voir `.env.example`), et `OPENAI_MODEL` pour changer le modèle (`gpt-6-astra` par défaut). Compter environ 20 secondes par outil (mesuré sur quelques outils).

**Confidentialité :** pour chaque outil, le script télécharge la page publique (`lien`), en extrait le texte (limité à 6 000 caractères) et les liens vers des forges de code, puis envoie à l'API OpenAI (Responses API, sortie JSON structurée) le nom, la catégorie, le lien, la description et cet extrait. Quand l'évaluation diffère du répertoire, le second appel y ajoute les deux évaluations. Les tags sont limités au vocabulaire de `tags.json`. La page est lue d'abord : voir [Pages inaccessibles ou presque vides](#pages-inaccessibles-ou-presque-vides).

**Validation :** chaque réponse est vérifiée avant d'être écrite :

- de 1 à 5 tags connus, sans doublon;
- URL de dépôt valide, licence SPDX valide (voir `spdx.ts`);
- licence maison cohérente : exclusive avec `licence`, URL seulement avec un nom, et un nom qui n'est pas lui-même un identifiant SPDX;
- ni dépôt, ni licence, ni licence maison pour un logiciel propriétaire;
- description longue sans image Markdown, sans HTML (balises, entités, liens entre chevrons), sans tiret cadratin et sans émoji ni émoticône;
- évaluation cohérente (score égal au nombre de critères).

Une réponse invalide est redemandée une fois, avec la raison du rejet, puis consignée comme échec. Un outil n'est modifié que si tout son enrichissement a réussi; sinon il sera retenté à la prochaine exécution.

**Évaluation indépendante :** le modèle reçoit la description des trois critères, mais pas le score ni les critères du répertoire, pour ne pas simplement les confirmer. Quand son évaluation diffère (score ou critères), un second appel explique l'écart en 2 à 4 phrases, sans prétendre savoir laquelle des deux est correcte et en rappelant que les critères du répertoire sont eux-mêmes déduits. Cette explication, soumise aux mêmes interdits typographiques que la description longue, est inscrite dans `evaluation_enrichie.ecart`. Le `score` et les `criteres` du répertoire ne sont jamais modifiés, et les écarts sont résumés à la fin de l'exécution.

**Progression :** la barre de progression et le journal vont sur stderr; les résumés (changements, nombre d'outils enrichis, écarts, nouveaux tags) restent sur stdout. Le nom de l'outil en cours s'affiche à droite de la barre (en terminal) ou sur une ligne `Enrichissement de <outil>...` (hors terminal, où une ligne de pourcentage est aussi écrite par tranche de 10 %).

**Reprise :** `outils.json` est écrit après chaque outil, donc une interruption ne perd rien et une relance reprend où on s'est arrêté. Le code de sortie est 1 si au moins un outil a échoué (page inaccessible comprise).

### Pages inaccessibles ou presque vides

La page de chaque outil est lue avant tout appel à l'API. Elle est jugée inutilisable si elle est inaccessible (erreur réseau, délai de 20 secondes dépassé, réponse HTTP non réussie comme un 403 de blocage anti-robot) ou presque vide (moins de 200 caractères de texte, par exemple un site rendu par JavaScript). Dans ce cas :

- un **avertissement** est affiché dans le journal, avec la raison;
- **par défaut**, l'outil n'est **pas enrichi** : aucun appel à l'API n'est fait, l'échec est consigné (code de sortie 1) et l'outil sera retenté à la prochaine exécution. Un résultat bâti sur la seule description serait moins fiable (licence et dépôt tirés de la mémoire du modèle, description générique), et comme un outil enrichi n'est jamais régénéré, il serait figé;
- avec **`--sans-page`**, l'outil est enrichi quand même, à partir de la description seule. Le modèle est alors invité à la prudence (`null` pour la licence et le dépôt dans le doute, confiance faible). Le champ **`page_lue: false`** signale cet état, et le script liste ces outils à la fin de l'exécution.

Les outils enrichis avec une page lisible portent `page_lue: true`. Pour refaire plus tard les outils enrichis sans page (une fois leur page redevenue accessible, ou après avoir changé de stratégie), supprimer leurs champs d'enrichissement, puis relancer `nub run enrichir` :

```sh
# à faire après un commit de outils.json (meta.updated_at sera mis à jour à la prochaine écriture par un script)
jaq '.outils |= map(if .page_lue == false then del(.description_longue, .tags, .source, .licence, .custom_license, .custom_license_url, .repo, .evaluation_enrichie, .page_lue) else . end)' outils.json > /tmp/outils.json && mv /tmp/outils.json outils.json
```

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

Si les `criteres` d'un outil déjà enrichi changent après un `classify`, son `evaluation_enrichie.ecart` peut devenir périmé : rien ne le recalcule, puisqu'un outil enrichi n'est jamais régénéré.

## Scripts npm (`package.json`)

| Commande | Effet |
|---|---|
| `nub run extract` | `nub extract.ts outils.json criteres.json` : importe depuis la page en ligne. Refuse d'écraser un travail existant sans `--force` |
| `nub run classify` | `nub classify.ts outils.json` : classe les outils en place |
| `nub run build` | `extract` puis `classify` : construit `outils.json` depuis la page en ligne. Refuse d'écraser un enrichissement ou un historique existant |
| `nub run build:force` | Comme `build`, mais **remplace tout**, enrichissement et historique compris |
| `nub run update` | `nub update.ts` : synchronise `outils.json` avec la page en ligne. Les options passent directement : `nub run update --dry-run` |
| `nub run enrichir` | `nub update.ts --enrichir` : synchronise, puis enrichit les outils sans description longue. Par exemple : `nub run enrichir --limite=5` |
| `nub run test` | Lance les neuf fichiers de tests |
| `nub run typecheck` | `tsrs -p .` : vérifie les types avec [tsrs](https://www.npmjs.com/package/tsrs), un portage en Rust de `tsc` |

## Tests

Dans `test/`, avec `node:test` lancé par `nub` :

- `classify.test.ts` : cas de classification connus, un nombre de critères égal au score pour les 60 outils, les options de la ligne de commande, et le refus d'un fichier au mauvais format.
- `extract.test.ts` : conversion de la date de la page en heure de Toronto, cohérence de `criteres.json` et `outils.json`, rejet d'une page sans date, téléchargement (sur un serveur local, sans réseau), erreurs de téléchargement, le garde-fou contre l'écrasement (avec et sans `--force`, y compris pour un fichier au mauvais format), et la preuve qu'aucun fichier HTML local n'est lu.
- `update.test.ts` : nouveau, modification, retrait, comeback, conservation des dates des outils inchangés et des champs d'enrichissement.
- `enrichir.test.ts` : vocabulaire de `tags.json`, validation (tags, Markdown permis et interdit, licences SPDX et maison, évaluation), explication des écarts, extraction de la page, pages inaccessibles ou presque vides (avertissement, refus par défaut, `--sans-page`), enrichissement une seule fois, limite, reprise et échecs, avec de faux générateurs.
- `spdx.test.ts` : licences SPDX valides et refusées.
- `progress.test.ts` : barre en terminal et hors terminal, bornes, étiquette, `end()` idempotent, `message()`.
- `temps.test.ts` : heure de Toronto (hiver, été, minuit, passage à l'heure d'été), décalage ajouté à une date locale.
- `fichiers.test.ts` : structure et `meta` des fichiers de données (création, contenu inchangé ou modifié, licence rétablie, refus des formats invalides), et conformité des trois fichiers du dépôt.
- `en-tetes.test.ts` : chaque fichier `.ts` porte les en-têtes SPDX, la licence du code est la même dans `package.json`, et les deux textes de licence sont présents.

## Dépannage

| Message | Cause et remède |
|---|---|
| `Refus d'écraser: …` | `extract` (ou `build`) a trouvé dans `outils.json` un enrichissement, un historique de changement, ou un format inattendu. Pour suivre la page sans rien perdre, utiliser `nub run update`; pour tout remplacer quand même, `nub run build:force` |
| `… format invalide …` ou `« meta » invalide …` | Un fichier de données n'a pas la structure décrite dans [Fichiers JSON](#fichiers-json). Le restaurer depuis Git (`git checkout outils.json`) ou, pour `outils.json`, le recréer avec `nub run build:force` |
| `Téléchargement impossible (url): …` | Réseau, délai de 30 secondes dépassé ou erreur HTTP en téléchargeant le répertoire. Rien n'a été écrit : réessayer |
| `OPENAI_API_KEY absente` | Il y a des outils à enrichir, mais `.env` n'a pas la clé. La synchronisation, elle, a déjà été écrite |
| `page inaccessible …` ou `page presque vide …`, `outil non enrichi` | La page de l'outil n'a pas pu être lue : réessayer plus tard, ou enrichir à partir de la description seule avec `--sans-page`. Voir [Pages inaccessibles](#pages-inaccessibles-ou-presque-vides) |
| `Option inconnue: …` | Option mal orthographiée. Les options valides sont décrites dans la section de chaque script |

## Utiliser les données

Pour obtenir le répertoire courant, ignorer les outils portant `removed`. Pour les logiciels libres, filtrer sur `source` (`libre` ou `partiel`) et utiliser `licence` (ou `custom_license`) et `repo`. Par exemple, avec [jaq](https://github.com/01mf02/jaq) :

```sh
# licence et dates du fichier
jaq '.meta' outils.json

# outils actuellement au répertoire
jaq '[.outils[] | select(.removed | not)]' outils.json

# logiciels libres enrichis, avec leur licence et leur dépôt
jaq '.outils[] | select(.source == "libre" or .source == "partiel") | {nom, licence, custom_license, repo}' outils.json

# outils enrichis sans page lisible (résultat moins fiable)
jaq '.outils[] | select(.page_lue == false) | .nom' outils.json

# outils portant un tag
jaq '.outils[] | select((.tags // []) | index("chiffrement")) | .nom' outils.json
```
