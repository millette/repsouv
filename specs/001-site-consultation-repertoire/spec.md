# Feature Specification: Site de consultation du répertoire

**Feature Branch**: `001-site-consultation-repertoire`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Un site Web statique public pour consulter le répertoire, destiné aux organismes et aux petites équipes du Canada français. Première tranche, en lecture seule: page d'accueil par catégorie, fiche par outil, filtres et recherche, outils non enrichis affichés sans champs vides. Limites: données lues telles quelles, champs produits par IA signalés, attribution CC BY-SA 4.0 sur chaque page, lecture sans JavaScript, français, accessibilité."

## Clarifications

### Session 2026-11-13

- Q: Sur la fiche d'un outil, quels critères de souveraineté le site doit-il afficher ? → A: Les critères vérifiés (avec citation), les critères déduits des étoiles et le second avis du modèle (évaluation enrichie).
- Q: La fiche doit-elle aussi afficher le pays de l'éditeur, le logiciel dont un service est une instance et les données Open Hub ? → A: Oui, les trois.
- Q: Dans chaque type de filtre, peut-on choisir une seule valeur ou plusieurs à la fois ? → A: Plusieurs valeurs dans chaque type: « ou » à l'intérieur d'un type, « et » entre les types.
- Q: Les filtres et la recherche actifs doivent-ils se retrouver dans l'adresse de la page ? → A: Oui, l'adresse reflète les choix et un lien restaure la liste filtrée.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parcourir le répertoire par catégorie (Priority: P1)

Une personne responsable des outils numériques d'un organisme arrive sur la page d'accueil. Elle y
voit tous les outils du répertoire, regroupés par catégorie. Pour chaque outil, elle lit son nom,
son score en étoiles, le statut de son code source et sa description courte, puis ouvre la fiche de
celui qui l'intéresse.

**Why this priority**: c'est la raison d'être du site. Sans cette liste, rien d'autre n'est
consultable; avec elle seule, le répertoire est déjà lisible par quelqu'un qui n'ouvre pas de
fichier JSON.

**Independent Test**: ouvrir la page d'accueil et vérifier que chaque outil actif du répertoire y
figure une fois, sous sa catégorie, avec ses quatre informations, et qu'un lien mène à sa fiche.

**Acceptance Scenarios**:

1. **Given** le répertoire publié, **When** la personne ouvre la page d'accueil, **Then** elle voit
   chaque catégorie avec son nom, son icône et sa description, suivie des outils qui s'y rattachent.
2. **Given** un outil dont le score vient de sa source, **When** il est listé, **Then** son score
   s'affiche en étoiles sur 3, avec un équivalent textuel (« 2 étoiles sur 3 »).
3. **Given** un outil dont le score est estimé, **When** il est listé, **Then** son score se
   distingue visiblement et textuellement d'un score donné par la source (« score estimé »).
4. **Given** un outil enrichi, **When** il est listé, **Then** le statut de son code source (libre,
   partiellement libre, code source disponible, propriétaire) s'affiche et est signalé comme produit
   par IA, à vérifier.
5. **Given** un outil non enrichi, **When** il est listé, **Then** il s'affiche avec son nom, son
   score et sa description, sans emplacement vide pour le statut du code source.
6. **Given** un navigateur où JavaScript est désactivé, **When** la personne ouvre la page
   d'accueil, **Then** toute la liste est lisible et chaque lien vers une fiche fonctionne.

---

### User Story 2 - Lire la fiche d'un outil (Priority: P1)

La personne ouvre la fiche d'un outil pour décider s'il convient à son organisme. Elle y lit la
description longue, ce que disent les trois critères de souveraineté (vérifiés avec la citation qui
appuie chaque verdict, déduits des étoiles, et second avis du modèle), la licence, le dépôt de
code, les tags, le pays de l'éditeur, le logiciel derrière un service, les données publiques
d'Open Hub, les services que l'outil remplace, les outils apparentés et la source dont l'outil
provient. Elle sait, pour chaque information, si elle
vient de la source ou d'un modèle d'IA.

