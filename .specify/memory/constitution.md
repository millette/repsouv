<!--
SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
SPDX-License-Identifier: AGPL-3.0-or-later
-->

<!--
Rapport d'impact
- Version: 1.2.1 → 1.3.0 (MINEUR: une règle des contraintes techniques change de portée).
- Raison: depuis le monorepo, les versions des dépendances partagées viennent d'un catalogue
  (`workspaces.catalog`, renvois `catalog:`) que npm ne lit pas; installer les dépendances demande donc nub.
  Décision de Robin Millette (2026-11-13): garder le catalogue.
- Règles modifiées: principe V (« Pourquoi »: les dépendances d'exécution s'installent avec nub) et
  Contraintes techniques, « Utilisation »: les scripts d'utilisation DOIVENT toujours s'exécuter
  avec Node.js seul, sans nub; leurs dépendances s'installent avec nub (`nub install`). Avant: « fonctionner avec
  Node.js seul, sans nub », installation comprise.
- Principes modifiés: aucun. Sections ajoutées: aucune. Sections retirées: aucune.
- Gabarits (`.specify/templates/`): aucun ne cite cette règle; rien à aligner.
- Documentation alignée: `README.md` et `implementation.md` (installation par nub, version citée),
  `historique.md` (amendement noté).
- À faire plus tard: rien.
-->

# outils-souverainete-numerique Constitution

## Core Principles

### I. Les données d'abord

Les cinq fichiers JSON de `donnees/` (`outils.json`, `categories.json`, `criteres.json`, `tags.json` et
`sources.json`) sont le produit; les scripts existent pour les produire et les maintenir.

- Tout changement de forme des données DOIT passer par les types TypeScript, puis par
  `nub run schemas`, qui régénère `donnees/schemas/*.schema.json`.
- `nub run schemas:verifier` DOIT rester vert: un schéma commité ne diverge jamais des types.
- Les champs et les identifiants existants DOIVENT rester compatibles; sinon, la rupture DOIT être
  documentée dans `historique.md`.

Pourquoi: les données sont lues par d'autres que ce dépôt; un champ renommé ou un identifiant
changé sans trace casse leurs usages en silence.

### II. Provenance et honnêteté

- Chaque champ DOIT dire d'où il vient: de la source, d'une heuristique, d'un modèle d'IA ou d'un
  calcul.
- Chaque outil DOIT être rattaché à une source de `sources.json` par `source_repertoire_id`.
- Un verdict d'IA DOIT s'accompagner d'une citation vérifiable.
- Rien de généré ne DOIT être présenté comme vérifié.

Pourquoi: la citation permet de contrôler chaque verdict, mais le verdict reste celui d'un modèle;
qui lit les données doit pouvoir distinguer ce que la source affirme de ce que le dépôt en déduit.

### III. Licences REUSE

- Le code est sous `AGPL-3.0-or-later`.
- Les données et ce qui en est dérivé sont sous `CC-BY-SA-4.0`, avec attribution aux auteur·trices
  de Praxis et aux autres sources déclarées dans `REUSE.toml`.
- Tout nouveau fichier DOIT porter ses en-têtes SPDX ou une annotation dans `REUSE.toml`, y compris
  sous `specs/**`.
- `nub run licences` DOIT passer.

Pourquoi: les données sont adaptées d'œuvres sous CC BY-SA 4.0; l'attribution et le partage à
l'identique sont des obligations, pas une politesse.

### IV. Les coûts sont explicites

- Tout appel à une API payante DOIT être chiffré par `--dry-run` (jetons et coût estimés, sans rien
  écrire).
- La première dépense DOIT être confirmée avant d'avoir lieu.
- Sans clé, l'appel DOIT être sauté proprement, avec un message qui le dit.
- Une source inchangée ne DOIT rien coûter.

