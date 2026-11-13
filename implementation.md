# Implémentation du répertoire d'outils favorisant la souveraineté numérique

*Documentation : [README](README.md) · [Implémentation](implementation.md) · [Historique](historique.md) · [Sommaire statistique](sommaire.md)*

Ce document décrit comment les données du [README](README.md) sont produites et maintenues : le flux de travail, les scripts et leurs options, la classification et ses analyses, l'enrichissement par IA, la génération du sommaire, les tests, le dépannage et le déroulement d'une fonctionnalité avec Spec Kit. Le code est en TypeScript, exécuté tel quel par Node.js 26 ; le développement passe par [nub](https://nubjs.com/).

**Sommaire :** [Démarrage](#démarrage) · [Schémas JSON](#schémas-json) · [Scripts](#scripts) · [Classification](#classification) · [Enrichissement par IA](#enrichissement-par-ia) · [Génération du sommaire statistique](#génération-du-sommaire-statistique) · [Importer ou réimporter](#importer-ou-réimporter-depuis-le-web) · [Scripts npm](#scripts-npm-packagejson) · [Tests](#tests) · [Dépannage](#dépannage) · [Site](#site-de-consultation-site) · [Spec Kit](#fonctionnalités-menées-avec-spec-kit) · [Documentation](#documentation)

## Démarrage

Deux usages, deux prérequis. **Utiliser** les scripts (`node update.ts`, `node sommaire.ts`) ne demande que Node.js 26 (toute version 26.x, `engines.node` : `>=26 <27`), qui exécute le TypeScript tel quel, les dépendances installées par `npm install`, et un accès au réseau (`update` et l'enrichissement téléchargent des pages en ligne). **Développer** (tests, types, schémas, licences) demande [nub](https://nubjs.com/) : il télécharge le Node.js déclaré dans `devEngines.runtime` de `package.json` (même plage, `>=26 <27`, résolue vers la dernière version publiée), installe les dépendances d'après `nub.lock` (`nub install`) et lance les commandes `nub run` définies dans `package.json` ; sous nub, les scripts `update` et `sommaire`, qui appellent `node`, utilisent ce même Node.js. Les deux environnements sont ainsi déclarés au même endroit : `engines.node` pour qui exécute les scripts, `devEngines` (`runtime` : Node.js, `onFail: warn` ; `packageManager` : nub, `onFail: ignore`) pour qui développe ; npm 10.9 ou plus lit aussi `devEngines` à l'installation et avertit sans bloquer. Seul le sommaire (y compris sa mise à jour par `update`) a besoin d'un programme de plus, [vl-convert](https://github.com/vega/vl-convert) (voir [Sommaire statistique](#génération-du-sommaire-statistique)), pour ses graphiques. La génération des schémas JSON (`nub run schemas`) n'a pas besoin du réseau. `.node-version` (`26`) répète la majeure pour les autres gestionnaires de versions (fnm, nvm, mise), qui ne lisent pas `devEngines` ; nub lit `devEngines.runtime` en premier (RunTypes demande Node 24 ou plus). `nub run licences` demande [uv](https://docs.astral.sh/uv/). Pour l'installation pas à pas, voir le [démarrage rapide](README.md#démarrage-rapide) du README, et [Outils à installer](README.md#outils-à-installer) pour les commandes d'installation de chaque outil sous Linux, macOS et WSL.

```sh
nub install                      # installe les dépendances
nub run test                     # lance les tests unitaires, puis ceux des données réelles, puis vérifie que les schémas JSON sont à jour
nub run test:unit                # tests unitaires seulement: fonctionnent sans données, avant le premier update
nub run test:data                # tests des fichiers de données réels (outils.json, categories.json, criteres.json, tags.json, sources.json, sommaire.md)
nub run typecheck                # vérifie les types
nub run schemas                  # régénère schemas/*.schema.json à partir des types
nub run licences                 # vérifie la conformité REUSE des licences (uvx reuse lint; demande uv)
nub run update --dry-run         # (ou node update.ts --dry-run) montre ce que update ferait (changements, outils à enrichir, jetons et coût estimés), sans rien écrire
nub run update                   # synchronise les données avec la page, enrichit par IA les outils qui ne le sont pas encore, vérifie leurs critères, décrit les catégories (OPENAI_API_KEY), puis met le sommaire à jour si quelque chose a changé
nub run update --accepter-couts  # premier import hors terminal: accepte les coûts d'enrichissement sans la confirmation interactive
nub run sommaire                 # (ou node sommaire.ts) écrit sommaire.md et graphiques/ (--sans-resume, --sans-graphiques pour s'en passer, --sans-couleur)
```

Pour l'enrichissement et le résumé du sommaire, copier `.env.example` vers `.env` et y mettre la clé `OPENAI_API_KEY` (`.env` est ignoré par Git ; les scripts le lisent eux-mêmes dans le dossier courant, voir [`env.ts`](#envts)) ; `.env.example` dit où créer la clé sur le compte OpenAI (<https://platform.openai.com/api-keys>) et où vérifier le crédit. `OPENAI_MODEL` change le modèle principal (`gpt-6.1-sol` par défaut) et `OPENAI_MODEL_FALLBACK` le modèle de repli (`gpt-6-astra` par défaut ; vide, ou égal au principal, pour s'en passer) : quand une réponse du principal est rejetée (validation, erreur passagère de l'API), la seconde tentative passe par le repli, avec la raison du rejet (voir [Modèle de repli](#modèle-de-repli)). `OPENAI_REASONING_EFFORT` (`none`, `low`, `medium`, `high`, selon ce que le modèle accepte ; `low` par défaut) fixe l'effort de raisonnement de chaque appel (`reasoning.effort`) ; vide, le modèle applique son propre défaut. Ces trois valeurs par défaut viennent du [banc d'essai](analyse-effort/analyse.md) du 2026-11-12. Les jetons de raisonnement, facturés comme sortie, sont comptés à part (« dont N de raisonnement ») pour mesurer l'effet de ce réglage.

### Flux de travail

```
Suivi courant    page en ligne ──▶ update.ts ──▶ outils.json + categories.json + criteres.json + sources.json   (nouveau, modification, retrait, comeback, pour les outils de la source Praxis; import initial si outils.json manque)
Source FACiL     page des Services FACiLes ──▶ extract-facil.ts ──▶ outils.json + sources.json   (mêmes changements que Praxis, pour les outils de la source facil)
Source Charles   dépôt GitLab de Charles (data/) ──▶ extract-charles.ts ──▶ outils.json + sources.json + categories.json   (mêmes changements, pour la source charles; cinq catégories déclarées)
Ajout manuel     ajouter.ts ──▶ outils.json (+ sources.json)   (outil d'une autre source, enrichi ensuite par update)
Reconstruction   page en ligne ──▶ extract.ts --force ──▶ classify.ts ──▶ outils.json   (volontaire: remplace tout, enrichissement compris)
Enrichissement   update.ts (toujours, pour les outils non enrichis) ──▶ API OpenAI ──▶ outils.json (+ tags.json si de nouveaux tags)
Vérification     update.ts (outils enrichis sans verdict) ──▶ API OpenAI ──▶ outils.json (criteres_confirmes)
Open Hub         update.ts (logiciels libres enrichis sans données) ──▶ API Open Hub ──▶ outils.json (openhub_id, openhub)
Catégories       update.ts (catégories sans description) ──▶ API OpenAI ──▶ categories.json (description) ──▶ sommaire (si quelque chose a changé)
Sommaire         outils.json ──▶ sommaire.ts ──▶ sommaire.md + graphiques/   (vl-convert; résumé: API OpenAI)
Schémas          schemas-types.ts ──▶ obuild + RunTypes ──▶ generer-schemas.ts ──▶ schemas/*.schema.json   (à relancer après un changement de type)
```

`update` télécharge la page en ligne à chaque exécution (le dépôt n'en contient aucune copie) et suffit à tout, premier import compris. `extract.ts` et `classify.ts` ne servent qu'aux opérations exceptionnelles décrites dans [Importer ou réimporter depuis le web](#importer-ou-réimporter-depuis-le-web).

### Contenu du dépôt

| Fichier | Rôle |
|---|---|
| `outils.json`, `categories.json`, `criteres.json`, `tags.json`, `sources.json` | Les données (voir [Fichiers JSON](README.md#fichiers-json)) |
| `update.ts` | Le script du suivi : synchronise `outils.json`, `categories.json`, `criteres.json` et `sources.json` avec la page en ligne (import initial compris), enrichit les outils qui ne le sont pas encore, vérifie leurs critères, décrit les catégories et met le sommaire à jour quand quelque chose a changé |
| `extract.ts`, `classify.ts` | Les deux outils exceptionnels, sans script npm : reconstruction forcée depuis la page, et reclassement de tous les outils après un changement des règles |
| `confirmer.ts` | Module de la vérification des critères (`criteres_confirmes`), appelé par `update.ts` après l'enrichissement |
| `extract-facil.ts` | Extracteur et synchronisation de la source `facil` (Services FACiLes) : catégorie par logiciel et URL des services remplacés dans ses tables |
| `extract-charles.ts` | Extracteur et synchronisation de la source `charles` (alternatives européennes de l'extension Charles) : catégories, pays, tarifs et caractéristiques dans ses tables, description composée, cinq catégories déclarées |
| `ajouter.ts` | Ajout à la main d'un outil qui ne vient pas d'un répertoire extrait, avec sa source (`sources.json`) |
| `sources.ts`, `openhub.ts` | Les sources des outils (validation, écriture de `sources.json`) et la lecture des données publiques d'Open Hub |
| `logiciel.ts` | Le logiciel derrière un outil : page d'enrichissement et nom de logiciel (service instance d'un logiciel), renvois `voir_aussi` |
| `sommaire.ts`, `sommaire.md`, `graphiques/` | Le script du sommaire statistique, le sommaire qu'il a généré et les graphiques (SVG) qu'il contient (mis à jour automatiquement par `nub run update` quand quelque chose a changé; sinon à regénérer avec `nub run sommaire`) |
| `categories.ts`, `enrichir.ts`, `prix.ts`, `statistiques.ts`, `graphiques.ts`, `fichiers.ts`, `temps.ts`, `spdx.ts`, `progress.ts`, `duree.ts`, `couleurs.ts`, `ids.ts`, `cli.ts`, `env.ts`, `agent.ts` | Modules utilisés par les scripts |
| `schemas/`, `generer-schemas.ts`, `schemas-types.ts`, `affiner-schema.ts`, `build.config.ts`, `tsconfig.schemas.json` | Les schémas JSON des cinq fichiers de données et ce qui les génère (voir [Schémas JSON](#schémas-json)) |
| `test/`, `test/donnees/` | Les tests unitaires (fixtures et dossiers temporaires, sans données) et les tests des fichiers de données réels |
| `package.json`, `nub.lock`, `tsconfig.json` | Dépendances (`dependencies` pour l'exécution, `devDependencies` pour le développement, dont `vega` et `vega-lite` qui ne servent qu'aux types), scripts npm, les deux environnements (`engines.node` pour l'exécution, `devEngines.runtime` et `devEngines.packageManager` pour le développement) et configuration TypeScript. `nub.lock` n'est lu que par nub ; `npm install` résout les versions d'après les plages de `package.json` |
| `.env.example` | Modèle du fichier `.env` : les clés OpenAI et Open Hub, avec les instructions pour les obtenir, et les réglages facultatifs des modèles et de l'effort de raisonnement |
| `.node-version` | Majeure de Node.js (`26`) pour les gestionnaires de versions qui ne lisent pas `package.json` ; `devEngines.runtime` et `engines.node` disent la même chose (`>=26 <27`), et `versions.test.ts` tient les trois d'accord |
| `LICENSE` | Texte de la licence AGPL-3.0 du code |
| `LICENSE-CC-BY-SA-4.0` | Texte de la licence CC BY-SA 4.0 des données (voir [Licences](README.md#licences)) |
| `LICENSES/`, `REUSE.toml` | Les mêmes textes de licence, nommés par identifiant SPDX (`AGPL-3.0-or-later.txt`, `CC-BY-SA-4.0.txt`, `MIT.txt`), et la déclaration de licence des fichiers sans en-tête, selon la spécification [REUSE](https://reuse.software/) (voir [Licences](README.md#licences)) |
| `site/` | Le site statique de consultation du répertoire (Astro, île SolidJS, daisyUI), sous-projet autonome avec son `package.json`, son `nub.lock` et ses tests (voir [Site de consultation](#site-de-consultation-site)) |
| `analyse-effort/` | Banc d'essai des modèles OpenAI et de l'effort de raisonnement (`banc-effort.ts`, échantillon, résultats par variante, [`analyse.md`](analyse-effort/analyse.md)), à l'origine des valeurs par défaut |
| `.claude/skills/charting-vega-lite/` | Skill Claude Code (MIT, [oaustegard/claude-skills](https://github.com/oaustegard/claude-skills)) qui guide la rédaction des spécifications Vega-Lite de `graphiques.ts` pendant le développement ; sans rôle à l'exécution |
| `README.md`, `implementation.md`, `historique.md`, `tickets/` | La documentation rédigée à la main (voir [Documentation](#documentation)) et le brouillon du ticket à ouvrir au dépôt de Charles (`tickets/charles-amont.md`) |
| `.specify/`, `.claude/skills/speckit-*/`, `specs/` | [Spec Kit](https://github.com/github/spec-kit) (MIT) : la constitution du projet (`.specify/memory/constitution.md`), les gabarits, les scripts et l'extension git, les commandes `speckit-*`, et le dossier `specs/NNN-nom/` de chaque fonctionnalité (spécification, plan, recherche, contrats, tâches), conservé après elle (voir [Fonctionnalités menées avec Spec Kit](#fonctionnalités-menées-avec-spec-kit)) |
| `.agents/skills/`, `skills-lock.json` | Skills d'agents `astro` et `daisyui` (MIT, liens symboliques depuis `.claude/skills/`) et leur fichier de verrouillage ; outils de développement, rien du projet n'en dépend à l'exécution |
| `.gitignore` | Ignore `.env`, `node_modules/`, `dist/` et `.mion/` (sorties de la génération des schémas), ainsi que `notes.md` et `services-facil.html` (fichiers de travail locaux) |

## Schémas JSON

Le dossier `schemas/` contient un [JSON Schema](https://json-schema.org/) (draft 2020-12) par fichier de données : `schemas/outils.schema.json`, `schemas/categories.schema.json`, `schemas/criteres.schema.json`, `schemas/tags.schema.json` et `schemas/sources.schema.json`. Ils décrivent la structure complète (`meta` puis le tableau de données), les valeurs permises (`source`, `changement`, `confiance`, `extracteur`, identifiants de critères), le type de chaque champ, et refusent les clés inconnues, comme le font les scripts. Chacun porte sa licence (`AGPL-3.0-or-later`) dans `$comment`, ce que les validateurs ignorent.

Ils sont générés, pas écrits à la main : les types TypeScript (`schemas-types.ts`, qui s'appuie sur `OutilClasse`, `Categorie`, `Critere`, `Tag`, `Source` et `Metadonnees`) sont convertis par [mion RunTypes](https://mion.io/runtypes) (`createJsonSchemaFn<T>()`), le générateur étant empaqueté par [obuild](https://github.com/unjs/obuild) avec le plugin RunTypes pour rolldown (`build.config.ts`). Après un changement de type, `nub run schemas` régénère les cinq fichiers, et `nub run schemas:verifier` échoue si les fichiers commités sont périmés (il est aussi lancé par `nub run test`).

Ce que les types ne disent pas est ajouté par `affiner-schema.ts`, par nom de champ : `score` entier de 0 à 3, `echecs_enrichissement`, `echecs_confirmation` et `echecs_openhub` entiers d'au moins 1, `tags` de 1 à 5 identifiants distincts, `criteres` d'au plus 3 identifiants distincts, `alternative_a` (URL) et `voir_aussi` (noms d'outils) d'au moins un élément distinct, `pays` en deux lettres majuscules, dates `derniere_modification`, `enrichi_le`, `created_at` et `updated_at` au format ISO 8601 avec décalage, `lien`, `url`, `pdc` et `donnees` des sources en URL http(s), courriel de `soumis_par` à la forme usuelle, identifiants (`id`, et `categorie` et `source_repertoire_id` des outils) en slug. La relation entre `outils[].categorie` et `categories[].id` de `categories.json` ne peut pas s'exprimer en JSON Schema : le schéma des outils l'annote (`$comment`) et impose le même motif, et `donnees/outils.test.ts` vérifie sur les vrais fichiers que chaque valeur existe et que chaque catégorie est utilisée. Les règles qui croisent plusieurs champs ou fichiers (licence SPDX valide, `custom_license` exclusif avec `licence`, tags présents dans `tags.json`, `score` égal au nombre de critères) ne sont pas dans les schémas : elles restent dans les scripts et les tests.

Les schémas valent pour du JSON ordinaire : les types du dépôt (chaînes, nombres, booléens, tableaux, `null`, valeurs littérales, objets) donnent le même JSON que celui du fichier. Si un champ devait un jour utiliser `Date`, `Map` ou une union contenant un `Date`, le schéma de RunTypes décrirait son propre encodage (tableaux étiquetés) et non le JSON naturel : à éviter dans les fichiers de données. Pour valider un fichier avec [Ajv](https://ajv.js.org/), utiliser `Ajv2020` (voir `test/schemas.test.ts`). Les versions de RunTypes (`@mionjs/*` 0.14.0) et d'obuild sont figées dans `package.json` : RunTypes n'a pas encore atteint la version 1.0.

## Scripts

Sept scripts se lancent avec `node` (ou `nub`) : `update.ts` et `sommaire.ts` (usage courant), `extract-facil.ts` (source FACiL), `extract-charles.ts` (source Charles) et `ajouter.ts` (ajout manuel), `extract.ts` et `classify.ts` (opérations exceptionnelles); `generer-schemas.ts` est un huitième programme, qui ne se lance que par `nub run schemas` (il doit d'abord être empaqueté, voir plus bas); les autres fichiers sont des modules, utilisés par les scripts et par les tests. Tout est en TypeScript. Les fonctions principales sont exportées pour être réutilisables; le code de ligne de commande ne s'exécute que lorsque le script est lancé directement.

### `extract.ts`

```sh
nub extract.ts [--force] <outils.json> [criteres.json] [url]
```

Télécharge la page en ligne (`[url]`, par défaut celle du répertoire) et écrit les outils, les catégories (`categories.json`, à côté de `outils.json` : id, nom et icône, en conservant les descriptions existantes) et, si demandé, les critères. Utilise [linkedom](https://github.com/WebReflection/linkedom) pour interroger le DOM. Lit la date de modification affichée sur la page (heure de l'Est) et lui ajoute le décalage de Toronto; refuse une page sans date ou contenant deux outils de même nom. Un échec de téléchargement (réseau, erreur HTTP) n'écrit rien.

Si `criteres.json` est donné, il est réécrit lui aussi, sans protection : il ne dépend que de la page.

Les outils sont écrits **sans** classification ni enrichissement, et le fichier de sortie est **entièrement remplacé**. Sans `--force`, le script refuse d'écraser un `outils.json` qui contient des champs d'enrichissement ou un historique de changement (`changement`, `removed`), ou qui n'a pas le format attendu (il pourrait contenir du travail). Voir [Importer ou réimporter depuis le web](#importer-ou-réimporter-depuis-le-web).

### `classify.ts`

```sh
nub classify.ts <outils.json> [sortie.json]
```

Ajoute `criteres` et `confiance` à chaque outil (réécrit `outils.json` en place si aucune sortie n'est donnée), en gardant tous les autres champs. `meta.updated_at` ne change que si le contenu change. Voir [Classification](#classification). Une option inconnue est refusée. Sans script npm : `nub classify.ts outils.json`, à lancer après un changement des règles de classification.

### `confirmer.ts`

Module de la vérification des critères, appelé par `update.ts` après l'enrichissement pour chaque outil enrichi qui n'a pas encore de `criteres_confirmes` (fonctions `confirmerOutils`, `validerConfirmation`, `champConfirmes`, `estimerCoutConfirmation`). Pour chaque outil, il donne au modèle (OpenAI, le même que l'enrichissement, `OPENAI_MODEL`, avec le même repli) la page de l'outil (ou celle de son logiciel, pour un service : voir [`logiciel.ts`](#logicielts)) et les trois critères, **sans le score ni les critères du répertoire**, et lui demande, critère par critère, « confirmé », « infirmé » ou « indéterminé », avec une **citation copiée mot pour mot** des textes fournis (description, titre, méta-description et extrait de la page). Une citation introuvable rejette la réponse, redemandée une fois avec la raison (au modèle de repli s'il y en a un, dont le nom est alors inscrit dans `modele`) ; deux rejets, ou une page illisible, comptent un échec (`echecs_confirmation`, abandon après `--max-echecs`, comme l'enrichissement). La **règle A** précise la lecture de « contrôle » : la nationalité mentionnée suffit (« confirmé » pour un outil canadien ou québécois, « infirmé » pour une origine étrangère ou une filiale étrangère, « indéterminé » sans mention) ; sans elle, deux modèles divergeaient sur ce critère pour 21 outils sur 57. Le verdict est inscrit en place avec le modèle et la date ; un outil vérifié n'est jamais refait (pour le refaire, supprimer son `criteres_confirmes`). Le [sommaire](#génération-du-sommaire-statistique) l'exploite : une sous-section et un graphique donnent la part des critères confirmés, infirmés et indéterminés par statut du code source.

Résultats de la vérification des 57 outils enrichis (réimport du 2026-11-12, `gpt-6-astra`, alors le modèle par défaut, règle A, un appel par outil, aucune citation rejetée) : « données » confirmé pour 45 et indéterminé pour 12 ; « contrôle » confirmé pour 26, infirmé pour 30, indéterminé pour 1 ; « dépendance » confirmé pour 25, infirmé pour 2, indéterminé pour 30. Aucun outil n'a plus de critères confirmés que d'étoiles ; 32 en ont autant. La vérification de l'import précédent, le matin même (57 appels, 105 927 jetons en entrée et 8 710 en sortie, 1,49 $), avait donné les mêmes verdicts sur « données » et « contrôle » et ne différait que pour trois outils sur « dépendance » ; une vérification parallèle par un second modèle (Claude, même règle) avait alors donné le même statut pour « contrôle » sur les 57 outils, pour « données » sur 56 et pour « dépendance » sur 49, et les mêmes ensembles de critères confirmés pour 49 outils sur 57 (voir [historique.md](historique.md)). Les 22 services FACiL, vérifiés le 2026-11-13 par `gpt-6.1-sol` d'après la page de leur logiciel : « données » confirmé pour 12, « dépendance » pour 8, « contrôle » indéterminé pour tous (la page d'un logiciel ne dit pas qui héberge le service) ; 7 ont autant de critères confirmés que leur score estimé.

### `update.ts`

```sh
nub update.ts [--dry-run] [--sans-couleur] [--nouveaux-tags] [--max-echecs=N] [--accepter-couts] [outils.json] [url]
```

Télécharge la page en ligne (`[url]`, par défaut celle du répertoire; le même téléchargement qu'`extract.ts`), la compare à `outils.json` (par défaut `./outils.json`) et met le fichier à jour. **Si `outils.json` n'existe pas, c'est l'import initial** : tous les outils de la page sont écrits avec `changement: "nouveau"` et la date de la page, et une ligne « Import initial » le dit. `criteres.json` et `categories.json`, dans le même dossier, sont écrits eux aussi à chaque exécution (les catégories de la page, avec les descriptions déjà connues, puis celles qu'un autre extracteur a déclarées avec `source_repertoire_id`, conservées telles quelles), et une ligne le signale quand leur contenu change (ou s'ils sont créés). Un `outils.json` au mauvais format est refusé, pas remplacé. `--dry-run` affiche les changements sans écrire (et le rappelle par une ligne « Simulation »). Pour chaque outil :

- absent du fichier : `changement: "nouveau"`;
- marqué `removed` et de retour sur la page : `"comeback"`, et `removed` disparaît;
- catégorie (identifiant), score, lien, description ou pays différents : `"modification"` (un changement d'icône seul est invisible ; le score d'un outil au score estimé n'est pas comparé, puisqu'il ne vient pas de la page);
- absent de la page : `"retrait"` et `removed: true`, l'entrée est conservée;
- identique : rien ne change, ni sa date ni son `changement`.

Les outils nouveaux, modifiés, retirés ou de retour reçoivent la date de modification de la page; les nouveaux, modifiés et de retour sont reclassés. Les champs d'enrichissement d'un outil survivent à une modification ou à un retour, mais ils ne sont pas recalculés (voir la dernière remarque de [Importer ou réimporter](#importer-ou-réimporter-depuis-le-web)). Le fichier n'est réécrit que s'il y a au moins un changement, un outil sans source à rattacher à Praxis ou un renvoi `voir_aussi` à mettre à jour (voir [`logiciel.ts`](#logicielts)); `meta.updated_at` est alors mis à jour, et `tags.json` aussi quand de nouveaux tags s'ajoutent.

La synchronisation est suivie de l'[enrichissement](#enrichissement-par-ia) de tous les outils qui ne le sont pas encore (sans option : dès qu'il y a de nouvelles données), qui lit `tags.json` et `criteres.json` dans le même dossier que `outils.json`. Une option inconnue est refusée.

**Aperçu, estimation et confirmation.** Avant d'écrire quoi que ce soit, `update` calcule ce qu'il ferait et l'affiche : les changements, les outils à enrichir (et ceux abandonnés après trop d'échecs), puis une **estimation des jetons et du coût** (borne haute : 3 caractères par jeton, un extrait de page de 6 000 caractères et un second appel pour l'explication de l'écart pour chaque outil, plus un appel pour le résumé du sommaire), au prix du modèle principal (`prix.ts`), suivie du scénario extrême du repli (« si chaque appel devait être repris par … : jusqu'à … de plus », les mêmes jetons au prix du repli). Le modèle et le repli sont affichés en tête (« Modèle OpenAI : … ; repli : … »). Avec `--dry-run`, il s'arrête là. Au **premier import** (pas de `outils.json`) avec des outils à enrichir, il demande confirmation dans le terminal : « 1. poursuivre en acceptant les coûts OpenAI », « 2. arrêter » (2 par défaut ; l'aperçu et l'estimation étant déjà affichés, une réponse « simulation » n'ajouterait rien) ; hors terminal (script, CI), il s'arrête avec le code 1 et demande `--accepter-couts`, qui vaut la réponse 1. Les exécutions suivantes n'interrompent plus : les coûts ont été acceptés une fois, et `--dry-run` reste disponible pour les chiffrer. Sans clé `OPENAI_API_KEY`, la synchronisation est écrite et l'enrichissement et la vérification sont sautés avec un avertissement jaune (les outils restent à enrichir ou à vérifier).

**Vérification des critères.** Après l'enrichissement, `update` vérifie les critères de chaque outil enrichi qui n'a pas encore de `criteres_confirmes` (voir [`confirmer.ts`](#confirmerts)) : un appel par outil, compté dans l'estimation de `--dry-run` (« vérification des critères de N outil(s) ») et dans le coût affiché à la fin, échecs comptés dans `echecs_confirmation`. Une vérification réussie compte comme un changement et déclenche le sommaire.

**Open Hub.** Ensuite, `update` cherche sur Open Hub chaque outil enrichi au code public qui n'a pas encore de champ `openhub` (voir [`openhub.ts`](#openhubts)) : l'aperçu l'annonce (« Open Hub : N outil(s) libre(s) à chercher »), l'étape est gratuite et a sa barre de progression. Sans `OPENHUB_API_KEY`, un avertissement jaune dit « Open Hub sauté » et le reste se poursuit. Un outil complété déclenche le sommaire.

**Descriptions des catégories.** Puis `update` rédige, avec le même modèle, la description de chaque catégorie de `categories.json` qui n'en a pas encore (voir [`categories.ts`](#categoriests)) : un appel par catégorie, compté dans l'estimation et le coût, redemandé une fois (au repli) si la réponse est invalide, sans compteur d'échecs (retentée à chaque `update`). Une description ajoutée déclenche le sommaire.

**Sommaire automatique.** Hors `--dry-run`, `update.ts` met à jour le [sommaire](#génération-du-sommaire-statistique) à la fin de l'exécution, **seulement si quelque chose a changé** : au moins un outil nouveau, modifié, retiré ou de retour, une description de catégorie ajoutée, ou au moins un outil enrichi, vérifié ou complété par Open Hub. Une page inchangée sans enrichissement ne fait rien.

La mise à jour demande la clé `OPENAI_API_KEY` (pour le résumé) et `vl-convert` (pour les graphiques), et prend de 10 à 30 secondes (un appel pour le résumé, neuf conversions). Deux garde-fous évitent d'abîmer un bon sommaire :

- si la clé ou `vl-convert` manque, un avertissement jaune le dit, le sommaire n'est pas touché et le code de sortie n'est pas modifié; il reste à lancer `nub run sommaire` après avoir réglé le problème;
- si le résumé ne peut pas être rédigé (erreur de l'API, réponses invalides), le sommaire existant et ses graphiques sont conservés tels quels, un message rouge l'explique et le code de sortie est 1. (Lancé directement, `nub run sommaire` écrit au contraire un sommaire avec une note à la place du résumé.)

**Couleurs.** Dans un terminal, `update.ts` colore ses messages pour les rendre plus lisibles :

| Couleur | Sens |
|---|---|
| Vert | Succès et rien à signaler : `nouveau`, outil enrichi, « 0 changement(s) », « 0 échec » |
| Jaune | À regarder : `modification`, avertissement (page inaccessible, réponse rejetée, évaluation différente du répertoire, enrichissement ou sommaire sauté) |
| Rouge | `retrait`, échec d'un outil, erreur |
| Magenta | `comeback` |
| Cyan | Les dates, les listes d'outils à enrichir, les nouveaux tags et le nom de l'outil en cours sur la barre |
| Atténué | Les messages secondaires : simulation, « Enrichissement de … » hors terminal, partie vide de la barre |

Le résumé (stdout) et le journal avec la barre de progression (stderr) sont colorés **séparément** : si l'un est redirigé vers un fichier, il reste sans couleur pendant que l'autre en garde. Hors terminal, le texte est identique, sans aucun code de couleur. `--sans-couleur` ou la variable `NO_COLOR` désactivent les couleurs (y compris celle de « Erreur: »), `FORCE_COLOR` les impose même hors terminal (sauf `0` ou `false`), et un terminal `TERM=dumb` n'en a pas. Seuls `update.ts`, `extract-facil.ts`, `extract-charles.ts` et la barre de `sommaire.ts` sont colorés, ainsi que le mot « Erreur: » de tous les scripts.

### `sommaire.ts`

```sh
nub sommaire.ts [--sans-resume] [--sans-graphiques] [--sans-couleur] [outils.json] [sommaire.md]
```

Écrit `sommaire.md` (par défaut dans le dossier de `outils.json`) et, à côté, le dossier `graphiques/` : voir [Sommaire statistique](#génération-du-sommaire-statistique). Une barre de progression sur stderr (comme celle d'`update`, avec le temps restant estimé) suit les étapes : le résumé, chaque graphique (son titre en étiquette), puis l'écriture du sommaire ; hors terminal, des lignes de pourcentage. `--sans-couleur` la laisse sans couleur. La fonction exportée `genererSommaire` fait ce travail ; `update.ts` l'appelle après un enrichissement, avec sa propre barre (option `progression`, une fabrique de barre injectable, absente dans les tests).

### `categories.ts`

Les catégories (`categories.json`) : `slug(nom)` donne l'identifiant (minuscules sans accents, mots séparés par un tiret), `categoriesDepuis` construit la liste depuis la page (ordre d'apparition, sans doublon, descriptions existantes conservées, erreur si deux noms donnent le même identifiant ; les catégories déclarées par un extracteur, qui portent `source_repertoire_id`, sont conservées après, dans leur ordre, et ne peuvent pas prendre l'identifiant d'une catégorie de la page), `categoriesAvec` ajoute ou met à jour celles qu'un extracteur déclare (description conservée, `source_repertoire_id` et slug exigés), `nomCategorie` retrouve le nom à partir de l'identifiant (pour les consignes envoyées au modèle), et `decrireCategories` rédige par IA les descriptions manquantes : une à trois phrases en français (40 à 400 caractères, texte continu, sans HTML ni tiret cadratin), à partir du nom, de l'icône et des outils de la catégorie, validées puis écrites en place. `estimerCoutDescriptions` chiffre les appels pour `--dry-run`.

### `enrichir.ts`

Module de l'enrichissement : lecture de la page de l'outil, requêtes à l'API OpenAI, validation des réponses (`validerProposition`, `validerEcart`) et boucle `enrichirOutils`. Cette boucle reçoit ses générateurs en paramètres, ce qui permet de la tester sans réseau.

### `statistiques.ts`

Le calcul des statistiques du répertoire (`calculerStatistiques`), sans entrée-sortie : statuts du code source, licences et familles, forges, tags, critères par statut, dates. Il alimente le sommaire et les graphiques.

### `graphiques.ts`

Les graphiques du sommaire. `construireGraphiques(statistiques)` produit des spécifications [Vega-Lite](https://vega.github.io/vega-lite/) (calcul pur, avec les données incluses dans chaque spécification), et `ecrireGraphiques` les convertit en SVG avec [vl-convert](https://github.com/vega/vl-convert). Les paquets `vega-lite` et `vega` fournissent les types TypeScript des spécifications.

### `fichiers.ts`

Lecture et écriture des cinq fichiers de données : `lireFichier`, `lireSiExiste` et `ecrireFichier` maintiennent `meta` (`data_license`, `created_at`, `updated_at`), décrit dans [Fichiers JSON](README.md#fichiers-json). La lecture est stricte : `lireFichier` refuse un fichier au mauvais format. `lireSiExiste`, que `update` emploie pour `criteres.json`, `categories.json` et `sources.json`, rend `null` pour un fichier absent comme pour un fichier invalide, qui est alors réécrit. Tous les scripts qui lisent ou écrivent ces fichiers passent par ce module.

### `temps.ts`

Les dates et heures, toujours en heure de Toronto : `horodatage()` donne le moment présent (`2026-11-11T16:42:07-05:00`), `localVersIso()` ajoute à une date locale le décalage qui s'applique ce jour-là (heure d'été comprise). Sans dépendance : le calcul passe par `Intl`.

### `spdx.ts`

`problemeLicenceSpdx(texte)` vérifie qu'une licence est une expression SPDX valide (avec [spdx-expression-parse](https://www.npmjs.com/package/spdx-expression-parse)) et retourne le problème, ou `null`. Sont refusés :

- les noms en toutes lettres (« GNU Affero General Public License v3.0 ») et une casse incorrecte;
- les identifiants inexistants (`BSL-1.1`; le bon est `BUSL-1.1`);
- les identifiants dépréciés ou ambigus (`GPL-3.0`, `GPL-2.0+` : écrire `-only` ou `-or-later`);
- les `LicenseRef-` maison, absents de la liste SPDX. Une telle licence se décrit plutôt dans `custom_license` (nom ou identifiant) et `custom_license_url` (URL du texte, si disponible), avec `licence` à `null`.

### `progress.ts`

Barre de progression minimale sur une ligne, sans dépendance : `createProgress(total, options)` retourne `update(valeur, étiquette?)` (l'étiquette, par exemple l'outil en cours, s'affiche après le pourcentage), `message(texte)` (écrit une ligne au-dessus de la barre sans l'abîmer) et `end()`. Écrit sur stderr par défaut. L'option facultative `paint` colore les parties de la barre (rempli, vide, étiquette) sans changer sa largeur. L'option `restant` (un formateur de durée, `formaterDuree` de `duree.ts`) ajoute après le pourcentage le temps restant estimé, « (reste ≈ 12 min) », au rythme moyen observé depuis le début de la barre : rien avant la première unité terminée ni à la fin, et omis si l'écran est trop étroit ; hors terminal, il figure sur les lignes de pourcentage. `update` l'affiche pour l'enrichissement, la vérification des critères, la recherche Open Hub, les descriptions de catégories et la mise à jour du sommaire, et `sommaire.ts` pour sa propre exécution (`barreSommaire`).

### `duree.ts`

`formaterDuree(ms)` écrit une durée en français (« 45 s », « 13 min », « 1 h et 5 min », « 3 j et 1 h ») : arrondie à la seconde sous la minute, à la minute au-delà, jours de 24 heures, espaces ordinaires. `estimerRestant({ ecoule, traites, total })` extrapole le temps restant au rythme moyen (null tant que rien n'est terminé). Sans dépendance : `Temporal.Duration` (arrondi et équilibrage des unités) et `Intl.DurationFormat` (libellés de la locale `fr-CA`), natifs dans Node.js 26.

### `couleurs.ts`

Couleurs ANSI sans dépendance : `couleursActives(flux, env, sansCouleur)` décide si un flux doit être coloré (terminal, `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb`, voir [`update.ts`](#updatets)), et `creerCouleurs(actif)` donne les fonctions `gras`, `attenue`, `rouge`, `vert`, `jaune`, `magenta` et `cyan`, qui rendent le texte tel quel quand les couleurs sont inactives.

### `cli.ts`

`lancer(principal)` exécute le corps d'un script en ligne de commande : toute erreur (option invalide, fichier manquant, réseau, erreur HTTP) s'affiche en un message clair (`Erreur: …`, en rouge dans un terminal), sans trace de pile, et donne le code de sortie 1. Utilisé par les sept scripts lancés avec `node` ; `generer-schemas.ts` et `analyse-effort/banc-effort.ts` gèrent leurs erreurs eux-mêmes.

### `agent.ts`

L'en-tête `User-Agent` de toutes les requêtes HTTP du projet (page de Praxis, page des Services FACiLes, pages des outils lues par `enrichir` et `confirmer`, fichiers et API GitLab de Charles, API d'Open Hub, API d'OpenAI) : un navigateur courant (`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36`), car certains sites refusent les clients sans en-tête de navigateur, puis `nom/version` et le contact `Nom <courriel>` lus dans `package.json` (`name`, `version`, `author`), pour qu'un administrateur sache qui lit ses pages et puisse écrire. `USER_AGENT` est calculé au chargement ; `enTetes(autres)` le place devant les en-têtes propres à chaque requête (`accept`, `authorization`).

### `env.ts`

`chargerEnv(chemin = ".env")` charge le fichier `.env` du dossier courant dans `process.env` (`process.loadEnvFile`), pour que `update.ts` et `sommaire.ts` trouvent `OPENAI_API_KEY` et `OPENAI_MODEL` lancés par `node` seul. Un fichier absent n'est pas une erreur ; toute autre erreur l'est. Une variable déjà présente dans l'environnement n'est jamais écrasée, donc nub, qui charge aussi `.env`, et `node` donnent le même résultat.

### `extract-facil.ts`

```sh
node extract-facil.ts [--fichier=page.html] [--sans-couleur] [outils.json] [url]
```

Lit la page des [Services FACiLes](https://facil.services/) (téléchargée avec le User-Agent du projet, voir [`agent.ts`](#agentts), car le site refuse les clients sans en-tête de navigateur ; ou une copie locale par `--fichier`) : un bloc par service, avec le nom et le lien, une phrase de description, « Est une instance de : … » (`instance_de`, nom et lien vers le dépôt ou la version) et « Remplace : … » (`alternative_a`, convertis en URL par la table `ALTERNATIVES` ; un nom inconnu est signalé en avertissement et omis). La page n'a ni étoiles ni catégories : le score est estimé (`score_estime`, classification par seuil, puis alignement sur l'évaluation enrichie par `update`) et la catégorie vient de `CATEGORIE_PAR_LOGICIEL` (logiciel sous-jacent, en minuscules), à réviser à la main ; un logiciel inconnu arrête l'extraction en nommant les services concernés. La synchronisation est celle de `update` (`mettreAJour` pour la source `facil` : nouveau, modification, retrait, comeback, datés de la lecture, puisque la page n'affiche pas de date), sans toucher aux outils des autres sources ; `sources.json` reçoit la source `facil` (politique de confidentialité et page des données de FACiL). Les outils nouveaux sont enrichis par `node update.ts` comme les autres.

### `extract-charles.ts`

```sh
node extract-charles.ts [--dossier=/chemin/du/clone] [--sans-couleur] [outils.json] [url]
```

Lit les données de [Charles](https://gitlab.com/yaniskerdjana/charles), une extension Chrome qui propose des alternatives européennes aux services américains : `data/alternatives.json` (nom, lien, pays, catégorie, tarif, caractéristiques), `data/sites-us.json` (les sites américains et les alternatives qui les remplacent) et `data/categories.json`, téléchargés tels quels depuis la branche `main` du dépôt (fichiers bruts, User-Agent du projet), avec la date du dernier commit touchant `data/` (API publique de GitLab, sans clé) comme `derniere_modification` ; si l'API ne répond pas, les outils sont datés de la lecture, avec un avertissement. `--dossier` lit un clone local (tests, hors ligne), daté de la lecture. La source n'a ni description, ni étoiles, ni dépôt :

- la **catégorie** vient de `CATEGORIE_PAR_CATEGORIE` (une catégorie du répertoire pour chacune des 24 de l'extension) et de `CATEGORIE_PAR_ID` (exceptions par alternative : Anytype en veille, GitLab et Codeberg en gestion de projets comme Code FACiLe, CoreUpdate en sécurité ; `null` exclut l'alternative, ce qui est le cas de Plans d'Apple, américain selon la source) ; cinq catégories que la page Praxis n'a pas (`CATEGORIES_CHARLES` : paiement en ligne, assistants d'intelligence artificielle, hébergement Web et infrastructure, commerce en ligne, diffusion audio et vidéo) sont ajoutées à `categories.json` avec `source_repertoire_id: "charles"` dès qu'un outil les utilise ; une catégorie de l'extension absente de la table arrête l'extraction en la nommant ;
- la **description** est composée en français : « X est une alternative européenne recensée par Charles, d'origine française, gratuite avec des options payantes. Caractéristiques : auto-hébergeable, open source, hébergé dans l'Union européenne. Proposée en remplacement de Dropbox et Google Drive. » (tables `PAYS`, `TARIF` et `CARACTERISTIQUES`, qui reprennent les mots-clés de `classify.ts` pour que la classification par seuil reste cohérente ; un pays, un tarif ou une caractéristique inconnus sont signalés en avertissement et omis) ;
- le **score** est estimé (`score_estime`, classification par seuil, puis alignement sur l'évaluation enrichie par `update`) ;
- `alternative_a` vient de `sites-us.json` inversé : l'URL du premier domaine de chaque site qui liste l'alternative (une alternative qu'aucun site ne propose, comme Matomo et Plausible, est signalée) ;
- le **lien** est `url`, sauf pour les alternatives de `LIEN_PAR_ID`, dont l'URL de la source est morte (Infomaniak kDrive et La Suite répondent 404) : la table donne la page actuelle, à retirer dès que la source est corrigée (voir `tickets/charles-amont.md`) ; un lien corrigé compte comme une modification à l'import ;
- `pays` reprend `country` tel quel (ISO 3166-1 alpha-2, ou « EU », « UK » ; le schéma impose deux lettres majuscules) ; `enrichir` et `confirmer` le transmettent au modèle comme une affirmation de la source, et le sommaire compte les outils par pays.

Une alternative qui porte le nom d'un outil actif d'une autre source (clé de `logiciel.ts` : casse et espaces ignorés ; dix cas avec Praxis, dont Nextcloud, Mastodon et CryptPad) n'est **pas importée**, puisque `nom` est la clé unique de `outils.json` : le résumé les liste. La synchronisation est celle de `update` (`mettreAJour` pour la source `charles`), sans toucher aux outils des autres sources ; `sources.json` reçoit la source `charles` et `categories.json` les catégories déclarées utilisées (`categoriesAvec`). Les outils nouveaux sont enrichis par `node update.ts` comme les autres.

### `ajouter.ts`

```sh
node ajouter.ts <lien> --nom=… --categorie=<id> --description=… --source=<id> [--score=N] [--alternative-a=url,…] [--source-nom=… --source-url=… --source-pdc=… --source-donnees=… --soumis-par-nom=… --soumis-par-url=… --soumis-par-email=…] [outils.json]
```

Ajoute un outil qui ne vient pas d'un répertoire extrait : la description est rédigée par la personne qui l'ajoute, la catégorie doit exister dans `categories.json`, le nom doit être libre. `--source` nomme sa source (`sources.json`) ; si elle n'existe pas, `--source-nom` et `--source-url` la créent (extracteur `manuel`), avec `--source-pdc`, `--source-donnees` et `--soumis-par-*` facultatifs (le courriel est validé). Sans `--score`, l'outil reçoit `score_estime` : score et critères viennent d'abord de la classification par seuil de la description (`classer` sans score, confiance « indéterminée »), puis `update`, à l'enrichissement, les remplace par ceux de l'évaluation enrichie (sans explication d'écart, puisqu'il n'y a pas d'étoiles de référence). L'outil est écrit avec `changement: "nouveau"` et la date du moment ; `update` l'enrichit ensuite et ne le retire jamais, puisqu'il n'appartient pas à la source Praxis.

### `logiciel.ts`

Un service hébergé (Services FACiLes) est une instance d'un logiciel libre (`instance_de`), et c'est ce logiciel qu'il faut décrire : `pageEnrichissement` donne la page à lire (le dépôt de `instance_de.url` ramené à sa racine pour GitHub, Codeberg, Bitbucket, GitLab, Framagit et les forges auto-hébergées `gitlab.*`, `git.*`, `forge.*`, `gitea.*` ; la page telle quelle hors forge ; sinon `lien`) et `nomLogiciel` le nom à chercher (`instance_de.nom`, sinon `nom`). `enrichir` et `confirmer` lisent cette page et ajoutent `instance_de` et `page_lue` à la fiche envoyée au modèle, avec une consigne qui distingue le service de son logiciel (la fiche d'`enrichir` reçoit aussi `voir_aussi`, que la description longue peut mentionner en une phrase) ; `openhub` cherche le logiciel et concorde sur son dépôt (un lien sur une forge est comparé comme un dépôt, jamais par son hôte). `lierVoirAussi` pose `voir_aussi` sur chaque outil actif (les autres outils actifs du même logiciel, casse et espaces ignorés, dans l'ordre du fichier ; absent sans renvoi) et compte les outils dont le renvoi change : `mettreAJour` l'applique à chaque synchronisation (un renvoi à mettre à jour suffit à réécrire `outils.json`), `ajouter.ts` à chaque ajout.

### `sources.ts`

Les sources (`sources.json`) : `Source` (`id`, `nom`, `url`, `extracteur`, `pdc?`, `donnees?`, `soumis_par?`), `SOURCE_PRAXIS`, `problemesSource` (slug, URL http(s), courriel), `sourcesAvec` (ajout ou mise à jour), `chargerSources`, `sauverSources`. `update` crée le fichier avec Praxis s'il manque et rattache à Praxis les outils sans `source_repertoire_id` (données d'avant ce champ).

### `openhub.ts`

Données publiques d'[Open Hub](https://www.openhub.net/) par son API XML (`OPENHUB_API_KEY`, 1 000 requêtes par jour, lecture seule). Pour chaque outil enrichi au code public sans `openhub` (`aCompleterOpenHub`) : recherche par le nom du logiciel (`p.xml?query=` ; `nomLogiciel` de [`logiciel.ts`](#logicielts) : `instance_de.nom` pour un service), puis concordance sûre, dans l'ordre : même hôte entre la page d'accueil Open Hub et la page de l'outil (`lien`, ou le dépôt du logiciel pour un service), sauf quand cette page est elle-même sur une forge, où l'hôte ne distingue rien ; même dépôt, ou même organisation sur une forge (GitHub, GitLab, Codeberg, Framagit, Bitbucket, SourceHut), entre un lien ou la page d'accueil Open Hub et `repo` (ou cette page de forge) ; sinon, pour les trois premiers candidats, leurs dépôts (`enlistments.xml`) comparés de la même façon. Sans concordance, rien n'est écrit : le journal donne les meilleurs candidats (nom, nom court, page) et `echecs_openhub` est incrémenté (abandon à `--max-echecs`, comme l'enrichissement). Avec concordance, le projet est lu avec son analyse (`p/<id>.xml`) et `openhub_id` et `openhub` sont inscrits ; le journal rappelle les licences déclarées sur Open Hub, à comparer à `licence`. `update` l'exécute après la vérification des critères, avec une barre de progression ; `--dry-run` compte les requêtes prévues (au plus cinq par outil).

### `ids.ts`

Module partagé : les trois identifiants de critères (`donnees`, `controle`, `dependance`) et la correspondance icône → id utilisée par `extract.ts`, car la page n'identifie les critères que par leur icône, et `ID_PRAXIS`, l'identifiant de la source du répertoire.

### `generer-schemas.ts`

Génère `schemas/*.schema.json` à partir des types de `schemas-types.ts` avec `createJsonSchemaFn<T>()` de RunTypes, en mode `portable` (sans les mots-clés propres à RunTypes), puis applique `affiner()` (de `affiner-schema.ts`). Il ne s'exécute pas directement : les appels `createJsonSchemaFn<T>()` ne fonctionnent qu'après la transformation du plugin RunTypes, donc `nub run schemas` empaquette d'abord le script avec obuild (`dist/generer-schemas.mjs`, ignoré par git, avec un fichier `THIRD-PARTY-LICENSES.md.gz` que produit obuild) puis l'exécute. `--verifier` n'écrit rien et échoue si un schéma commité diffère de celui que les types produisent. Le plugin écrit aussi des fichiers intermédiaires dans `.mion/` (ignoré par git). `tsconfig.schemas.json` limite la compilation du plugin au seul point d'entrée.

## Classification

La page ne dit pas quelle étoile correspond à quel critère. `classify.ts` le déduit des descriptions :

1. Des règles (expressions régulières) mesurent, pour chaque critère, la force des indices dans la description : « auto-hébergé » ou « au Canada » pour les données, « canadien » ou « québécois » (contre « non canadien », « international ») pour le contrôle, « pair-à-pair », « hors ligne », « libre » pour la dépendance.
2. Le `score` connu fixe le nombre de critères satisfaits : 3 étoiles = les trois critères; 2 = on écarte celui dont l'indice est le plus faible.
3. `confiance` reflète l'écart entre le dernier critère retenu et le premier écarté.

Pour une description sans score connu, la fonction exportée `classer(description)` retient les critères dont l'indice atteint un seuil (2), et la confiance est `"indéterminée"` : c'est la valeur des outils au score estimé qui ne sont pas encore enrichis (9 alternatives de Charles au 2026-11-13).

C'est une heuristique, pas une vérité : un critère retenu avec une confiance « faible » ou « moyenne » est une hypothèse (par exemple, un fournisseur canadien à 2 étoiles est supposé héberger au Canada). L'enrichissement fournit un second avis indépendant (`evaluation_enrichie`) pour repérer les cas douteux.

Le [sommaire](sommaire.md) montre l'effet de cette heuristique : dans l'état actuel du répertoire, elle attribue le critère « données » aux 60 outils de Praxis (76 outils sur 154 avec les autres sources), alors que l'évaluation enrichie ne le retient que pour une partie des outils enrichis. Les critères du répertoire sont donc des déductions prudentes à lire avec l'évaluation enrichie, pas des mesures.

### Comparaison avec l'évaluation enrichie

Sur les 57 outils enrichis de Praxis (les seuls dont les étoiles viennent de la source), `criteres` (déduit) et `evaluation_enrichie.criteres` (second avis de l'IA) concordent exactement pour 38 outils (67 %) au 2026-11-13 ; ils étaient 39 le 2026-11-12, avant que 8 outils soient ré-enrichis. Ces 38 sont **tous** les outils où l'IA retient autant de critères que d'étoiles. Pour les 19 autres, l'IA confirme **moins** de critères que d'étoiles (11 outils à 2 étoiles avec 1 critère retenu, 3 avec aucun, 5 outils à 3 étoiles avec 2) et ne retient jamais un critère que `classify.ts` a écarté. Le **choix** des critères est donc déjà au plafond : la différence vient de ce que la page de l'outil permet de confirmer, pas d'une erreur de classement, et le `score` de la source reste la référence. Une version qui produirait moins de critères que d'étoiles contredirait la source.

**Décision.** Les étoiles et les critères vérifiés ne mesurent pas la même chose : les premières sont une donnée de la source, les seconds dépendent de ce que la page de l'outil dit. Aucune règle ne peut les faire coïncider sans sacrifier l'une des deux informations. `criteres` reste donc lié aux étoiles, et les critères vérifiés sont exposés à part, dans `criteres_confirmes`, avec la citation à l'appui (voir [`outils.json`](README.md#outilsjson)). Des variantes de `classify.ts` (confiance recalibrée, retrait des critères contredits) ont été essayées sur ces 57 outils puis retirées : leurs règles avaient été choisies en regardant ces mêmes données, et aucune ne faisait mieux que cette séparation (voir [historique.md](historique.md)).

## Enrichissement par IA

`update.ts` génère, sans option, **une seule fois** par outil, les champs décrits dans [Fichiers JSON](README.md#outilsjson) : description longue, tags, `source`, `licence` (ou `custom_license`), `repo` et `evaluation_enrichie`. Un outil qui a déjà une `description_longue` n'est jamais régénéré, même si sa description courte change. Les outils retirés sont ignorés. L'enrichissement s'exécute aussi quand la page n'a pas changé. Quand tous les outils sont déjà enrichis, aucun appel d'enrichissement n'est fait et la clé n'est pas nécessaire pour cette étape (la vérification des critères, les descriptions de catégories et la mise à jour du sommaire la demandent encore, s'il leur reste du travail).

| Option | Effet |
|---|---|
| `--nouveaux-tags` | Autorise le modèle à proposer de nouveaux tags, au plus 2 par outil selon sa consigne (justification obligatoire, validée par le script); ils sont ajoutés à `tags.json` |
| `--max-echecs=N` | Nombre d'échecs consécutifs à partir duquel un outil n'est plus tenté (3 par défaut, voir `echecs_enrichissement`). Pour retenter les outils abandonnés, relancer avec une valeur plus élevée |
| `--dry-run` | Liste les outils concernés et estime les jetons et le coût, sans appeler l'API ni rien écrire |
| `--accepter-couts` | Au premier import, tient lieu de la réponse « 1 » à la confirmation (nécessaire hors terminal) |

**Conseil :** l'enrichissement coûte des appels à l'API et ne se refait pas (un outil enrichi n'est jamais régénéré). Avant de le lancer, commiter `outils.json` (l'historique Git en garde chaque état) ou en garder une copie hors du dépôt.

**Configuration :** `OPENAI_API_KEY` dans `.env` (voir `.env.example`), `OPENAI_MODEL` pour changer le modèle (`gpt-6.1-sol` par défaut), `OPENAI_MODEL_FALLBACK` pour le repli (`gpt-6-astra`) et `OPENAI_REASONING_EFFORT` pour l'effort (`low`). Compter environ 12 secondes par outil (20 avec `gpt-6-astra`).

**Confidentialité :** pour chaque outil, le script télécharge la page publique (`lien`, ou le dépôt du logiciel pour un service, voir [`logiciel.ts`](#logicielts)), en extrait le texte (limité à 6 000 caractères) et les liens vers des dépôts de code (GitHub, GitLab, Codeberg, Framagit, Bitbucket, SourceHut, SourceForge, et les hôtes `gitlab.*`, `git.*`, `forge.*` ou `gitea.*`), puis envoie à l'API OpenAI (Responses API, sortie JSON structurée) le nom, la catégorie, le lien, la description et cet extrait (et, quand l'outil les porte, `pays` et `voir_aussi` ; pour un service, `instance_de` et la page lue). Quand l'évaluation diffère du répertoire, le second appel y ajoute les deux évaluations. Les tags sont limités au vocabulaire de `tags.json`. La page est lue d'abord : voir [Pages inaccessibles ou presque vides](#pages-inaccessibles-ou-presque-vides).

**Sommaire automatique :** la mise à jour du sommaire qui suit un enrichissement envoie aussi à l'API OpenAI les statistiques et la liste des outils (nom, catégorie, score, critères, statut, licence, forge, tags, description courte), comme décrit dans [Sommaire statistique](#génération-du-sommaire-statistique).

**Validation :** chaque réponse est vérifiée avant d'être écrite :

- de 1 à 5 tags connus, sans doublon;
- URL de dépôt valide, licence SPDX valide (voir `spdx.ts`);
- licence maison cohérente : exclusive avec `licence`, URL seulement avec un nom, et un nom qui n'est pas lui-même un identifiant SPDX;
- ni dépôt, ni licence, ni licence maison pour un logiciel propriétaire;
- description longue sans image Markdown, sans HTML (balises, entités, liens entre chevrons), sans tiret cadratin et sans émoji ni émoticône;
- évaluation cohérente (score égal au nombre de critères).

Une réponse invalide est redemandée une fois, avec la raison du rejet, au modèle de repli s'il y en a un (voir [Modèle de repli](#modèle-de-repli)), puis consignée comme échec. Un outil n'est modifié que si tout son enrichissement a réussi; sinon il sera retenté à la prochaine exécution.

### Modèle de repli

Chaque appel à l'API passe par `obtenirValide` (`enrichir.ts`) : une première réponse du modèle principal, validée localement ; si elle est rejetée (réponse invalide, réponse incomplète, erreur passagère de l'API comme un HTTP 429 ou 5xx), une seconde et dernière tentative, avec la raison du rejet, par le modèle de repli (`OPENAI_MODEL_FALLBACK`) s'il est défini, sinon par le même modèle. Une erreur définitive (`ErreurDefinitive` : HTTP 400, 401, 403, 404, ou refus du modèle) remonte aussitôt, sans seconde tentative : un autre modèle n'y changerait rien. Un succès du repli est un succès ordinaire (aucun compteur d'échecs) ; l'échec des deux compte un seul échec. Le journal dit « nouvel essai avec le modèle de repli », et le modèle qui a répondu est inscrit là où le modèle est enregistré (`criteres_confirmes.modele`, résumé du sommaire). Les jetons sont comptés par modèle, chacun à son prix (`formaterCouts`, `prix.ts`), y compris ceux d'une réponse en erreur quand l'API les donne. Un repli vide, ou identique au modèle principal, désactive le mécanisme ; les pages inaccessibles ne sont jamais reprises par l'IA.

Choix des valeurs par défaut, mesuré par le [banc d'essai](analyse-effort/analyse.md) du 2026-11-12 (cinq variantes sur 20 outils, comparées aux résultats de `gpt-6-astra`) : `gpt-6.1-sol` (2 $ et 10 $ par million de jetons en entrée et en sortie) à effort `low` reproduit Astra champ par champ (20/20 sur `source`, `licence`, `repo` et l'évaluation enrichie, verdicts au plancher de bruit) pour un cinquième du prix ; `gpt-6.1-terra` (1 $ et 5 $), plus économique, laisse `licence` et `repo` à `null` quand la page ne les dit pas et retient moins de critères que les étoiles pour un tiers des outils ; l'effort (`none`, `low`, `medium`) change peu l'accord mais `low` coûte 10 à 20 % de moins que `medium`. Le repli est `gpt-6-astra` (10 $ et 50 $), qui n'intervient que sur une réponse rejetée (aucune dans le banc d'essai). Les 57 outils de Praxis ont été enrichis et vérifiés par `gpt-6-astra` ; les 22 services FACiL et les 63 alternatives de Charles, par `gpt-6.1-sol` (2026-11-13), sauf la vérification de Proton Drive, reprise par le repli `gpt-6-astra` : c'est le seul repli observé.

**Évaluation indépendante :** le modèle reçoit la description des trois critères, mais pas le score ni les critères du répertoire, pour ne pas simplement les confirmer. Quand son évaluation diffère (score ou critères), un second appel explique l'écart en 2 à 4 phrases, sans prétendre savoir laquelle des deux est correcte et en rappelant que les critères du répertoire sont eux-mêmes déduits. Cette explication, soumise aux mêmes interdits typographiques que la description longue, est inscrite dans `evaluation_enrichie.ecart`. Le `score` et les `criteres` du répertoire ne sont jamais modifiés, et les écarts sont résumés à la fin de l'exécution.

**Progression :** la barre de progression et le journal vont sur stderr; les résumés (changements, nombre d'outils enrichis, écarts, nouveaux tags) restent sur stdout. Le nom de l'outil en cours s'affiche à droite de la barre (en terminal) ou sur une ligne `Enrichissement de <outil>...` (hors terminal, où une ligne de pourcentage est aussi écrite par tranche de 10 %). Dans un terminal, la barre et le journal sont colorés (voir [Couleurs](#updatets)) : succès en vert, avertissements en jaune, échecs en rouge.

**Reprise et échecs répétés :** `outils.json` est écrit après chaque outil, enrichi, vérifié ou en échec, donc une interruption ne perd rien et une relance reprend où on s'est arrêté. Chaque échec (page inaccessible ou presque vide, deux réponses invalides) incrémente `echecs_enrichissement` sur l'outil ; à 3 échecs consécutifs (`--max-echecs=N` pour changer), l'outil est **abandonné** : `update` ne le tente plus, le dit en tête de l'enrichissement (avec le compteur), et le sommaire le compte parmi les outils restant à enrichir. Un succès retire le compteur. Le code de sortie est 1 si au moins un outil a échoué pendant l'exécution (un outil abandonné, non tenté, ne compte pas).

### Pages inaccessibles ou presque vides

La page de chaque outil est lue avant tout appel à l'API. Elle est jugée inutilisable si elle est inaccessible (erreur réseau, délai de 20 secondes dépassé, réponse HTTP non réussie comme un 403 de blocage anti-robot) ou presque vide (moins de 200 caractères de texte, par exemple un site rendu par JavaScript). Dans ce cas (exemples rencontrés : En commun, dont la page est vide parce qu'elle est générée par JavaScript, ainsi que Paperless-ngx et CIRA Canadian Shield, qui répondent par une erreur HTTP 403) :

- un **avertissement** est affiché dans le journal, avec la raison;
- l'outil n'est **pas enrichi** : aucun appel à l'API n'est fait, l'échec est consigné (code de sortie 1, `echecs_enrichissement` incrémenté) et l'outil sera retenté à la prochaine exécution, jusqu'à 3 échecs consécutifs. Un résultat bâti sur la seule description serait moins fiable (licence et dépôt tirés de la mémoire du modèle, description générique), et comme un outil enrichi n'est jamais régénéré, il serait figé;

Un outil dont la page est illisible n'est donc jamais enrichi, pour ne pas figer un résumé tiré de la mémoire du modèle. Pour refaire plus tard l'enrichissement d'un outil (page corrigée, changement de stratégie), supprimer ses champs d'enrichissement, puis relancer `nub run update` :

```sh
# à faire après un commit de outils.json (meta.updated_at sera mis à jour à la prochaine écriture par un script)
jaq '.outils |= map(if .nom == "Nom de l'\''outil" then del(.description_longue, .tags, .source, .licence, .custom_license, .custom_license_url, .repo, .evaluation_enrichie, .enrichi_le, .criteres_confirmes) else . end)' outils.json > /tmp/outils.json && mv /tmp/outils.json outils.json
```

## Génération du sommaire statistique

Le sommaire est mis à jour **automatiquement** par `update.ts` quand quelque chose a changé (voir [`update.ts`](#updatets)), et se lance aussi à la main avec `nub run sommaire`. Il analyse `outils.json` (et `tags.json`, `criteres.json`, `categories.json` et, s'il existe, `sources.json`, lus dans le même dossier) et écrit `sommaire.md`, un document en Markdown qui regroupe :

- **un résumé de 3 ou 4 paragraphes** sur le répertoire et son utilité, rédigé par l'API OpenAI;
- les **chiffres clés** (outils, catégories, scores, outils enrichis, provenance par source et scores estimés, pays de l'éditeur, libres ou partiels, nombre de licences SPDX, de forges et de tags utilisés);
- les **dates** : les outils les plus anciens et les plus récents du répertoire (`derniere_modification`), les changements détectés, et les dates d'enrichissement (premier, dernier, nombre d'outils par jour, outils enrichis sans date);
- les **catégories** (outils, enrichis, libres ou partiels, score moyen);
- le **statut du code source** (libre, partiellement libre, code source disponible, propriétaire, pas encore enrichi);
- les **licences** : par licence SPDX, par famille (copyleft fort ou faible, permissive; classement indicatif d'après l'identifiant), licences maison, et outils sans licence connue;
- les **critères de souveraineté** : nombre d'outils par critère, et critères satisfaits par statut du code source, d'abord pour le répertoire (déduits) puis pour l'évaluation enrichie, avec les écarts entre les deux, et enfin les **critères vérifiés** d'après la page de l'outil (`criteres_confirmes`) : part des critères confirmés, infirmés et indéterminés par statut du code source, modèle, outils sans verdict, outils ayant autant de critères confirmés que d'étoiles, outils ayant exactement les critères de l'évaluation enrichie;
- les **forges de code** : nombre d'outils par forge (GitHub, GitLab, Codeberg…) et logiciels libres sans dépôt connu;
- les **données Open Hub** : un tableau par outil (projet, activité, contributeurs et commits sur 12 mois, licences déclarées), les outils restant à chercher ou abandonnés, et les alternatives déclarées par la source (`alternative_a`);
- les **tags** : utilisation de chacun, tags inutilisés, moyenne par outil, paires les plus fréquentes, tags ajoutés;
- la **fiabilité** : confiance de la classification, outils restant à enrichir et outils abandonnés après des échecs répétés;
- des **graphiques**, insérés dans la section qu'ils illustrent (voir plus bas).

Tant que tous les outils ont la même date (aucune modification détectée depuis l'import), les lignes « outils les plus anciens » et « outils les plus récents » sont identiques.

Les retirés (`removed`) sont comptés à part. Les statistiques sur le statut du code source, les licences, les forges et les tags ne portent que sur les outils déjà enrichis : le sommaire dit combien il y en a, et reste valide à n'importe quel stade de l'enrichissement. Il reflète l'état du fichier au moment de l'exécution. `update` le met à jour tout seul quand quelque chose a changé. Il reste à le relancer à la main quand la mise à jour automatique a été sautée (clé ou vl-convert manquant) ou a échoué.

Le calcul est local; seul le résumé passe par le réseau. Pour le rédiger, le script envoie à l'API OpenAI toutes les statistiques et, pour chaque outil du répertoire, son nom, sa catégorie, son score, ses critères, son statut, sa licence, sa forge, ses tags et sa description courte. Le résumé est validé (3 ou 4 paragraphes de texte continu, sans liste, sans gras, sans HTML, sans tiret cadratin ni émoji; redemandé une fois avec la raison du rejet, au modèle de repli s'il y en a un), puis inscrit dans le sommaire avec le nom du modèle qui l'a rédigé et la date, et la mention qu'il est à relire. Si la rédaction échoue, le sommaire, lancé directement, est tout de même écrit avec une note à la place du résumé, et le code de sortie est 1 (la mise à jour automatique, elle, conserve l'ancien sommaire).

| Option | Effet |
|---|---|
| `--sans-resume` | Omet le résumé : aucun appel à l'API, aucune clé nécessaire |
| `--sans-graphiques` | Omet les graphiques : vl-convert n'est pas nécessaire, et le dossier `graphiques/` n'est pas touché (il garde les images des exécutions précédentes, que le nouveau sommaire n'insère pas) |

### Graphiques

Les graphiques sont des spécifications Vega-Lite construites à partir des statistiques, puis converties par **vl-convert** en **SVG** (images vectorielles, dans `graphiques/`, insérées dans `sommaire.md`). Les SVG sont autonomes (texte et formes, sans script ni ressource externe), ce que GitHub et les autres forges affichent dans le Markdown ; aucun PNG n'est produit, et un PNG laissé par une version antérieure est supprimé. Les nombres et les axes sont en français (locale `fr-CA`), et un statut du code source garde la même couleur dans tous les graphiques (palette Okabe-Ito, lisible par les personnes daltoniennes).

| Fichier (`graphiques/…`) | Contenu | Section |
|---|---|---|
| `statut-code-source` | Outils par statut du code source (aussi affiché en tête du README) | Statut du code source |
| `categories-statut` | Outils par catégorie, empilés par statut | Catégories |
| `criteres-repertoire-enrichie` | Part des outils satisfaisant chaque critère, répertoire (déduit) et évaluation enrichie | Critères de souveraineté |
| `criteres-par-statut` | Carte de chaleur : critères satisfaits par statut, répertoire et évaluation enrichie | Critères de souveraineté |
| `criteres-verdicts` | Barres empilées : part des critères confirmés, infirmés et indéterminés (`criteres_confirmes`) par statut, un panneau par critère ; omis sans outil vérifié | Critères de souveraineté |
| `licences` | Outils par licence SPDX, colorés par famille | Licences |
| `forges` | Outils par forge de code | Forges de code |
| `tags` | Les 15 tags les plus fréquents | Tags |
| `enrichissement-jours` | Outils enrichis par jour, seulement à partir de deux jours distincts (absent tant que tous les enrichissements datent du même jour ; présent depuis l'enrichissement des services FACiL le 2026-11-13) | Dates |

Un graphique sans données est omis (par exemple, sans outil enrichi, ni licences, ni forges, ni tags), et les fichiers d'un graphique qui n'est plus produit sont supprimés du dossier (les autres fichiers y restent). Chaque image du sommaire a un texte alternatif qui résume son contenu. L'image en tête du README pointe vers `graphiques/statut-code-source.svg` (par une balise `<img>`, la seule balise HTML du README, pour en fixer la largeur) : elle se met à jour quand ce fichier est régénéré et commité. Les graphiques ne contiennent que des statistiques déjà publiées dans le sommaire; aucune donnée ne quitte l'ordinateur pour les produire.

**Installer vl-convert** : `cargo install vl-convert`, ou télécharger un binaire sur la [page des versions](https://github.com/vega/vl-convert/releases). Le programme doit être dans le `PATH`. Le script vérifie sa présence au début, avant tout appel à l'API, et propose `--sans-graphiques` s'il est absent. Les spécifications visent Vega-Lite 6.1, la version la plus récente que gère `vl-convert` 1.9.

Le dépôt contient un `sommaire.md` déjà généré ([le consulter](sommaire.md)); il reflète l'état des données au moment où il a été produit, et son introduction donne la date de génération. Le résumé rédigé par l'IA est différent à chaque exécution : régénérer le sommaire en change le texte, même si les données n'ont pas bougé.

Configuration : `OPENAI_API_KEY` dans `.env` et, facultativement, `OPENAI_MODEL` et `OPENAI_MODEL_FALLBACK`, comme pour l'enrichissement. Un seul appel est fait par exécution, deux si la première réponse est rejetée (le second par le repli). Le résumé est obtenu avant l'écriture des graphiques, de sorte qu'un échec du résumé, dans la mise à jour automatique, ne laisse rien de modifié.

## Importer ou réimporter depuis le web

`nub run update` est la seule porte d'entrée : il télécharge la page, compare, détecte les changements, conserve les dates des outils inchangés et ne touche jamais à l'enrichissement. Sans `outils.json`, il fait l'import initial (tous les outils « nouveau »). Deux opérations exceptionnelles restent possibles, sans script npm :

- **Reconstruire depuis zéro** : `nub extract.ts --force outils.json criteres.json` puis `nub classify.ts outils.json`. `extract.ts` **réécrit `outils.json` en entier**, avec seulement les champs de la source : il ne fusionne rien. Sans `--force`, il refuse d'écraser un `outils.json` qui contient un enrichissement ou un historique de changement (`changement`, `removed`), ou qu'il ne peut pas lire. Il ne lit ni n'écrit jamais de fichier HTML : la page est téléchargée en mémoire. Un réimport détruit l'**enrichissement** (descriptions longues, tags, licences, évaluations, critères vérifiés, données Open Hub), qui coûte des appels à l'API, les **outils des autres sources** (`extract.ts` n'écrit que ceux de la page de Praxis : les services FACiL, les alternatives de Charles et les outils ajoutés à la main disparaissent, et il faut relancer `extract-facil.ts`, `extract-charles.ts` et `ajouter.ts`) et l'**historique des changements** : tous les outils reçoivent la date de modification actuelle de la page, avec `changement: null`. Le fichier garde son `meta.created_at`, et son `meta.updated_at` n'est modifié que si le contenu diffère.
- **Reclasser tous les outils** après un changement des règles de `classify.ts` : `nub classify.ts outils.json`. `update` ne reclasse que les outils nouveaux ou modifiés. Attention : `classify.ts` reclasse **tous** les outils d'après leur description et leur score, y compris ceux au score estimé (FACiL, Charles, ajouts manuels), dont `criteres` et `confiance` viennent de l'évaluation enrichie ; ces valeurs sont alors écrasées, et `test:data` échoue tant qu'elles ne sont pas rétablies. La commande ne perd rien pour un fichier qui ne contient que des outils avec étoiles (Praxis).

Comme la page est téléchargée à chaque exécution, un réimport n'est **pas reproductible** : il donne l'état du répertoire au moment où il est lancé. Pour retrouver un état précis, utiliser l'historique Git de `outils.json`.

| Besoin | Commande |
|---|---|
| Suivre la page en ligne (usage courant) et premier import | `nub run update` |
| `outils.json` invalide, vide ou corrompu | Le restaurer depuis Git, ou `nub extract.ts --force outils.json criteres.json` puis `nub classify.ts outils.json` (`update` et `extract` refusent sinon) |
| Appliquer de nouvelles règles de classification (outils avec étoiles ; écrase `criteres` et `confiance` des outils au score estimé) | `nub classify.ts outils.json` |
| Tout remplacer volontairement depuis le web | `nub extract.ts --force outils.json criteres.json` puis `nub classify.ts outils.json` |

Si le `score` ou les `criteres` d'un outil déjà enrichi changent, après un `classify` ou parce que `update` détecte une modification, son `evaluation_enrichie` (et son `ecart`) peut devenir périmé : rien ne le recalcule, puisqu'un outil enrichi n'est jamais régénéré. Pour le refaire, supprimer ses champs d'enrichissement (même méthode que la recette de [Pages inaccessibles](#pages-inaccessibles-ou-presque-vides), en adaptant la condition `if`), puis relancer `nub run update`.

## Scripts npm (`package.json`)

| Commande | Effet |
|---|---|
| `nub run update` ou `node update.ts` | `node update.ts` : synchronise `outils.json`, `categories.json` et `criteres.json` avec la page en ligne (import initial si `outils.json` manque), enrichit, vérifie et décrit ce qui ne l'est pas encore. Les options passent directement : `nub run update --dry-run` pour l'aperçu et l'estimation des coûts, `nub run update --accepter-couts` pour un premier import hors terminal |
| `nub run sommaire` ou `node sommaire.ts` | `node sommaire.ts` : écrit `sommaire.md` et `graphiques/` (`--sans-resume` évite l'appel à l'API, `--sans-graphiques` évite vl-convert, `--sans-couleur` laisse la barre de progression sans couleur) |
| `nub run schemas` | `obuild && nub dist/generer-schemas.mjs` : régénère `schemas/*.schema.json` à partir des types (voir [Schémas JSON](#schémas-json)) |
| `nub run schemas:verifier` | Comme `schemas`, mais sans rien écrire : échoue si les schémas commités sont périmés |
| `nub run licences` | `uvx reuse lint` : vérifie que chaque fichier suivi déclare sa licence et son droit d'auteur ([REUSE](https://reuse.software/) 3.3). Demande [uv](https://docs.astral.sh/uv/) et un accès réseau la première fois ; non inclus dans `nub run test` |
| `nub run test` | `test:unit`, puis `test:data`, puis `schemas:verifier` |
| `nub run test:unit` | `nub --test "test/*.test.ts"` : les tests unitaires, un processus par fichier en parallèle (runner de `node:test`), sans aucun fichier de données : ils passent avant le premier `nub run update` |
| `nub run test:data` | `nub --test "test/donnees/*.test.ts"` : les tests qui lisent les vrais fichiers du dépôt ; sans eux, échec avec un message qui dit de lancer `nub run update` |
| `nub run typecheck` | `tsrs -p .` : vérifie les types avec [tsrs](https://www.npmjs.com/package/tsrs), un portage en Rust de `tsc` |

## Tests

Avec `node:test`, lancé par `nub --test` (le développement et les tests passent par nub ; seuls `update.ts` et `sommaire.ts` sont prévus pour `node` seul). Le runner exécute un processus par fichier, en parallèle ; les fichiers sont donc indépendants (fixtures de `donnees-fictives.ts`, dossiers temporaires, serveur local sur un port libre), et dans un fichier les tests restent séquentiels. Deux groupes :

**`test/*.test.ts`, unitaires** (`nub run test:unit`), sans aucun fichier de données ni réseau :

- `categories.test.ts` : slug, liste des catégories depuis la page (ordre, doublons, descriptions conservées, identifiants en conflit), validation des descriptions, requête au modèle, boucle avec un faux modèle (nouvel essai, échec, sauvegarde) et estimation du coût.
- `extract-categories.test.ts` : une catégorie par `h3` avec id, nom et icône, et les outils portent l'identifiant.
- `classify.test.ts` : cas de classification connus (descriptions du répertoire figées dans le test), les options de la ligne de commande sur un fichier fictif, le refus d'un fichier au mauvais format, et la couleur de « Erreur: ».
- `confirmer.test.ts` : validation des verdicts (statuts, citation obligatoire, exacte et d'au plus 300 caractères), forme de `criteres_confirmes`, règle A dans les consignes, requête sans score ni critères du répertoire (avec `instance_de` et la page du logiciel pour un service), et la boucle avec un faux modèle (verdict inscrit en place et sauvegardé, outil déjà vérifié jamais refait, nouvel essai, échecs et compteur, page illisible, abandon, estimation du coût).
- `extract.test.ts` : conversion de la date de la page en heure de Toronto, rejet d'une page sans date, téléchargement (sur un serveur local, sans réseau), erreurs de téléchargement, le garde-fou contre l'écrasement (avec et sans `--force`, y compris pour un fichier au mauvais format), et la preuve qu'aucun fichier HTML local n'est lu.
- `update.test.ts` : nouveau, modification, retrait, comeback, `synchroniser` (import initial sans `outils.json`, simulation, fichier inchangé, écriture de `criteres.json` et de `categories.json` seulement quand ils changent, descriptions de catégories conservées, format invalide refusé), conservation des dates des outils inchangés et des champs d'enrichissement, la présentation colorée du résumé et du journal (même texte avec ou sans couleurs), les conditions de la mise à jour automatique du sommaire, la lecture de la réponse à la confirmation du premier import et son texte, les lignes d'estimation avec et sans scénario de repli, les outils d'une autre source conservés et l'outil sans source rattaché à Praxis, le score estimé (classification conservée, puis alignée une fois l'outil enrichi), les renvois `voir_aussi` et la réécriture quand eux seuls changent.
- `enrichir.test.ts` : date d'enrichissement, validation (tags, Markdown permis et interdit, licences SPDX et maison, évaluation), explication des écarts, extraction de la page, pages inaccessibles ou presque vides (avertissement, jamais enrichi), estimation des jetons et du coût, compteur de jetons des appels, enrichissement une seule fois, compteur d'échecs consécutifs et abandon après `maxEchecs`, reprise, avec de faux générateurs ; modèles par défaut et `modelesDepuisEnv`, `obtenirValide` avec et sans repli, erreurs définitives (HTTP 400, 401, 403, 404, refus) et jetons d'une réponse en erreur, repli de l'enrichissement et de l'explication de l'écart ; page du logiciel, `instance_de`, `page_lue` et `voir_aussi` dans la fiche d'un service.
- `prix.test.ts` : coût d'un appel au prix du modèle, addition des jetons, lecture des jetons d'une réponse OpenAI, formatage en français, jetons par modèle (ajout, différence, coût total, formatage de plusieurs modèles).
- `spdx.test.ts` : licences SPDX valides et refusées.
- `progress.test.ts` : barre en terminal et hors terminal, bornes, étiquette, `end()` idempotent, `message()`, peinture de la barre, temps restant (rythme observé avec une horloge injectée, placement, absence avant la première unité et à la fin, écran étroit).
- `duree.test.ts` : formats en français (secondes, minutes, heures, jours, zéro, espaces ordinaires, durées invalides) et estimation du temps restant.
- `couleurs.test.ts` : règles d'activation (terminal, `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb`, `--sans-couleur`) et codes ANSI.
- `temps.test.ts` : heure de Toronto (hiver, été, minuit, passage à l'heure d'été), décalage ajouté à une date locale.
- `versions.test.ts` : `.node-version` est une majeure seule, `engines.node` en est la plage (`>=N <N+1`), `devEngines.runtime` dit la même plage (Node, `onFail: warn`), et la documentation cite cette majeure.
- `env.test.ts` : `.env` absent (sans erreur), présent (variables chargées), variable d'environnement existante conservée, autre erreur remontée avec le chemin.
- `fichiers.test.ts` : structure et `meta` des fichiers de données (création, contenu inchangé ou modifié, licence rétablie, refus des formats invalides, tableau modifié en place entre deux écritures).
- `sommaire.test.ts` : statistiques (statuts, licences, familles, tags, critères par statut, critères vérifiés par verdict et par statut, forges, dates), rendu Markdown (sections, images insérées dans leur section, cas sans outil enrichi), validation du résumé et nouvelle tentative, `genererSommaire` (écriture, options, conservation du sommaire existant en cas d'échec, étapes de la barre de progression avec une fausse barre), avec des données fictives (jamais `outils.json`, jamais le réseau).
- `graphiques.test.ts` : spécifications Vega-Lite (données incluses, champs existants, pourcentages, verdicts des critères vérifiés, graphiques omis sans données), écriture et nettoyage des fichiers, suivi de l'écriture (titre avant, nombre après), message si vl-convert est absent, et conversion réelle en SVG autonome (ignorée si vl-convert n'est pas installé). Les données fictives des tests sont dans `donnees-fictives.ts`.
- `schemas.test.ts` : des données fictives complètes sont valides selon les schémas (avec Ajv, indépendant de RunTypes), et des variantes invalides sont refusées (clé inconnue, `score` hors de 0 à 3, `echecs_enrichissement` nul ou non entier, `source` ou `changement` inconnus, tags en trop ou en double, date non ISO, `meta` manquant).
- `documentation.test.ts` : les quatre fichiers Markdown rédigés (README, `implementation.md`, `historique.md`, `analyse-effort/analyse.md`) existent, leurs liens relatifs et leurs ancres existent (ancres calculées comme GitHub, liens dans le code ignorés, liens vers le `sommaire.md` généré laissés à `test:data`), chacun commence par un titre et la ligne *Documentation*, sans tiret cadratin ni balise HTML (sauf l'image du README). Les outils communs (ancres, liens, conventions) sont dans `markdown.ts`.
- `sources.test.ts` : source Praxis, validation des sources (slug, URL, extracteur, soumis_par et courriel), `sourcesAvec`, écriture et relecture de `sources.json`.
- `extract-facil.test.ts` : extraction d'une page fictive (champs, instance_de, alternatives connues et inconnues, catégorie par logiciel, score estimé), erreurs (aucun service, logiciel sans catégorie, doublons), tables valides, synchronisation (nouveaux, inchangé, retrait, score aligné conservé), téléchargement avec en-tête de navigateur, CLI.
- `extract-charles.test.ts` : source, tables (slugs, catégories déclarées utilisées, Plans d'Apple exclu), description composée, extraction de données fictives (catégorie par table et par exception, exclusion, score estimé, sites inversés, catégories utilisées, avertissements), erreurs (catégorie absente des données ou des tables, site vers une alternative inconnue, noms ou ids en double), URL des fichiers bruts et de l'API, téléchargement avec un faux `fetch` (en-tête, date du commit en heure de Toronto, repli sur l'heure de lecture, fichier en erreur ou malformé), lecture d'un clone, synchronisation (nouveaux, doublon listé, source et catégories écrites, inchangé, retrait, `voir_aussi`, score aligné conservé).
- `ajouter.test.ts` : source demandée (connue, nouvelle, manquante), outil demandé (validation, score estimé ou donné, alternatives), écriture dans les fichiers, options de la ligne de commande, CLI.
- `logiciel.test.ts` : nom de logiciel, racine du dépôt par forge (pages de version, de tag et de commit ; forges auto-hébergées ; hors forge), page d'enrichissement, renvois `voir_aussi` (symétrie, outils retirés, renvoi périmé, identité conservée).
- `agent.test.ts` : forme du User-Agent (navigateur, nom/version, contact ; sans auteur), valeur lue dans `package.json`, `enTetes` ; chaque test de téléchargement vérifie l'en-tête envoyé (Praxis par un serveur local, FACiL, Charles, Open Hub, OpenAI).
- `openhub.test.ts` : lecture du XML (collection, projet avec analyse, dépôts, erreur de statut), concordance directe (un lien sur une forge comparé comme dépôt, jamais par hôte) et par les dépôts, champs écrits, outils à compléter, boucle avec un faux client (concordance, service instance d'un logiciel cherché par le nom du logiciel, candidats journalisés, compteur et abandon, erreur réseau), client HTTP.
- `en-tetes.test.ts` : chaque fichier `.ts` porte les en-têtes SPDX; la licence du code est la même dans `package.json`; les textes de licence sont présents, à la racine (`LICENSE*`) et dans `LICENSES/` (AGPL, CC BY-SA, MIT); chaque schéma JSON déclare la licence du code dans `$comment`; et `REUSE.toml` annote `schemas/**` et le reste des fichiers sans en-tête (AGPL-3.0-or-later), les données et leurs dérivés (CC-BY-SA-4.0) et les skills et outils d'agents installés (`.claude/skills/*`, `.agents/skills/*`, `.specify/**`, MIT) ; `skills-lock.json` déclare sa licence dans `meta.$comment` et celle de chaque skill dans `skills.<nom>.meta`, en accord avec `REUSE.toml`. Ce test ne remplace pas `nub run licences`, qui contrôle tous les fichiers.

**`test/donnees/*.test.ts`, données réelles** (`nub run test:data`), après un `nub run update` terminé ; chaque fichier commence par `exigerFichiers` (`garde.ts`), qui échoue avec un message clair si un fichier manque :

- `donnees/outils.test.ts` : 60 outils de Praxis (et ceux des autres sources), chacun dans une catégorie de `categories.json` et chaque catégorie utilisée ; `sources.json` valide, Praxis présente et chaque outil rattaché à une source existante ; `voir_aussi` symétrique et à jour ; `criteres.json` cohérent avec les icônes ; les critères de chaque outil sont ceux que `classify.ts` déduit, un par étoile (classification par seuil pour un score estimé non enrichi) ; vocabulaire de `tags.json` ; licence et dates des cinq fichiers ; validité des cinq fichiers selon les schémas JSON.
- `donnees/documentation.test.ts` : `sommaire.md` existe, respecte les conventions et dit par quel script il est généré ; tous les liens des cinq fichiers Markdown (les quatre rédigés et `sommaire.md`), y compris vers `sommaire.md` et les images de `graphiques/`, sont valides.

## Dépannage

| Message | Cause et remède |
|---|---|
| `Refus d'écraser: …` | `extract.ts` a trouvé dans `outils.json` un enrichissement, un historique de changement, ou un format inattendu. Pour suivre la page sans rien perdre, utiliser `nub run update`; pour tout remplacer quand même, `nub extract.ts --force outils.json criteres.json` |
| `… format invalide …` ou `« meta » invalide …` | Un fichier de données n'a pas la structure décrite dans [Fichiers JSON](README.md#fichiers-json). Le restaurer depuis Git (`git checkout outils.json`) ou, pour `outils.json`, le recréer avec `nub extract.ts --force outils.json criteres.json` puis `nub classify.ts outils.json` |
| `Téléchargement impossible (url): …` | Réseau, délai de 30 secondes dépassé ou erreur HTTP en téléchargeant le répertoire. Rien n'a été écrit : réessayer |
| `OPENAI_API_KEY absente` | Pour `sommaire`, il y a un résumé à rédiger mais `.env` n'a pas la clé (`--sans-resume` l'évite), ou `.env` n'est pas dans le dossier courant (lancer les scripts depuis la racine du dépôt). Pour `update`, c'est un avertissement : la synchronisation est écrite, l'enrichissement, la vérification des critères et les descriptions de catégories sont sautés, et il restera à les faire |
| `page inaccessible …` ou `page presque vide …`, `outil non enrichi` ou `critères non vérifiés` | La page de l'outil n'a pas pu être lue : l'outil n'est pas enrichi (ou vérifié) et sera retenté à la prochaine exécution. Après 3 échecs consécutifs, il est abandonné (`abandonnés après 3 échecs consécutifs`) : `--max-echecs=N` plus élevé pour le retenter. Voir [Pages inaccessibles](#pages-inaccessibles-ou-presque-vides) |
| Des séquences comme `^[[32m` ou `[32m` apparaissent dans la sortie | Les couleurs sont forcées (`FORCE_COLOR`). Les désactiver avec `--sans-couleur` (ou retirer `FORCE_COLOR`) |
| `Sommaire non mis à jour: …` | Après des changements ou un enrichissement, le sommaire n'a pas pu être mis à jour : clé ou vl-convert manquant (avertissement, rien n'est modifié) ou résumé impossible à rédiger (le sommaire existant est conservé, code de sortie 1). Régler le problème, puis lancer `nub run sommaire`  |
| `vl-convert est introuvable …` | Le sommaire a besoin de vl-convert pour ses graphiques. L'installer (voir [Graphiques](#graphiques)) ou utiliser `nub run sommaire --sans-graphiques` |
| `vl-convert vl2svg: …` | vl-convert a refusé une spécification de graphique : le message de vl-convert dit pourquoi. Vérifier sa version (`vl-convert --version`, 1.9 ou plus) |
| `Fichiers absents: … Lancer « nub run update » d'abord` | `nub run test:data` (ou `nub run test`) sans les fichiers de données ou le sommaire : lancer `nub run update`, ou se limiter à `nub run test:unit` |
| `Schémas périmés ou absents: …` | `nub run schemas:verifier` (ou `nub run test`) a trouvé un schéma commité qui diffère de celui que les types produisent. Lancer `nub run schemas`, puis commiter `schemas/` |
| `Premier import hors terminal: …` | `update` sans `outils.json` demande une confirmation des coûts, impossible hors terminal. Relancer avec `--accepter-couts` ou `--dry-run` |
| `OpenAI HTTP 401: …`, `403`, `400`, `404` ou `refus du modèle: …` | Erreur définitive : clé invalide, requête ou modèle refusé (`OPENAI_MODEL` inexistant), ou refus du modèle. Aucune seconde tentative ni repli ; vérifier la clé et les noms de modèles dans `.env` |
| `OpenAI HTTP 429: …` ou `5xx` | Quota ou crédit épuisé, ou erreur passagère de l'API : la seconde tentative passe par le modèle de repli ; si elle échoue aussi, l'outil compte un échec et sera retenté à la prochaine exécution (vérifier le crédit sur <https://platform.openai.com/settings/organization/billing/>) |
| `Fichier d'environnement illisible (.env): …` | `.env` existe mais n'a pas pu être lu (droits, ou un dossier de ce nom). Le corriger ou le retirer : sans `.env`, les scripts tournent sans clé |
| `Open Hub sauté: OPENHUB_API_KEY absente` | `update` a des logiciels libres à compléter mais pas de clé Open Hub dans `.env` (facultatif : voir `.env.example`) |
| `<outil>: Open Hub: aucune concordance sûre …; candidats: …` | Aucun projet Open Hub ne correspond à la page de l'outil (ou au dépôt de son logiciel) ni à `repo` ; les candidats listés permettent de vérifier à la main (le projet est peut-être absent d'Open Hub, ou nommé autrement). Après 3 échecs, l'outil n'est plus cherché (`--max-echecs=N` pour retenter) |
| `Open Hub HTTP 401` ou `Open Hub: Invalid API key` | Clé Open Hub invalide ; `HTTP 429` : limite quotidienne atteinte, réessayer le lendemain |
| `page FACiL: logiciel sans catégorie dans CATEGORIE_PAR_LOGICIEL …` | Un nouveau service FACiL repose sur un logiciel que l'extracteur ne connaît pas : ajouter le logiciel (en minuscules) et sa catégorie à la table de `extract-facil.ts` |
| `Avertissement: <service>: service remplacé inconnu « … »` | `extract-facil.ts` ne connaît pas l'URL d'un service que la page dit remplacer : l'ajouter à `ALTERNATIVES` (l'outil est extrait sans cette alternative) |
| `données Charles: catégorie sans correspondance dans CATEGORIE_PAR_CATEGORIE …` | L'extension Charles a une nouvelle catégorie : lui donner une catégorie du répertoire dans la table de `extract-charles.ts` (ou en déclarer une dans `CATEGORIES_CHARLES`) |
| `Avertissement: <alternative>: caractéristique « … » inconnu(e)` | `extract-charles.ts` ne sait pas traduire une caractéristique (ou un pays, un tarif) : l'ajouter aux tables (la description est composée sans) |
| `Avertissement: date du dernier commit inconnue …` | L'API GitLab n'a pas répondu : les alternatives sont datées de la lecture ; relancer plus tard pour une date exacte |
| `source « x » absente de sources.json: donner --source-nom et --source-url` | `ajouter.ts` : la source n'existe pas encore ; la créer avec ces options, ou choisir un identifiant existant |
| `Option inconnue: …` | Option mal orthographiée. Les options valides sont décrites dans la section de chaque script |

## Site de consultation (`site/`)

Un site statique qui rend le répertoire consultable sans ouvrir de fichier JSON : un accueil qui présente le projet, une page « Outils » qui liste les outils actifs par catégorie, une fiche par outil, et un explorateur pour trier, filtrer et comparer. Il vit dans `site/`, sous-projet autonome : ses dépendances (`site/package.json`, `site/nub.lock`) ne touchent pas celles de la racine, et `node update.ts` ne demande toujours que Node.js. Les commandes sont dans [`site/README.md`](site/README.md). Deux fonctionnalités l'ont construit, dont les spécifications, les plans et les contrats sont conservés : `specs/001-site-consultation-repertoire/` (liste et fiches), `specs/002-explorateur-outils/` (explorateur, accueil de présentation, page « Outils ») et `specs/003-page-statistiques/` (page « Statistiques »).

**Données.** Au build, `site/src/lib/donnees.ts` lit les cinq fichiers JSON de la racine tels quels (ou ceux du dossier `DONNEES`, pour les tests) et n'écrit rien. Il vérifie le strict nécessaire (structure `meta` et tableau, champs obligatoires, renvois vers `categories.json`, `sources.json` et `tags.json`) et arrête le build avec un message qui nomme le fichier fautif ; la forme complète reste garantie par les schémas JSON. Les types viennent de la racine par `import type` : un changement de forme des données casse `nub run check` du site au lieu de passer inaperçu. Le build ne fait aucun appel réseau.

**Pages.** Astro en sortie statique produit 159 pages : l'accueil (`/`), la page « Outils » (`/outils/`), une fiche par outil actif (`/outils/<id>/`), la page « Explorer » (`/explorer/`), la page « Statistiques » (`/statistiques/`) et une page 404, plus le fichier `explorateur.json` et les fichiers des graphiques (`graphiques/`). L'accueil présente le répertoire, sa genèse, les crédits et les logiciels utilisés ; ses nombres viennent des données, et le reste de `site/src/lib/presentation.ts`, dont un test vérifie que chaque logiciel cité figure dans la documentation ou dans les dépendances du dépôt. La page « Outils » liste les outils par catégorie, sans filtre. L'identifiant d'une fiche est le slug du nom (la règle de `slug()` de `categories.ts`, vérifiée par un test sur tous les noms) ; deux outils qui donneraient la même adresse arrêtent le build. Un outil retiré (`removed`) n'a ni carte ni fiche. Une section dont les champs sont absents n'est pas rendue : un outil non enrichi s'affiche avec les champs de sa source et ses critères déduits, sans titre vide. Chaque page porte la navigation « Accueil », « Outils », « Explorer », « Statistiques », la page en cours étant indiquée par `aria-current` et un soulignement.

**Provenance.** `site/src/lib/provenance.ts` associe chaque champ affiché à l'une de quatre provenances : la source, une déduction de ce dépôt, un modèle d'IA (« Produit par IA, à vérifier ») ou Open Hub. Le libellé est du texte visible à côté du champ, jamais une couleur seule ni une infobulle. Un score estimé (`score_estime`) est dit estimé. La fiche montre les critères en trois lectures séparées et nommées : les critères vérifiés d'après la page de l'outil (verdict confirmé, infirmé ou indéterminé, avec la citation reproduite telle quelle), les critères déduits des étoiles avec leur fiabilité, et le second avis du modèle avec l'explication de l'écart. Chaque page porte dans son pied l'attribution CC BY-SA 4.0 aux auteur·trices du répertoire d'origine, le crédit des autres sources de `sources.json` et la date des données.

**Explorateur.** La page « Explorer » est la seule qui demande JavaScript, et le seul endroit où l'on filtre. C'est une île SolidJS (`site/src/components/Explorateur.tsx`, montée par `client:only`) qui lit dans le navigateur `explorateur.json`, un dérivé écrit au build (`site/src/pages/explorateur.json.ts`, `site/src/lib/explorateur.ts`) : les outils actifs avec seulement ce que l'explorateur affiche ou filtre, sans descriptions longues ni citations (104 ko, 16 ko compressé). C'est le seul appel réseau du site, vers son propre fichier statique ; un test n'admet `fetch` que dans `site/src/lib/chargement.ts`. La ressource est lue par `createResource` sous `<Suspense>` et `<ErrorBoundary>` : un message de chargement, puis la liste, ou un message d'erreur avec « Réessayer » et un lien vers la page « Outils ». Sans JavaScript, le contenu d'attente reste affiché : il dit que l'explorateur demande JavaScript et renvoie à la page « Outils » (un `<noscript>` ne suffit pas quand les scripts sont bloqués par un réglage). L'explorateur trie (nom, score ou catégorie, dans les deux sens, toute égalité départagée par le nom en ordre français), filtre (catégorie, tag, statut du code source, recherche par nom, score minimal, verdict de chaque critère vérifié, pays de l'éditeur, source, enrichissement ; « ou » dans un filtre à choix multiple, « et » entre les filtres ; un outil non vérifié n'est retenu par aucun verdict), affiche les mêmes résultats en cartes ou en tableau, et compare côte à côte de deux à quatre outils (score, verdicts vérifiés, critères déduits, statut, licence, pays, services remplacés), une information absente étant écrite en clair. Tout l'état vit dans l'adresse (`?categorie=…&tag=…&statut=…&pays=…&source=…&q=…&score=…&donnees=…&enrichi=…&tri=…&sens=…&vue=…&comparer=…`, voir `specs/002-explorateur-outils/contracts/adresse.md`) : un lien copié le restaure, le bouton précédent revient à l'état d'avant, et une valeur inconnue est ignorée. La logique est en fonctions pures, sans Solid ni accès au DOM : `etat.ts` (état et adresse), `selection.ts`, `tri.ts`, `comparaison.ts`. Sur une fiche, la catégorie et les tags mènent à l'explorateur filtré.

**Statistiques.** La page « Statistiques » présente les chiffres clés du répertoire et les neuf graphiques du [sommaire](sommaire.md), sans le lire : au build, `site/src/lib/statistiques.ts` appelle `calculerStatistiques` (`statistiques.ts`) et `construireGraphiques` (`graphiques.ts`) de la racine sur les mêmes données, pour que la page et le sommaire ne se contredisent jamais. Ces modules sont chargés à leur emplacement réel, par leur chemin, et non regroupés avec le code du site (l'un d'eux lit `package.json` à côté de lui) : bâtir le site demande donc les dépendances de la racine installées (`nub install` à la racine), alors que les scripts de la racine ne dépendent toujours pas du site. Chaque spécification Vega-Lite est compilée par vega-lite puis rendue en SVG par vega dans Node (`site/src/lib/rendu.ts`), sans `vl-convert` ni appel réseau, en deux thèmes : `site/src/lib/themes-graphiques.ts` ne change que le fond et les couleurs du texte, des axes et des grilles, jamais les données ni les couleurs des séries. La page porte les deux images de chaque graphique (`graphiques/<id>-clair.svg`, `-sombre.svg`) et le CSS montre celle du thème en cours, donc sans JavaScript. Sous chaque graphique, un bloc repliable « Voir les chiffres » contient le tableau des mêmes valeurs, tiré de `spec.data.values` (`site/src/lib/tableaux.ts`) ; chaque graphique dit en texte d'où viennent ses chiffres (déduits des étoiles, évaluation par IA, vérifiés avec citation, champ produit par IA) et sur combien d'outils ils portent. Les lignes des tableaux par statut, par catégorie et statut, et par tag mènent à l'explorateur filtré, et un test vérifie que l'explorateur y retient autant d'outils que le chiffre. Avec JavaScript, une île SolidJS (`site/src/components/Graphique.tsx`, montée par `client:visible`) charge vega et la spécification déjà compilée (`graphiques/<id>-<thème>.json`, préparée par `site/src/lib/interaction.ts`) quand le graphique devient visible, et remplace l'image par une vue interactive : valeur exacte dans une infobulle au survol ; un seul arrêt de tabulation par graphique, puis les flèches d'une valeur à l'autre, la valeur en cours étant entourée et annoncée ; des boutons à bascule pour mettre une série en évidence (les autres s'estompent, elle reçoit un contour) ; passage au thème sombre quand la page en change. Si la vue ne peut pas être chargée, l'image reste.

**Styles et Markdown.** daisyUI 5 est importé comme feuille de style, sans Tailwind ni classe utilitaire ; la mise en page est dans `site/src/styles/global.css`. Deux greffons PostCSS (`site/postcss/`) retirent les variantes réactives de daisyUI, que le balisage n'a pas le droit d'employer (un test le vérifie), et appliquent le thème sombre selon la préférence du système. Dans l'en-tête, un interrupteur clair ou sombre (le « theme controller » de daisyUI dans un « swap », île SolidJS `site/src/components/Theme.tsx`) part du thème du système, puis retient le choix de la personne d'une page à l'autre dans le stockage local du navigateur ; sans JavaScript, la page suit le système et l'interrupteur reste masqué. Le choix enregistré s'applique à l'hydratation de l'île : sur une page qui se charge, le thème du système peut s'afficher un instant avant lui. Les descriptions longues, en Markdown, sont rendues par [Sätteri](https://satteri.bruits.org/), avec les titres décalés sous ceux de la fiche et le HTML brut remplacé par du texte : le site n'insère jamais de HTML venu des données.

**Tests du site** (`nub run test` et `nub run test:e2e`, dans `site/`), en trois niveaux :

| Niveau | Fichiers | Ce qu'il vérifie |
|---|---|---|
| Unitaire, sur fixtures | `site/test/*.test.ts` | Les fonctions de `site/src/lib/` (chargement des données, adresses, provenance, critères, Markdown, données de l'explorateur et leur lecture, état et adresse, sélection, tri, comparaison, présentation) et les greffons PostCSS |
| Site bâti, sur les vraies données | `site/test/build/*.test.ts` | Le HTML de `site/dist/`, lu sans exécuter de script : l'accueil de présentation, une carte par outil actif sur la page « Outils » et une fiche par outil, les sections que les données justifient et aucune autre, aucun élément vide, le signalement de chaque champ d'IA, les citations, l'attribution et la navigation sur chaque page, les liens internes, le contenu de `explorateur.json`, la page « Statistiques » (chiffres clés, tableaux fidèles aux graphiques, provenance, liens, images et spécifications des deux thèmes), `vl-convert` jamais lancé, l'arrêt du build sur des données invalides |
| Navigateur (Chromium, Playwright) | `site/test/e2e/*.spec.ts` | La page « Statistiques » (images sans JavaScript, vue interactive, infobulle, flèches, légende, thème, liens, image conservée si la vue échoue), l'explorateur (tri, chaque filtre, vues, comparaison, adresse partagée, bouton précédent, chargement ralenti, échec de chargement et « Réessayer »), l'interrupteur de thème, la lecture sans JavaScript, des parcours au clavier seul, l'absence de violation axe de niveau A ou AA en thème clair et sombre, l'affichage à 360 px de large |

`nub run typecheck` de la racine exclut `site/` (`tsconfig.json`), dont les types se vérifient par `nub run check` (`astro check`, qui demande TypeScript 6).

**Publication.** Elle reste à décider : le build produit `site/dist/`, publiable chez tout hébergeur de fichiers statiques, et l'adresse publique et le chemin de base se règlent par `SITE_URL` et `SITE_BASE`.

## Fonctionnalités menées avec Spec Kit

Une fonctionnalité peut être menée avec [Spec Kit](https://github.com/github/spec-kit) (commandes `speckit-*` de `.claude/skills/`, gabarits et scripts de `.specify/`). La [constitution](.specify/memory/constitution.md) du projet (version 1.2.0) fixe ce que chaque spécification, plan et liste de tâches doit respecter : six principes (les données d'abord, provenance et honnêteté, licences REUSE, coûts explicites, tests d'abord et simplicité, tout en français), les contraintes techniques, le flux de travail et la gouvernance. Elle prime sur les gabarits, et toute modification est versionnée et notée dans [historique.md](historique.md).

| Commande | Ce qu'elle produit |
|---|---|
| `/speckit-constitution` | Met à jour `.specify/memory/constitution.md` |
| `/speckit-specify` | Crée la branche `NNN-nom` et `specs/NNN-nom/spec.md` (le quoi et le pourquoi) |
| `/speckit-clarify` | Inscrit dans `spec.md` les réponses aux questions ouvertes |
| `/speckit-plan` | `plan.md` et les artefacts de conception (le comment) |
| `/speckit-tasks` | `tasks.md`, les tâches ordonnées par dépendance |
| `/speckit-analyze`, `/speckit-checklist` | Contrôle de cohérence entre `spec.md`, `plan.md` et `tasks.md` ; liste de vérification des exigences |
| `/speckit-implement` | Réalise les tâches de `tasks.md` |

Le travail se fait sur la branche `NNN-nom`, jamais directement sur `main` : la constitution l'exige pour une fonctionnalité Spec Kit, pour un changement de forme des données et pour tout changement de code de plus d'un commit ; seul un changement d'un commit qui ne touche pas la forme des données (correction ponctuelle, documentation, mise à jour des données par les scripts) peut aller sur `main`. La branche est fusionnée quand les trois contrôles passent, puis supprimée. Pendant la fonctionnalité, `specs/NNN-nom/plan.md` et `tasks.md` tiennent lieu de plan d'implémentation ; les artefacts sont rédigés en français (seuls les titres imposés par les gabarits restent en anglais) et couverts par l'annotation `specs/**` de `REUSE.toml`. À la fin, le contenu durable est reporté dans ce fichier et dans [historique.md](historique.md) ; le dossier `specs/NNN-nom/` est conservé, comme trace de ce qui a été demandé et décidé, et le code peut y renvoyer (les contrats du site sont dans `specs/001-site-consultation-repertoire/contracts/`).

**Commits automatiques.** L'extension git de Spec Kit (`.specify/extensions.yml`, `.specify/extensions/git/git-config.yml`) commite sans le demander : après chaque commande, et avant chacune sauf `/speckit-constitution` (qui vérifie seulement que le dépôt Git existe) et `/speckit-specify` (qui crée la branche). Tous les hooks sont obligatoires (`optional: false`) et `auto_commit` est activé pour chaque événement. Les messages sont fixes, en français, et disent pourquoi le commit a lieu (« Spec Kit: spécification de la fonctionnalité (spec.md), pour fixer le quoi et le pourquoi avant de planifier le comment »). Un commit fait à la main reste soumis aux trois contrôles : `nub run test`, `nub run typecheck`, `nub run licences`.

## Documentation

Les fichiers Markdown du dépôt suivent les mêmes conventions :

- un titre de niveau 1, puis une ligne *Documentation :* qui relie les quatre fichiers ([README](README.md), [implementation.md](implementation.md), [historique.md](historique.md), [sommaire.md](sommaire.md)) ; les fichiers générés (`sommaire.md`) ajoutent une ligne qui donne la date et le script qui les produit, et ne se modifient pas à la main ;
- un sommaire du fichier (**Sommaire :**) quand il a plus de quatre sections ;
- des liens relatifs au fichier, et des ancres de la forme `fichier.md#section` pour renvoyer à une section d'un autre fichier ;
- la typographie française (espace avant « : », « ; », « ? » et « ! », guillemets « ») ; pas de tiret cadratin ; aucune balise HTML, sauf le `<img>` en tête du README, pour fixer la largeur de l'image ;
- des tableaux avec une ligne d'en-tête, et les noms de fichiers, de champs et de commandes entre accents graves.

Le test `documentation.test.ts` vérifie ces conventions (fichiers et ancres des liens, ligne *Documentation*, tirets, balises, mention des fichiers générés) ; `en-tetes.test.ts` vérifie les en-têtes de licence, et `nub run licences` couvre les licences des fichiers Markdown via `REUSE.toml`.