**Why this priority**: la liste ne suffit pas à choisir un outil. La fiche porte ce que le dépôt
ajoute à la source (enrichissement, critères vérifiés, citations) et c'est là que l'honnêteté sur
la provenance compte le plus.

**Independent Test**: ouvrir la fiche d'un outil enrichi, puis celle d'un outil non enrichi, et
vérifier que la première montre tous les champs prévus avec leur provenance, et que la seconde ne
montre que les champs de la source, sans titre ni emplacement vide.

**Acceptance Scenarios**:

1. **Given** un outil enrichi, **When** la personne ouvre sa fiche, **Then** elle y trouve la
   description longue, la licence, le dépôt de code, les tags, le statut du code source et les
   critères vérifiés, chacun signalé comme produit par IA, avec l'avertissement « à vérifier ».
2. **Given** un outil dont les critères ont été vérifiés, **When** la personne lit la section des
   critères, **Then** elle voit pour chacun des trois critères son verdict (confirmé, infirmé ou
   indéterminé) et, pour un critère confirmé ou infirmé, la citation mot pour mot qui appuie le
   verdict.
3. **Given** un outil qui remplace des services, **When** la personne ouvre sa fiche, **Then** les
   services remplacés sont listés avec leur lien.
4. **Given** un outil apparenté à d'autres (`voir_aussi`), **When** la personne ouvre sa fiche,
   **Then** chaque outil apparenté présent au répertoire est un lien vers sa propre fiche.
5. **Given** n'importe quel outil, **When** la personne ouvre sa fiche, **Then** elle voit le nom
   de la source dont il provient, un lien vers cette source et un lien vers le site de l'outil.
