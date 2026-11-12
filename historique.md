# Historique du projet

*Documentation : [README](README.md) · [Implémentation](implementation.md) · [Historique](historique.md) · [Sommaire statistique](sommaire.md)*

Les étapes du projet et les décisions prises, par date, d'après l'historique Git (`git log`) et les notes qui accompagnaient les changements. Les dates sont en heure de Toronto. Pour l'état actuel, voir le [README](README.md) et [implementation.md](implementation.md).

**Sommaire :** [Repères](#repères) · [2026-11-11](#2026-11-11) · [2026-11-12](#2026-11-12) · [Décisions](#décisions)

## Repères

| Date | Repère |
|---|---|
| 2026-11-05 09:53 | Date de modification affichée par la page du répertoire au moment de l'import initial : tous les outils portent cette `derniere_modification` |
| 2026-11-11 16:43 | Création des trois fichiers de données (`meta.created_at`), avec `meta` et les dates en heure de Toronto |
| 2026-11-11 17:29 à 17:43 | Enrichissement par IA de 57 outils sur 60 ; les 3 autres (En commun, Paperless-ngx, CIRA Canadian Shield) ont une page inaccessible ou vide |
| 2026-11-12 09:00 | Confirmation des critères par OpenAI et Claude sur les 57 outils enrichis, règle A, citation à l'appui (`confirmations/`, puis `criteres_confirmes`) |
| 2026-11-12 11:39 | Création de `categories.json` (20 catégories, descriptions rédigées par IA à 11:42) |
| 2026-11-12 11:42 | Dernière génération de `sommaire.md` |

## 2026-11-11

- **Extraction et classification.** `extract.ts` lit la page de Praxis et écrit les outils et les critères en JSON ; `classify.ts` déduit des descriptions à quel critère chaque étoile correspond. Les premières versions en Python et les JSON intermédiaires sont retirés le même jour, de même que le champ `evidences`.
- **README et vérification des types** avec `tsrs` (portage de `tsc` en Rust), sans dépendance à `typescript`.
- **Enrichissement par IA** (`update.ts --enrichir`) : description longue en Markdown, tags d'un vocabulaire fermé (`tags.json`), statut du code source, licence SPDX ou licence maison (`custom_license`), dépôt de code, puis évaluation enrichie (second avis sur score et critères) et explication des écarts ; barre de progression et journal.
- **Protection de `outils.json`** : `extract` refuse d'écraser un enrichissement ou un historique sans `--force` ; la copie HTML locale disparaît, la page est toujours téléchargée.
- **Pages inaccessibles ou presque vides** : avertissement, refus par défaut, option `--sans-page` et marque `page_lue`.
- **Licences et métadonnées** : AGPL-3.0 pour le code, CC BY-SA 4.0 pour les données ; en-têtes SPDX dans chaque fichier ; champ `meta` (`data_license`, `created_at`, `updated_at`) et dates en heure de Toronto ; format strict des fichiers de données.
- **Sommaire statistique** (`sommaire.ts`) avec résumé rédigé par IA, puis date d'enrichissement par outil (`enrichi_le`). Les 41 outils enrichis avant ce champ reçoivent la date de substitution `2026-11-11T17:29:24-05:00`, celle du premier enrichissement daté ; 42 outils portent donc cette valeur.
- **Couleurs** dans `update.ts` et pour le mot « Erreur: » de tous les scripts.
- **Enrichissement terminé** : 57 outils sur 60.
- **Graphiques Vega-Lite** dans le sommaire, convertis par vl-convert en SVG et PNG ; le graphique du statut du code source est affiché en tête du README.
- **Sommaire automatique** avec `--enrichir` quand quelque chose a changé, options `--sans-sommaire` puis `--sommaire` pour `update`, et avertissement quand le sommaire n'est pas mis à jour malgré des changements. Décision : `update` seul ne touche pas au sommaire.

## 2026-11-12

- **Schémas JSON.** Analyse de l'adoption de schema.org (non retenue : le JSON-LD serait une couche d'export séparée) puis des générateurs de JSON Schema. Une expérience isolée (retirée du dépôt depuis) a montré que les schémas de mion RunTypes décrivent le JSON échangé pour les types simples, mais encodent à leur façon les unions avec `Date`, les `Map` et autres types propres à JavaScript ; tsdown et esbuild donnent la même sortie. Adoption de RunTypes pour générer `schemas/*.schema.json` (draft 2020-12), d'abord avec tsdown puis avec obuild (schémas identiques octet pour octet), avec `affiner-schema.ts` pour les contraintes que les types ne disent pas.
- **Licence du code** : passage de `AGPL-3.0-only` à `AGPL-3.0-or-later` ; les schémas déclarent leur licence dans `$comment` ; conformité à la spécification REUSE 3.3 (`LICENSES/`, `REUSE.toml`, `nub run licences`).
- **Analyse de la classification.** Sur les 57 outils enrichis, `criteres` (déduit) et `evaluation_enrichie.criteres` concordent pour 39 ; tous les écarts sont des outils où l'IA confirme moins de critères que d'étoiles. Des variantes de `classify.ts` ont été essayées puis retirées (`classify2`, confiance recalibrée ; `classify4`, retrait des critères contredits par l'enrichissement et les confirmations, 47 sur 57) : règles choisies en regardant ces mêmes données, et `classify4` contredisait les étoiles.
- **Confirmation des critères par IA** (`confirmer.ts`) : chaque critère est confirmé, infirmé ou jugé indéterminé d'après la page de l'outil, citation vérifiable à l'appui, par OpenAI (`gpt-6-astra`) et Claude (`claude-fable-5-2`). Sans convention, les deux divergeaient sur « contrôle » pour 21 outils ; la règle A (la nationalité mentionnée suffit) les met d'accord. Les deux exécutions finales portent sur les 57 outils avec la règle A (`confirmations/`).
- **Décision** : `criteres` reste lié aux étoiles de la source, et les critères vérifiés sont exposés à part dans `criteres_confirmes`, avec la citation, inscrits par `appliquer-confirmations.ts` à partir des confirmations de Claude.
- **Sommaire** : sous-section et graphique des critères vérifiés (confirmés, infirmés, indéterminés par statut du code source) ; `sommaire.md` régénéré.
- **`update` porte d'entrée unique** : sans `outils.json`, il fait l'import initial (tous les outils « nouveau ») et il écrit aussi `criteres.json` ; les scripts npm `build`, `build:force`, `extract`, `classify` et l'alias `enrichir` sont retirés. `extract.ts --force` (reconstruction) et `classify.ts` (reclassement) restent des commandes explicites, sans script npm.
- **Options de `update` réduites** : `--sommaire`, `--sans-sommaire` et `--limite` retirés ; le sommaire se met à jour avec `--enrichir` seulement, et `update` seul avertit. Nouveau champ `echecs_enrichissement` : après 3 échecs consécutifs (`--max-echecs=N`), un outil n'est plus tenté.
- **`update` enrichit toujours** : `--enrichir` et `--sans-page` retirés ; un outil dont la page est illisible n'est jamais enrichi. `--dry-run` affiche l'aperçu et une estimation des jetons et du coût (`prix.ts`, borne haute). Au premier import, confirmation dans le terminal (1. accepter les coûts, 2. arrêter ; une réponse « simulation », redondante avec l'aperçu déjà affiché, a existé brièvement), ou `--accepter-couts` hors terminal. Les jetons réels de chaque enrichissement sont comptés et affichés.
- **Champ `page_lue` retiré** des données, du code, des schémas et des docs : plus rien ne pouvait produire `false`, et `true` était devenu implicite (un outil enrichi a toujours eu sa page lue).
- **Démarrage rapide** dans le README (installation de nub, Node 26 épinglé dans `.node-version` et `engines.node`, clé OpenAI et où la créer, coûts et `--dry-run`), instructions dans `.env.example`.
- **Vérification des critères automatisée** : `update` remplit `criteres_confirmes` pour tout outil enrichi sans verdict, avec le modèle de l'enrichissement (OpenAI) et la règle A ; les 57 verdicts passent à `gpt-6-astra` (ceux obtenus le matin même, sans nouvel appel). `confirmer.ts` devient un module ; `appliquer-confirmations.ts`, `confirmations/`, les scripts npm correspondants, le fournisseur Claude, les autres règles et le champ `regle` disparaissent.
- **`categories.json`** : les catégories deviennent un fichier de données (`id` en slug du nom, `nom`, `icone`, `description` rédigée par IA dans `update`), et `outils.json` ne garde que l'identifiant dans `categorie` (le champ `icone` disparaît). Les schémas annotent la relation et un test la vérifie.
- **Documentation** scindée en trois fichiers : README (source, crédits, usage, données), `implementation.md` (scripts, classification, enrichissement, sommaire, tests, dépannage) et ce fichier.
- **Expérience `spike-mion` retirée** du dépôt (ses conclusions sont consignées ci-dessus).
- **Temps restant** sur les barres de progression de `update` (enrichissement, vérification, descriptions de catégories, qui reçoit sa barre) : estimé au rythme moyen observé, formaté en français par `duree.ts` avec `Temporal.Duration` et `Intl.DurationFormat`, natifs dans Node.js 26.
- **Tests en deux groupes** : `test:unit` (`test/*.test.ts`, fixtures et dossiers temporaires, passe sans données) et `test:data` (`test/donnees/`, les vrais fichiers, échec explicite s'ils manquent) ; lancés par le runner de `node:test` via `nub --test`, un processus par fichier en parallèle (265 tests en 4,5 s au lieu de 9 s). `nub run test` enchaîne les deux puis `schemas:verifier`.
- **Deux environnements dans `package.json`** : `engines.node` (`>=26 <27`) pour qui exécute les scripts avec Node.js, `devEngines.runtime` (même plage, `onFail: warn`, lu par nub avant `.node-version`) et `devEngines.packageManager` (nub) pour qui développe ; `.node-version` reste pour les autres gestionnaires de versions.
- **Exécution avec Node.js seul** : `node update.ts` et `node sommaire.ts` suffisent à utiliser le projet (`env.ts` charge `.env`, `engines.node` `>=26 <27`, `vega` et `vega-lite` en `devDependencies` car ils ne servent qu'aux types) ; le développement (tests, types, schémas, licences) reste sous nub, qui fournit le Node.js de `.node-version`, `nub.lock` et les commandes `nub run`.
- **Graphiques en SVG seulement** : les PNG (1,7 Mo pour 8 images, un second appel à vl-convert chacun) ne sont plus produits ; `sommaire.md` et le README insèrent les SVG, que GitHub affiche. `ecrireFichier` retourne une copie des données, pour que `updated_at` avance à chaque écriture d'un enrichissement (il restait figé après la première écriture d'une exécution).

## Décisions

| Décision | Raison |
|---|---|
| `update` est la seule porte d'entrée, import initial compris ; `build` est retiré | Tout ce que faisait `build` était déjà dans `update`, sauf l'amorçage et `criteres.json` ; une seule commande à connaître, et les opérations destructrices (`extract.ts --force`) restent explicites |
| Pas d'option `--enrichir` : `update` enrichit dès qu'un outil ne l'est pas, et met le sommaire à jour dès que quelque chose a changé ; pas d'option `--sommaire`, `--sans-sommaire` ni `--limite` | Une seule commande à connaître ; le consentement aux coûts se donne une fois, au premier import, et `--dry-run` chiffre avant de dépenser. Le sommaire coûte un appel, son résumé change à chaque exécution : il ne se refait que si quelque chose a changé |
| Jamais d'enrichissement sans page lisible (`--sans-page` retiré) | Un résumé tiré de la mémoire du modèle serait figé pour toujours ; mieux vaut un outil non enrichi, visible comme tel, abandonné après 3 échecs |
| Compteur `echecs_enrichissement` et abandon après 3 échecs consécutifs (`--max-echecs=N`) | Sans lui, les outils dont la page est durablement inaccessible étaient retentés à chaque exécution (délais et code de sortie 1), sans fin |
| `extract` ne lit jamais de fichier HTML local et refuse d'écraser du travail sans `--force` | Un réimport détruit l'enrichissement et l'historique ; la page doit être l'unique source |
| Un outil enrichi n'est jamais régénéré | L'enrichissement coûte des appels à l'API ; pour le refaire, supprimer ses champs puis relancer |
| Les dates sont en heure de Toronto, avec le décalage | La page du répertoire donne l'heure de l'Est ; un horodatage avec décalage reste sans ambiguïté |
| Format strict des fichiers de données, sans reconnaissance de l'ancien format à plat | Un fichier au mauvais format est refusé avec un message clair plutôt que mal interprété |
| Schémas JSON générés par mion RunTypes et obuild, versions figées | RunTypes n'a pas atteint la version 1.0 ; les schémas commités sont vérifiés par `schemas:verifier` à chaque `nub run test` |
| Les types des fichiers de données évitent `Date`, `Map` et les unions avec `Date` | RunTypes décrirait alors son propre encodage, pas le JSON naturel |
| `AGPL-3.0-or-later` pour le code et les schémas, CC BY-SA 4.0 pour les données et leurs dérivés | Les données adaptent le répertoire d'origine, publié sous CC BY-SA 4.0 ; conformité REUSE pour que chaque fichier déclare sa licence |
| `criteres` reste lié aux étoiles ; les critères vérifiés vont dans `criteres_confirmes` | Les étoiles sont une donnée de la source, les critères vérifiés dépendent de ce que la page de l'outil dit : aucune règle ne les fait coïncider sans sacrifier l'une des deux informations |
| Variantes de `classify.ts` essayées puis retirées (confiance recalibrée, retrait de critères) | Règles choisies en regardant les 57 outils enrichis ; l'une contredisait les étoiles, et `criteres_confirmes` répond au besoin |
| Critères vérifiés par le modèle de l'enrichissement (OpenAI), automatiquement dans `update`, plutôt que par un second modèle à la main | Une seule clé et un seul modèle, coût estimable par `--dry-run`, champ complet sans intervention ; l'indépendance du second modèle avait servi à l'analyse (accord sur 49 outils sur 57), et la citation vérifiable reste le garde-fou |
| Les catégories dans `categories.json`, référencées par identifiant | L'icône était répétée 60 fois pour 20 catégories, et un changement d'icône sur la page faisait bouger tous les outils de la catégorie ; la description de la catégorie a sa place dans ce fichier |
| Tests unitaires séparés des tests des données, lancés en parallèle par le runner | Les tests doivent passer sur un clone avant le premier `update` ; les fichiers de tests sont indépendants (fixtures, dossiers temporaires, port libre), donc un processus par fichier est sûr et deux fois plus rapide |
| Les deux environnements déclarés dans `package.json` (`engines`, `devEngines`) | Un seul fichier dit ce qu'exige l'exécution et ce qu'exige le développement ; nub provisionne le Node.js de `devEngines.runtime`, npm en avertit sans bloquer, et `.node-version` n'est gardé que pour fnm, nvm ou mise |
| Utiliser avec Node.js, développer avec nub | Un utilisateur ne doit installer que Node.js ; les scripts `update` et `sommaire` chargent `.env` eux-mêmes et n'ont besoin d'aucun outil de nub. Le développement garde nub pour la version de Node.js, le verrou des dépendances et les scripts ; un second verrou (`package-lock.json`) n'est pas maintenu |
| Graphiques en SVG, sans PNG | Les forges affichent les SVG autonomes dans le Markdown ; vectoriel net à toute taille, 8 fois moins lourd dans le dépôt, un appel vl-convert de moins par graphique. Seul l'export PDF par LaTeX y perd, personne ne le fait ici |
| Règle A pour « contrôle » : la nationalité mentionnée suffit | Les descriptions ne disent jamais qui possède l'entreprise ; sans convention, les IA divergent sur 21 outils. L'accord obtenu est une convention, pas une vérification de la propriété |