Pourquoi: qui lance une mise à jour doit savoir ce qu'elle coûtera avant de payer, et pouvoir la
relancer aussi souvent que voulu sans payer deux fois.

### V. Tests d'abord, simplicité

- Le cycle est: test rouge, code minimal pour le faire passer, puis nettoyage.
- Les tests unitaires sans données (`test/*.test.ts` de `packages/commun` et de `packages/scripts`)
  DOIVENT rester séparés des tests des données réelles (`packages/scripts/test/donnees/`); les
  premiers passent avant le premier import.
- Aucun test ne DOIT être désactivé: un test qui échoue se corrige.
- Pas d'abstraction prématurée.
- Pas de dépendance d'exécution sans justification écrite.

Pourquoi: un utilisateur n'installe que Node.js et, avec nub, les dépendances d'exécution; chaque dépendance
et chaque abstraction de plus est un coût pour lui et pour qui relira le code.

### VI. Tout en français

- La documentation, les identifiants de données, les messages de commit et les artefacts Spec Kit
  (`spec.md`, `plan.md`, `tasks.md`) DOIVENT être en français.
- Seuls les titres imposés par les gabarits restent en anglais.

Pourquoi: le répertoire s'adresse à des organismes francophones; une seule langue garde les
données, le code et la documentation cohérents.

## Contraintes techniques

- **Exécution**: Node.js 26 (`engines.node`: `>=26 <27`), qui exécute le TypeScript tel quel.
- **Développement**: nub (`nub`, `nub run`, `nub x`); jamais npm, npx, tsc ni ts-node.
- **Utilisation**: les scripts d'utilisation (`node packages/scripts/update.ts`,
  `node packages/scripts/sommaire.ts`) DOIVENT s'exécuter avec Node.js seul, sans nub; leurs dépendances
  s'installent avec nub (`nub install`), npm ne lisant pas le catalogue des versions partagées (`catalog:`).
- **Ligne de commande**: rg, fd, jaq et wget2 plutôt que grep, find, jq et wget.

## Flux de travail

- Pour une fonctionnalité menée avec Spec Kit, `specs/NNN-nom/plan.md` et `tasks.md` remplacent
  `IMPLEMENTATION_PLAN.md`.
- Le travail se fait sur une branche, jamais directement sur `main`, dans trois cas:
  - une fonctionnalité menée avec Spec Kit, sur la branche `NNN-nom` créée par `/speckit-specify`;
  - un changement de forme des données, ou une rupture de compatibilité (principe I);
  - tout changement de code qui demande plus d'un commit.
- Un changement qui tient en un seul commit et ne touche ni la forme des données ni leur
  compatibilité PEUT aller directement sur `main`: correction ponctuelle, documentation, mise à
  jour des données par les scripts.
- Une branche n'est fusionnée dans `main` que lorsque les trois contrôles ci-dessous passent; elle
  est supprimée après la fusion.
- Avant chaque commit, `nub run test`, `nub run typecheck` et `nub run licences` DOIVENT passer.
- Les messages de commit expliquent le pourquoi, dans le style de l'historique du dépôt.
- À la fin d'une fonctionnalité, son contenu durable est reporté dans `implementation.md` et
  `historique.md`. Son dossier `specs/NNN-nom/` est conservé: la spécification, le plan, les
  contrats et les tâches restent la trace de ce qui a été demandé et décidé, et le code peut y
  renvoyer.

## Governance

- La constitution prime sur les gabarits: en cas de conflit, c'est le gabarit ou l'artefact qui
  s'aligne.
- Toute modification de la constitution DOIT être versionnée selon le versionnage sémantique et
  notée dans `historique.md`:
  - MAJEUR: retrait ou redéfinition incompatible d'un principe ou d'une règle de gouvernance;
  - MINEUR: ajout d'un principe ou d'une section, ou extension notable d'une règle;
  - CORRECTIF: clarification, reformulation ou correction sans changement de sens.

**Version**: 1.3.0 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-13