6. **Given** un outil non enrichi, **When** la personne ouvre sa fiche, **Then** elle ne voit que
   les champs de sa source (nom, catégorie, score, description, lien, source, pays et services
   remplacés s'il y en a) et les critères déduits par le dépôt, signalés comme une déduction, sans
   section vide, sans mention « inconnu » et sans avertissement d'IA sans objet.
7. **Given** un outil enrichi, **When** la personne lit la section des critères, **Then** elle
   distingue trois lectures nommées et expliquées: les critères vérifiés d'après la page de l'outil
   (IA, avec citation), les critères déduits des étoiles (heuristique du dépôt, avec sa fiabilité)
   et le second avis du modèle (IA, avec l'explication de l'écart quand il diffère du répertoire).
8. **Given** un service qui est une instance d'un logiciel, **When** la personne ouvre sa fiche,
   **Then** le logiciel est nommé et lié, et la fiche dit que la description et les critères
   portent sur ce logiciel.
9. **Given** un outil dont la source donne le pays de l'éditeur, **When** la personne ouvre sa
    fiche, **Then** le pays s'affiche par son nom en français, comme une affirmation de la source.
10. **Given** un outil qui a des données Open Hub, **When** la personne ouvre sa fiche, **Then**
    elle voit l'organisation porteuse, l'activité, les licences déclarées, le langage principal,
    le nombre de contributeurs et de commits sur 12 mois, la date de lecture et un lien vers la
    page Open Hub du projet, présentés comme des données publiques d'Open Hub.
11. **Given** un outil enrichi dont un champ est absent (pas de dépôt, pas de licence connue),
   **When** la personne ouvre sa fiche, **Then** ce champ n'apparaît pas plutôt que d'apparaître
   vide.

---

### User Story 3 - Trouver un outil par filtre ou par nom (Priority: P2)

La personne cherche un outil précis ou veut réduire la liste à ce qui la concerne. Elle filtre par
catégorie, par tag et par statut du code source, en choisissant une ou plusieurs valeurs de chaque
type, et cherche par nom. La liste se réduit aux outils qui répondent à ses choix, elle sait
combien il en reste, et elle peut partager l'adresse de la liste filtrée.

**Why this priority**: avec 154 outils en 25 catégories, la liste complète se parcourt mais se
fouille mal. Les filtres rendent le site utile pour une recherche ciblée, mais le répertoire reste
consultable sans eux.

**Independent Test**: sur la page d'accueil, appliquer un filtre de chaque type et une recherche,
et vérifier que les outils affichés sont exactement ceux des données qui répondent aux choix.

**Acceptance Scenarios**:

1. **Given** la page d'accueil, **When** la personne choisit une ou plusieurs catégories, **Then**
   seuls les outils de l'une de ces catégories restent affichés.
2. **Given** la page d'accueil, **When** la personne choisit un ou plusieurs tags, **Then** seuls
   les outils qui portent au moins un de ces tags restent affichés.
3. **Given** la page d'accueil, **When** la personne choisit un ou plusieurs statuts du code
   source, **Then** seuls les outils de l'un de ces statuts restent affichés; un choix « pas encore
   enrichi » montre les outils sans statut.
4. **Given** la page d'accueil, **When** la personne tape une partie d'un nom, **Then** seuls les
   outils dont le nom la contient restent affichés, sans égard à la casse ni aux accents.
5. **Given** des choix dans plusieurs types de filtre et une recherche actifs, **When** la liste se
   met à jour, **Then** seuls restent les outils qui répondent à chaque type de filtre (au moins
   une valeur choisie dans chacun) et à la recherche, et le nombre de résultats est affiché et
   annoncé aux lecteurs d'écran.
6. **Given** des filtres ou une recherche actifs, **When** la personne copie l'adresse de la page
   et l'ouvre ailleurs, **Then** la même liste filtrée s'affiche, avec les mêmes choix cochés.
7. **Given** des filtres appliqués l'un après l'autre, **When** la personne utilise le bouton
   précédent du navigateur, **Then** elle retrouve l'état précédent des filtres.
8. **Given** des choix qui ne correspondent à aucun outil, **When** la liste se met à jour,
   **Then** un message dit qu'aucun outil ne correspond et propose d'effacer les filtres.
9. **Given** un navigateur où JavaScript est désactivé, **When** la personne ouvre la page
   d'accueil, **Then** la liste complète reste lisible et les filtres qui ne peuvent pas
   fonctionner ne s'affichent pas comme s'ils fonctionnaient.

---

### User Story 4 - Savoir d'où viennent les données et comment les réutiliser (Priority: P2)

La personne veut citer le répertoire ou réutiliser une fiche. Sur chaque page, elle trouve à qui
revient le contenu, sous quelle licence il est partagé, et ce qui, dans ce qu'elle lit, a été
produit par un modèle d'IA plutôt que par la source.

**Why this priority**: l'attribution et le partage à l'identique sont des obligations de la
licence des données, et la constitution du projet interdit de présenter du contenu généré comme
vérifié. Un site qui les omettrait ne pourrait pas être publié.

**Independent Test**: ouvrir la page d'accueil et trois fiches de sources différentes, et vérifier
sur chacune la présence de l'attribution, de la licence et des signalements d'IA.

**Acceptance Scenarios**:

1. **Given** n'importe quelle page du site, **When** la personne en lit le pied, **Then** elle y
   trouve l'attribution aux auteur·trices du répertoire Praxis (Sven Buridans, François Delnooz,
   Marie-Renee Duguay), la licence CC BY-SA 4.0 avec son lien, et un lien vers le répertoire
   d'origine.
2. **Given** la fiche d'un outil qui ne vient pas de Praxis, **When** la personne la lit, **Then**
   la source réelle de l'outil est nommée et liée, et n'est pas attribuée à Praxis.
3. **Given** un champ produit par IA, **When** il s'affiche, **Then** le signalement est lisible
   sans couleur ni survol, et un lecteur d'écran l'annonce avec le champ.
4. **Given** un critère vérifié, **When** il s'affiche, **Then** la page dit que le verdict est
   celui d'un modèle d'IA et que la citation permet de le contrôler.

---

### Edge Cases

