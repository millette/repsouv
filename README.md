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
| `description_longue` | Description détaillée en français (150 à 350 mots), en Markdown (plusieurs paragraphes, titres, gras, italique, listes), sans image, sans HTML, sans tiret cadratin et sans émoji ni émoticône. Générée une seule fois par `update.ts --enrichir`; absente tant que l'outil n'est pas enrichi |
| `tags` | De 1 à 5 identifiants de `tags.json`. Ajoutés par l'enrichissement |
| `source` | Statut du code source : `"libre"` (licence libre, code public), `"partiel"` (édition communautaire libre mais édition complète ou services propriétaires, « open core »), `"source-disponible"` (code visible, licence non libre) ou `"proprietaire"` |
| `licence` | Licence du logiciel (identifiant SPDX si possible); `null` pour un logiciel propriétaire ou si elle est inconnue |
| `repo` | URL du dépôt de code source, sur n'importe quelle forge (GitHub, GitLab, Codeberg, Framagit…); `null` si aucun ou inconnu |
| `evaluation_enrichie` | Second avis du modèle sur la souveraineté de l'outil, avec trois sous-champs : `score` (nombre de critères satisfaits, de 0 à 3, égal à `criteres.length`), `criteres` (identifiants de `criteres.json`) et `confiance` (`"élevée"`, `"moyenne"` ou `"faible"`). À comparer au `score` du répertoire et au `criteres` déduit par `classify.ts`. Un quatrième sous-champ, `ecart`, n'existe que lorsque l'évaluation diffère du répertoire : une explication en français de l'écart |

La page n'affiche qu'une seule date pour toute la note. `derniere_modification` est donc la date de la page au moment où l'outil a été ajouté ou a changé, et non la date exacte du changement de cet outil.

Les champs `description_longue`, `tags`, `source`, `licence`, `repo` et `evaluation_enrichie` viennent d'un modèle d'IA (voir `update.ts --enrichir`). Ils s'appuient sur la page de l'outil, mais la licence et le dépôt sont à vérifier avant de s'y fier : le modèle est invité à répondre `null` en cas de doute.

### `criteres.json`

Les trois critères du répertoire (« trois critères simples et concrets »), sous forme de tableau de `{ id, icon, titre, description }` :

| `id` | `icon` | Question |
|---|---|---|
| `donnees` | 📍 | Où peuvent rester les données ? |
| `controle` | 🏢 | Qui contrôle l'outil ? |
| `dependance` | 🔗 | De qui dépend-il pour fonctionner ? |

Les `id` sont la forme courte utilisée dans le champ `criteres` de `outils.json`.

### `tags.json`

Le vocabulaire restreint de tags : un tableau de `{ id, description }`, avec une description en français pour chaque tag (37 au départ). Chaque outil reçoit de 1 à 5 de ces tags, jamais plus.

De nouveaux tags peuvent s'ajouter après cette première phase, avec `update.ts --enrichir --nouveaux-tags`. Chaque tag ajouté doit être **justifié** : il porte alors en plus un champ `justification` (pourquoi aucun tag existant ne convient) et `propose_pour` (l'outil pour lequel il a été proposé). Un nouveau tag peut ne concerner qu'un seul outil.

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

Les outils nouveaux, modifiés, retirés ou de retour reçoivent la date de modification de la page; les nouveaux, modifiés et de retour sont reclassés. Le fichier n'est réécrit que s'il y a au moins un changement. Les champs d'enrichissement d'un outil (description longue, tags, source, licence, repo) survivent à une modification ou à un retour.

**Enrichissement** (`--enrichir`) : après la synchronisation, génère pour chaque outil qui n'a pas encore de `description_longue` une description longue en français (Markdown), de 1 à 5 tags, `source`, `licence` et `repo` pour les logiciels libres, et une évaluation indépendante des critères et du score (`evaluation_enrichie`). C'est fait **une seule fois** : un outil qui a déjà une description longue n'est jamais régénéré, même si sa description courte change. Les outils retirés sont ignorés.

