# Répertoire d'outils favorisant la souveraineté numérique — données

Extraction en JSON du [répertoire d'outils favorisant la souveraineté numérique](https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/) publié sur Praxis, avec une analyse des étoiles de chaque outil selon les trois critères du répertoire, et un script de synchronisation avec la page en ligne.

Le répertoire rassemble 60 outils numériques répartis en 20 catégories, sélectionnés pour les besoins des OSBL des arts et de la culture. Chaque outil reçoit de 0 à 3 étoiles (un critère satisfait = une étoile); seuls ceux qui en ont au moins 2 y figurent.

## Source et crédits

Le contenu est l'œuvre des auteur·trices de la note, et non de ce dépôt :

> Sven Buridans, François Delnooz, Marie-Renee Duguay. (2026). *Répertoire d'outils favorisant la souveraineté numérique*. Praxis. <https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/>

- La note a été produite par [**La bande numérique**](https://fccf.ca/initiatives/la-bande-numerique/), une initiative de la [Fédération culturelle canadienne-française (FCCF)](https://fccf.ca/).
- Elle est publiée sur **Praxis**, plateforme du projet [**En commun**](https://encommun.io/).
- Sauf indication contraire, les contenus publics de Praxis portent la licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr). Les données dérivées de ce dépôt (`outils.json`, `criteres.json`) en sont des adaptations et sont à ce titre partagées dans les mêmes conditions, avec attribution aux auteur·trices ci-dessus.

Les scores et les descriptions viennent de la source. Seul le champ `criteres` (quelle étoile correspond à quel critère) est une déduction de ce dépôt, voir [Classification](#classification).

## Démarrage

Prérequis : [nub](https://nubjs.com/) (qui exécute le TypeScript directement). Les commandes `nub run` ci-dessous sont définies dans `package.json`.

```sh
nub install       # dépendances (linkedom)
nub run test      # tests
nub run update    # synchroniser outils.json avec la page en ligne
```

## Fichiers JSON

### `outils.json`

Fichier unifié : un tableau de 60 outils (plus d'éventuels outils retirés). Chaque outil contient :

| Champ | Description |
|---|---|
| `categorie` | Nom de la catégorie (le `h3`, sans l'icône) |
| `icone` | Icône de la catégorie, champ séparé |
| `nom` | Nom de l'outil. Sert de clé d'identification |
| `score` | Nombre d'étoiles ★ sur 3 |
| `lien` | Lien externe de l'outil |
| `description` | Description fournie par la source |
| `derniere_modification` | Dernière date de modification connue (ISO, ex. `2026-11-05T09:53`) |
| `changement` | Dernier changement détecté par `update.ts` : `"nouveau"`, `"modification"`, `"retrait"` ou `"comeback"`; `null` si jamais modifié depuis l'import |
| `removed` | Présent (`true`) seulement pour un outil disparu de la page; l'entrée est conservée |
| `criteres` | Identifiants (voir `criteres.json`) des critères que les étoiles représentent. Déduits, voir [Classification](#classification) |
| `confiance` | Fiabilité de cette déduction : `"élevée"`, `"moyenne"` ou `"faible"` |

La page n'affiche qu'une seule date pour toute la note. `derniere_modification` est donc la date de la page au moment où l'outil a été ajouté ou a changé, et non la date exacte du changement de cet outil.

### `criteres.json`

Les trois critères du répertoire (« trois critères simples et concrets »), sous forme de tableau de `{ id, icon, titre, description }` :

| `id` | `icon` | Question |
|---|---|---|
| `donnees` | 📍 | Où peuvent rester les données ? |
| `controle` | 🏢 | Qui contrôle l'outil ? |
| `dependance` | 🔗 | De qui dépend-il pour fonctionner ? |

Les `id` sont la forme courte utilisée dans le champ `criteres` de `outils.json`.

## Scripts

Tous sont en TypeScript et se lancent avec `nub`. Les fonctions principales sont exportées pour être réutilisables; le code de ligne de commande ne s'exécute que lorsque le script est lancé directement.

### `extract.ts`

```sh
nub extract.ts <dossier> <outils.json> [criteres.json]
```

Lit le fichier `.html` sauvegardé dans `<dossier>` (la page du répertoire enregistrée depuis le navigateur; les `.html` sont ignorés par Git) et écrit les outils et, si demandé, les critères. Utilise [linkedom](https://github.com/WebReflection/linkedom) pour interroger le DOM. Lit la date de modification affichée sur la page et refuse une page sans date ou contenant deux outils de même nom. Les outils sont écrits **sans** classification.

### `classify.ts`

```sh
nub classify.ts <outils.json> [sortie.json]
```

Ajoute `criteres` et `confiance` à chaque outil (réécrit `outils.json` en place si aucune sortie n'est donnée). Voir [Classification](#classification).

### `update.ts`

```sh
nub update.ts [--dry-run] [outils.json] [url]
```

Télécharge la page en ligne (par défaut celle du répertoire), la compare à `outils.json` et met le fichier à jour. `--dry-run` affiche les changements sans écrire.

- Outil absent du fichier : `changement: "nouveau"`.
- Outil marqué `removed` qui revient : `"comeback"`, et `removed` disparaît.
- Catégorie, icône, score, lien ou description différents : `"modification"`.
- Outil absent de la page : `"retrait"` et `removed: true`. L'entrée est conservée.
- Outil identique : rien ne change, ni sa date ni son `changement`.

Les outils nouveaux, modifiés, retirés ou de retour reçoivent la date de modification de la page; les nouveaux, modifiés et de retour sont reclassés. Le fichier n'est réécrit que s'il y a au moins un changement.

### `ids.ts`

Module partagé : les trois identifiants de critères (`donnees`, `controle`, `dependance`) et la correspondance icône → id utilisée par `extract.ts`, car la page n'identifie les critères que par leur icône.

### Tests (`test/`)

Lancés avec `node:test` via `nub` :

- `classify.test.ts` : cas de classification connus, et un nombre de critères égal au score pour les 60 outils.
- `extract.test.ts` : conversion de date, cohérence de `criteres.json` et `outils.json`, rejet d'une page sans date.
- `update.test.ts` : nouveau, modification, retrait, comeback, conservation des dates des outils inchangés.

## Classification

La page ne dit pas quelle étoile correspond à quel critère. `classify.ts` le déduit des descriptions :

1. Des règles (expressions régulières) mesurent, pour chaque critère, la force des indices dans la description : « auto-hébergé » ou « au Canada » pour les données, « canadien » ou « québécois » (contre « non canadien », « international ») pour le contrôle, « pair-à-pair », « hors ligne », « libre » pour la dépendance.
2. Le `score` connu fixe le nombre de critères satisfaits : 3 étoiles = les trois critères; 2 = on écarte celui dont l'indice est le plus faible.
3. `confiance` reflète l'écart entre le dernier critère retenu et le premier écarté.

C'est une heuristique, pas une vérité : un critère retenu avec une confiance « faible » ou « moyenne » est une hypothèse (par exemple, un fournisseur canadien à 2 étoiles est supposé héberger au Canada).

## Scripts npm (`package.json`)

| Commande | Effet |
|---|---|
| `nub run extract` | `nub extract.ts . outils.json criteres.json` : importe depuis le `.html` local |
| `nub run classify` | `nub classify.ts outils.json` : classe les outils en place |
| `nub run build` | `extract` puis `classify` : reconstruit `outils.json` depuis le `.html` local. **Efface** l'historique des `changement` et des `removed` |
| `nub run update` | `nub update.ts` : synchronise `outils.json` avec la page en ligne (ajouter `-- --dry-run` pour simuler) |
| `nub run test` | Lance les trois fichiers de tests |
| `nub run typecheck` | `tsrs -p .` : vérifie les types avec [tsrs](https://www.npmjs.com/package/tsrs), un portage en Rust de `tsc` |

## Utiliser les données

Pour obtenir le répertoire courant, filtrer les outils portant `removed`.