- Un outil marqué comme retiré (`removed`) dans les données: il n'apparaît ni dans la liste ni
  dans les filtres, et n'a pas de fiche.
- Deux outils dont les noms donneraient la même adresse de fiche: chaque outil garde une adresse
  unique et stable, et la génération du site échoue avec un message clair plutôt que d'écraser une
  fiche.
- Un outil listé dans `voir_aussi` qui n'a pas de fiche (nom d'un logiciel absent du répertoire, ou
  outil retiré): son nom s'affiche en texte, sans lien mort.
- Une catégorie sans description, ou sans outil actif: la catégorie sans description s'affiche
  sans paragraphe vide; la catégorie sans outil ne s'affiche pas.
- Une adresse partagée qui nomme une catégorie, un tag ou un statut qui n'existe plus: la valeur
  inconnue est ignorée, les autres choix s'appliquent, et la page ne tombe pas en erreur.
- Un outil enrichi dont Open Hub ne donne pas une valeur (langage, contributeurs): la ligne
  correspondante n'apparaît pas.
- Un outil au score estimé pas encore enrichi, dont la fiabilité de la déduction est
  « indéterminée »: la fiche le dit en clair plutôt que d'afficher une fiabilité vide.
- Un outil enrichi sans critères vérifiés, ou dont un critère est indéterminé: la section dit que
  la page de l'outil ne permet pas de conclure, sans inventer de citation.
- Une description longue rédigée en Markdown (titres, listes, gras): elle est rendue en texte mis
  en forme, sans que ses titres cassent la hiérarchie des titres de la page.
- Un nom ou une description contenant des caractères spéciaux (apostrophes, esperluettes, barres
  obliques): ils s'affichent tels quels et ne cassent ni la page ni l'adresse de la fiche.
- Les données changent (outil ajouté, enrichi ou retiré): le site reflète le nouvel état dès qu'il
  est régénéré, sans intervention manuelle sur les pages.
- Un fichier de données manquant ou invalide au moment de générer le site: la génération échoue
  avec un message qui nomme le fichier, plutôt que de publier un site partiel.

## Requirements *(mandatory)*

### Functional Requirements

**Page d'accueil**

- **FR-001**: Le site DOIT offrir une page d'accueil qui liste tous les outils actifs du
  répertoire, regroupés par catégorie, dans l'ordre des catégories des données.
- **FR-002**: Chaque catégorie affichée DOIT montrer son nom, son icône et, quand elle existe, sa
  description, signalée comme produite par IA.
- **FR-003**: Chaque outil listé DOIT montrer son nom, son score en étoiles sur 3, le statut de son
  code source quand il est connu, sa description courte (celle de la source) et un lien vers sa
  fiche.
- **FR-004**: Un score estimé (`score_estime`) DOIT se distinguer d'un score donné par la source,
  de façon visible et textuelle.

**Fiche d'outil**

- **FR-005**: Chaque outil actif DOIT avoir sa propre fiche, à une adresse unique, stable d'une
  génération à l'autre tant que son nom ne change pas.
- **FR-006**: La fiche d'un outil enrichi DOIT montrer, quand ils existent: la description longue,
  les critères de souveraineté (vérifiés, déduits et second avis), la licence (identifiant reconnu
  ou licence maison avec son lien), le dépôt de code, les tags avec leur description, le pays de
  l'éditeur, le logiciel dont l'outil est une instance, les données Open Hub, les services
  remplacés, les outils apparentés et la source dont l'outil provient.
- **FR-007**: Pour chacun des trois critères, la fiche DOIT montrer la question du critère, son
  verdict (confirmé, infirmé ou indéterminé) et, pour un verdict confirmé ou infirmé, la citation
  qui l'appuie, reproduite sans modification.
- **FR-008**: La fiche DOIT nommer la source dont l'outil provient, lier cette source et lier le
  site de l'outil.
- **FR-009**: Chaque outil apparenté qui a une fiche DOIT y renvoyer par un lien; les autres
  s'affichent en texte.