- Le script télécharge la page (`lien`) de l'outil, en extrait le texte et les liens vers des forges de code, puis les envoie avec la description courante à l'API OpenAI (Responses API, sortie JSON structurée). Les tags sont limités au vocabulaire de `tags.json`.
- Réponse validée avant d'être écrite : 1 à 5 tags connus, URL de dépôt valide, aucun repo ni licence pour un logiciel propriétaire, description longue sans image Markdown, sans HTML (balises, entités, liens entre chevrons), sans tiret cadratin et sans émoji ni émoticône, évaluation cohérente (score égal au nombre de critères). Une réponse invalide est redemandée une fois, avec la raison du rejet, puis consignée comme échec.
- **Évaluation indépendante** : le modèle reçoit la description des trois critères mais pas le score ni les critères du répertoire, pour ne pas simplement les confirmer. Quand l'évaluation diffère du répertoire (score différent ou critères différents), un second appel à l'API explique l'écart en 2 à 4 phrases (sans prétendre savoir laquelle des deux est correcte, et en rappelant que les critères du répertoire sont eux-mêmes déduits) et l'inscrit dans `evaluation_enrichie.ecart`. Cette explication suit les mêmes interdits typographiques que la description longue. Si elle échoue après une nouvelle tentative, l'outil n'est pas modifié et sera retenté à la prochaine exécution. Les écarts sont aussi résumés à la fin de l'exécution; le `score` et les `criteres` du répertoire ne sont jamais modifiés.
- **Progression** : une barre de progression (`progress.ts`) et le journal vont sur stderr, de sorte que stdout reste propre. Le nom de l'outil en cours s'affiche à droite de la barre (en terminal) ou sur une ligne `Enrichissement de <outil>...` (hors terminal). Hors terminal (CI, redirection), une ligne de pourcentage est écrite par tranche de 10 %.
- `outils.json` est écrit après chaque outil : une interruption ne perd rien, et une relance reprend où on s'est arrêté.
- `--nouveaux-tags` autorise le modèle à proposer de nouveaux tags (justification obligatoire); ils sont ajoutés à `tags.json`.
- `--limite=N` n'enrichit pas plus de N outils par exécution.
- `--dry-run` liste les outils concernés sans appeler l'API.
- Configuration : `OPENAI_API_KEY` dans `.env` (voir `.env.example`; `.env` est ignoré par Git), et `OPENAI_MODEL` pour changer le modèle (`gpt-6-astra` par défaut). Chaque outil enrichi envoie son nom, sa description et un extrait de sa page publique à OpenAI.

### `progress.ts`

Barre de progression minimale sur une ligne, sans dépendance : `createProgress(total, options)` retourne `update(valeur, étiquette?)` (l'étiquette, par exemple l'outil en cours, s'affiche après le pourcentage), `message(texte)` (écrit une ligne au-dessus de la barre sans l'abîmer) et `end()`. Écrit sur stderr par défaut.

### `enrichir.ts`

Module de l'enrichissement : lecture de la page de l'outil, requête à l'API OpenAI, validation des réponses (`validerProposition`) et boucle `enrichirOutils`, qui reçoit le générateur en paramètre pour pouvoir être testée sans réseau.

### `ids.ts`

Module partagé : les trois identifiants de critères (`donnees`, `controle`, `dependance`) et la correspondance icône → id utilisée par `extract.ts`, car la page n'identifie les critères que par leur icône.

### Tests (`test/`)

Lancés avec `node:test` via `nub` :

- `classify.test.ts` : cas de classification connus, et un nombre de critères égal au score pour les 60 outils.
- `extract.test.ts` : conversion de date, cohérence de `criteres.json` et `outils.json`, rejet d'une page sans date.
- `update.test.ts` : nouveau, modification, retrait, comeback, conservation des dates des outils inchangés et des champs d'enrichissement.
- `enrichir.test.ts` : vocabulaire `tags.json`, validation (maximum 5 tags, nouveaux tags justifiés, propriétaire sans licence, Markdown permis et interdit, évaluation), explication des écarts, extraction de la page, enrichissement une seule fois, limite, reprise et échecs, avec de faux générateurs.
- `progress.test.ts` : barre en terminal et hors terminal, bornes, `end()` idempotent, `message()`.

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
| `nub run enrichir` | `nub update.ts --enrichir` : synchronise, puis enrichit les outils sans description longue (ajouter `-- --limite=5`, `-- --nouveaux-tags` ou `-- --dry-run`) |
| `nub run test` | Lance les cinq fichiers de tests |
| `nub run typecheck` | `tsrs -p .` : vérifie les types avec [tsrs](https://www.npmjs.com/package/tsrs), un portage en Rust de `tsc` |

## Utiliser les données

Pour obtenir le répertoire courant, filtrer les outils portant `removed`. Pour les logiciels libres, filtrer sur `source` (`libre` ou `partiel`) et utiliser `licence` et `repo`.