- **FR-010**: Un outil non enrichi DOIT s'afficher, dans la liste comme sur sa fiche, avec les
  seuls champs de sa source et, sur sa fiche, les critères déduits par le dépôt (FR-032); aucun
  champ absent ne DOIT produire de titre, d'emplacement ou de mention vide.
- **FR-011**: Un champ absent d'un outil enrichi NE DOIT PAS s'afficher.

**Filtres et recherche**

- **FR-012**: La page d'accueil DOIT permettre de filtrer les outils par catégorie, par tag et par
  statut du code source, y compris « pas encore enrichi », en choisissant une ou plusieurs valeurs
  dans chaque type.
- **FR-013**: La page d'accueil DOIT permettre de chercher un outil par une partie de son nom, sans
  égard à la casse ni aux accents.
- **FR-014**: Les filtres et la recherche DOIVENT se combiner: à l'intérieur d'un type, un outil
  est retenu s'il répond à au moins une des valeurs choisies; entre les types et avec la recherche,
  il doit répondre à tous. Un type sans valeur choisie ne filtre rien.
- **FR-036**: L'adresse de la page DOIT refléter les filtres et la recherche actifs; ouvrir cette
  adresse DOIT restaurer la même liste et les mêmes choix, et le bouton précédent du navigateur
  DOIT ramener à l'état précédent. Une valeur inconnue dans l'adresse est ignorée.
- **FR-015**: Le nombre d'outils affichés DOIT être indiqué et mis à jour à chaque changement, et
  un message DOIT s'afficher quand aucun outil ne correspond, avec un moyen d'effacer les choix.

**Provenance et honnêteté**

- **FR-016**: Chaque champ produit par un modèle d'IA (description longue, tags, statut du code
  source, licence, dépôt de code, critères vérifiés, second avis, description de catégorie) DOIT
  être signalé comme tel partout où il s'affiche, avec l'avertissement « à vérifier ».
- **FR-032**: La fiche DOIT montrer les critères déduits des étoiles (`criteres`) et la fiabilité
  de cette déduction (`confiance`), signalés comme une heuristique de ce dépôt et non comme une
  donnée de la source ni comme un verdict vérifié.
- **FR-033**: La fiche d'un outil enrichi DOIT montrer le second avis du modèle
  (`evaluation_enrichie`): son score, ses critères, sa fiabilité et, quand il diffère du
  répertoire, l'explication de l'écart; le tout signalé comme produit par IA.
- **FR-034**: Les trois lectures des critères (vérifiés, déduits, second avis) DOIVENT être
  nommées, expliquées en une phrase chacune et visuellement séparées, pour qu'on ne les confonde
  pas.
- **FR-035**: La fiche DOIT montrer, quand ils existent: le pays de l'éditeur (nom en français,
  présenté comme une affirmation de la source), le logiciel dont l'outil est une instance (nom et
  lien, avec la mention que la description et les critères portent sur ce logiciel) et les données
  Open Hub (organisation, activité, licences déclarées, langage principal, taille, contributeurs et
  commits sur 12 mois, date de lecture, lien vers la page du projet), présentées comme des données
  publiques d'Open Hub.
- **FR-017**: Le signalement d'IA NE DOIT PAS reposer sur la couleur seule ni sur le survol.
- **FR-018**: La section des critères vérifiés DOIT dire que le verdict est celui d'un modèle d'IA
  et que la citation permet de le contrôler.
- **FR-019**: Chaque page DOIT porter l'attribution aux auteur·trices du répertoire Praxis, la
  mention et le lien de la licence CC BY-SA 4.0, et un lien vers le répertoire d'origine.
- **FR-020**: Le site DOIT créditer les autres sources des données (Services FACiLes, Charles)
  telles que le dépôt les déclare, sans attribuer leurs outils à Praxis.

**Données**

- **FR-021**: Le site DOIT lire les fichiers de données existants (`outils.json`,
  `categories.json`, `criteres.json`, `tags.json`, `sources.json`) tels quels.
- **FR-022**: La fonctionnalité NE DOIT changer ni la forme de ces fichiers, ni leurs schémas, ni
  les scripts qui les produisent.
- **FR-023**: Les outils marqués comme retirés NE DOIVENT apparaître nulle part sur le site.
- **FR-024**: La génération du site DOIT échouer avec un message clair, plutôt que publier un site
  partiel, si un fichier de données manque, est invalide, ou si deux outils obtiendraient la même
  adresse.
- **FR-025**: La génération du site NE DOIT faire aucun appel à une API payante.

**Lecture, langue et accessibilité**

- **FR-026**: Tout le contenu (liste, fiches, attribution, signalements) DOIT être lisible et
  navigable sans JavaScript; seuls les filtres et la recherche PEUVENT en demander.
- **FR-027**: Sans JavaScript, les commandes de filtre et de recherche qui ne fonctionnent pas NE
  DOIVENT PAS s'afficher comme utilisables.
- **FR-028**: Tout le texte du site DOIT être en français, et les pages DOIVENT déclarer cette
  langue.
- **FR-029**: Toutes les fonctions du site DOIVENT être utilisables au clavier seul, avec un
  indicateur de focus visible et un ordre de parcours logique.
- **FR-030**: Les pages DOIVENT être utilisables avec un lecteur d'écran: structure de titres
  cohérente, régions nommées, équivalent textuel pour les étoiles et les icônes, libellé pour
  chaque commande de filtre, annonce du nombre de résultats.
- **FR-031**: Le site DOIT être lisible sur un écran de téléphone comme sur un écran d'ordinateur.

### Key Entities *(include if feature involves data)*

- **Outil**: un outil ou service numérique du répertoire. Porte les champs de sa source (nom,
  catégorie, score, description courte, lien, source, parfois pays, logiciel sous-jacent et
  services remplacés), ce que le dépôt en déduit (critères déduits, outils apparentés) et, s'il est
  enrichi, les
  champs produits par IA (description longue, tags, statut du code source, licence, dépôt de code,
  second avis, critères vérifiés avec citations) et parfois des données publiques d'Open Hub. Peut avoir un score
  estimé. Peut être retiré.
- **Catégorie**: regroupe des outils. Porte un nom, une icône et une description produite par IA.
- **Critère de souveraineté**: une des trois questions du répertoire (où restent les données, qui
  contrôle l'outil, de qui il dépend). Chaque outil vérifié a un verdict par critère.
- **Verdict**: confirmé, infirmé ou indéterminé, pour un critère et un outil; appuyé par une
  citation quand il est confirmé ou infirmé; produit par un modèle d'IA.
- **Critères déduits**: les critères que les étoiles représentent, déduits de la description par
  une heuristique du dépôt, avec une fiabilité (élevée, moyenne, faible ou indéterminée).
- **Second avis**: l'évaluation du modèle d'IA sur la souveraineté de l'outil (score, critères,
  fiabilité, explication de l'écart avec le répertoire).
- **Données Open Hub**: données publiques d'un projet de logiciel libre (organisation, activité,
  licences déclarées, langage, taille, contributeurs, commits), avec leur date de lecture.
- **Tag**: un mot-clé d'un vocabulaire restreint, avec sa description; un outil enrichi en porte de
  1 à 5.
- **Source**: le répertoire ou la collection dont un outil provient (Praxis, Services FACiLes,
  Charles, ou une source ajoutée à la main), avec son nom et son lien.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des outils actifs du répertoire apparaissent une fois sur la page d'accueil et
  ont une fiche (154 outils au 2026-11-13).
- **SC-002**: À partir de la page d'accueil, une personne trouve un outil dont elle connaît le nom
  et ouvre sa fiche en moins de 30 secondes.
- **SC-003**: Une personne réduit la liste aux outils libres d'une catégorie donnée en trois
  actions ou moins.
- **SC-011**: Pour 100 % des combinaisons de filtres essayées, ouvrir l'adresse copiée affiche
  exactement la même liste d'outils que celle de la page d'origine.
- **SC-012**: Sur 100 % des fiches, chaque lecture des critères porte son nom et sa provenance
  (source, heuristique du dépôt ou IA); aucune n'est présentée sans elle.
- **SC-004**: 100 % des pages portent l'attribution, la licence CC BY-SA 4.0 et le lien vers le
  répertoire d'origine; 100 % des fiches lient la source de l'outil.
- **SC-005**: 100 % des champs produits par IA affichés portent le signalement « à vérifier »; 0
  champ généré est présenté sans lui.
- **SC-006**: 0 titre, emplacement ou mention vide sur les fiches des outils non enrichis (12 au
  2026-11-13) et sur les champs absents des outils enrichis.
- **SC-007**: JavaScript désactivé, 100 % du contenu de la page d'accueil et des fiches reste
  lisible et 100 % des liens internes fonctionnent.
- **SC-008**: Un contrôle automatisé d'accessibilité ne relève aucune erreur de niveau A ou AA
  (WCAG 2.1) sur la page d'accueil et sur un échantillon de fiches, et un parcours complet au
  clavier seul réussit (accueil, filtre, fiche, retour).
- **SC-009**: Après une mise à jour des données, le site régénéré reflète le nouvel état sans
  aucune modification manuelle des pages, et sans aucune dépense.
- **SC-010**: Après la fonctionnalité, les fichiers de données, leurs schémas et les scripts qui
  les produisent sont identiques à ce qu'ils étaient avant, et les contrôles existants du dépôt
  passent toujours.

## Assumptions

- **Nombre d'outils non enrichis**: la demande parle de 14 outils non enrichis; les données en
  comptent 12 au 2026-11-13 (3 de Praxis, 9 de Charles). La spécification ne fixe pas ce nombre:
  la règle s'applique à tout outil sans enrichissement, quel qu'en soit le compte.
- **Critères sur la page d'accueil**: la liste ne montre aucun critère; les trois lectures ne
  s'affichent que sur la fiche.
- **Dates**: les dates des outils (`derniere_modification`, `enrichi_le`) ne sont pas affichées
  dans cette tranche, sauf la date de lecture des données Open Hub et la date des critères
  vérifiés, qui disent de quand datent ces informations.
- **Outils non enrichis**: « les seuls champs de leur source » s'entend avec les critères déduits
  par le dépôt, que la clarification demande d'afficher; ils sont signalés comme une déduction.
- **Description courte**: c'est le champ `description`, tel que la source le donne (pour Charles,
  tel que l'extracteur le compose à partir des champs de la source). Elle n'est pas signalée comme
  produite par IA.
- **Statut du code source sur la page d'accueil**: c'est un champ produit par IA; il porte donc le
  signalement aussi dans la liste, sous une forme assez courte pour ne pas l'alourdir.
- **Filtres et JavaScript**: sans JavaScript, une adresse qui porte des filtres affiche la liste
  complète; la restauration des filtres depuis l'adresse fait partie de ce qui peut en demander.
- **Attribution**: en plus des auteur·trices de Praxis, le site crédite les Services FACiLes et
  Charles, parce que le dépôt déclare ces sources et que la constitution l'exige (principe III).
- **Public**: des personnes sans formation technique, qui consultent le site sur ordinateur ou sur
  téléphone, avec un navigateur courant et à jour.
- **Publication**: le site est fait de pages statiques, publiable chez n'importe quel hébergeur de
  fichiers statiques. Le choix de l'hébergeur, de l'adresse publique et du déclenchement de la
  publication relève du plan, pas de cette spécification.
- **Hors de cette tranche**: soumission d'outils, comptes, commentaires, édition des données,
  sommaire statistique et graphiques, version anglaise.
- **Constitution**: la fonctionnalité suit la constitution du projet (version 1.1.0), en
  particulier la provenance des champs (principe II), les licences (principe III), l'absence de
  coût caché (principe IV) et le français (principe VI).
