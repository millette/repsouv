# Feature Specification: Explorateur interactif des outils

**Feature Branch**: `002-explorateur-outils`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Un explorateur interactif pour parcourir les outils du répertoire, sur le site de consultation, destiné aux personnes qui comparent plusieurs outils avant d'en choisir un. Deuxième tranche, après le site en lecture seule (001): page « Explorer » mise à jour sans rechargement, tri, filtres supplémentaires, vues en cartes et en tableau, comparaison côte à côte de deux à quatre outils, nombre de résultats annoncé, état dans l'adresse."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explorer, trier et filtrer tous les outils (Priority: P1)

Une personne qui cherche un outil ouvre la page « Explorer ». Elle y voit tous les outils actifs du
répertoire, les trie par nom, par score ou par catégorie, et réduit la liste par les filtres de
l'accueil et par des filtres de plus: score minimal, verdict de chaque critère de souveraineté,
pays de l'éditeur, source du répertoire, outil enrichi ou non. La liste se met à jour à chaque
choix, sans recharger la page, et elle sait toujours combien d'outils restent.

**Why this priority**: c'est le cœur de l'explorateur. Sans tri ni filtres supplémentaires, la page
n'apporte rien de plus que l'accueil; avec eux seuls, elle sert déjà à repérer les outils qui
répondent à des exigences précises.

**Independent Test**: ouvrir « Explorer », appliquer un tri et un filtre de chaque type, et vérifier
que les outils affichés et leur ordre sont exactement ceux que les données donnent.

**Acceptance Scenarios**:

1. **Given** la page « Explorer » chargée, **When** aucun choix n'est fait, **Then** tous les outils
   actifs sont affichés, dans l'ordre par défaut, et le nombre de résultats est indiqué.
2. **Given** la liste affichée, **When** la personne choisit un tri (nom, score ou catégorie) et un
   sens (croissant ou décroissant), **Then** la liste se réordonne sans recharger la page, et le tri
   en cours est indiqué en texte.
3. **Given** la liste affichée, **When** la personne choisit un score minimal, **Then** seuls les
   outils dont le score atteint ce minimum restent.
4. **Given** la liste affichée, **When** la personne exige un verdict pour un critère (par exemple
   « données: confirmé »), **Then** seuls les outils dont le critère vérifié a ce verdict restent;
   un outil sans critères vérifiés n'est pas retenu.
5. **Given** la liste affichée, **When** la personne choisit un ou plusieurs pays, une ou plusieurs
   sources, ou « enrichi » ou « non enrichi », **Then** seuls les outils qui y répondent restent.
6. **Given** des choix dans plusieurs filtres, **When** la liste se met à jour, **Then** un outil
   n'est retenu que s'il répond à tous les filtres actifs; à l'intérieur d'un filtre à choix
   multiple, il suffit qu'il réponde à une des valeurs choisies.
7. **Given** n'importe quel changement de tri ou de filtre, **When** la liste se met à jour,
   **Then** le nombre de résultats est affiché et annoncé aux lecteurs d'écran.
8. **Given** des choix qui ne retiennent aucun outil, **When** la liste se met à jour, **Then** un
   message le dit et propose d'effacer les choix.
9. **Given** un outil dans les résultats, **When** la personne active son nom, **Then** elle arrive
   sur la fiche de cet outil.

---

### User Story 2 - Comparer deux à quatre outils côte à côte (Priority: P1)

La personne a repéré quelques candidats. Elle les choisit dans la liste et ouvre une comparaison
côte à côte: pour chacun, le score, les critères de souveraineté, le statut du code source, la
licence, le pays et les services remplacés, alignés ligne par ligne.

**Why this priority**: l'explorateur s'adresse aux personnes qui comparent plusieurs outils avant
d'en choisir un. La comparaison est ce que ni l'accueil ni les fiches n'offrent.

**Independent Test**: choisir deux, puis quatre outils, et vérifier que la comparaison montre pour
chacun les six informations prévues, tirées des données, avec leur provenance.

**Acceptance Scenarios**:

1. **Given** la liste affichée, **When** la personne choisit un seul outil à comparer, **Then** la
   comparaison n'est pas encore offerte et la page dit qu'il en faut au moins deux.
2. **Given** deux à quatre outils choisis, **When** la personne ouvre la comparaison, **Then** elle
   voit, pour chaque outil, son nom lié à sa fiche, son score, ses critères de souveraineté, le
   statut de son code source, sa licence, son pays et les services qu'il remplace, alignés par
   ligne.
3. **Given** quatre outils choisis, **When** la personne tente d'en choisir un cinquième, **Then**
   le choix est refusé et la page dit que la comparaison est limitée à quatre outils.
4. **Given** une comparaison affichée, **When** la personne retire un outil, **Then** la
   comparaison se met à jour; s'il n'en reste qu'un, elle se referme.
5. **Given** un outil comparé à qui une information manque (pas de licence connue, pas de pays),
   **When** la comparaison s'affiche, **Then** la case dit en clair que l'information n'est pas
   connue, sans rester vide.
6. **Given** un outil comparé que les filtres en cours ne retiennent plus, **When** la liste se met
   à jour, **Then** il reste dans la comparaison tant que la personne ne l'en retire pas.
7. **Given** une comparaison affichée, **When** un champ vient d'un modèle d'IA, **Then** il est
   signalé « à vérifier », et un score estimé se distingue d'un score de la source.

---

### User Story 3 - Choisir entre cartes et tableau (Priority: P2)

La personne préfère tantôt un aperçu en cartes, tantôt un tableau dense qui se lit en colonnes.
Elle passe d'une vue à l'autre: ce sont les mêmes résultats, dans le même ordre.

**Why this priority**: les deux vues servent des lectures différentes, mais une seule suffit pour
que l'explorateur soit utile.

**Independent Test**: appliquer des filtres et un tri, changer de vue, et vérifier que les deux
vues montrent les mêmes outils dans le même ordre.

**Acceptance Scenarios**:

1. **Given** des résultats en cartes, **When** la personne choisit la vue en tableau, **Then** les
   mêmes outils s'affichent dans le même ordre, un par ligne, avec des en-têtes de colonnes.
2. **Given** la vue en tableau, **When** la personne lit une ligne, **Then** elle y trouve le nom
   lié à la fiche, la catégorie, le score, le statut du code source, le pays et la source.
3. **Given** l'une ou l'autre vue, **When** la personne choisit un outil à comparer, **Then** le
   choix est conservé en changeant de vue.
4. **Given** la vue en tableau sur un téléphone, **When** la personne la consulte, **Then** le
   tableau reste lisible, sans que la page entière défile en largeur.

---

### User Story 4 - Partager et retrouver un état de l'explorateur (Priority: P2)

La personne veut envoyer à un collègue exactement ce qu'elle voit: le tri, les filtres, la vue et
les outils comparés. Elle copie l'adresse de la page; le collègue l'ouvre et retrouve le même état.
Le bouton précédent du navigateur la ramène à l'état d'avant.

**Why this priority**: une comparaison se discute à plusieurs. Sans adresse partageable, il faut
refaire tous les choix à la main.

**Independent Test**: faire des choix de tri, de filtres, de vue et de comparaison, copier
l'adresse, l'ouvrir ailleurs, et vérifier que tout est restauré; puis reculer dans l'historique.

**Acceptance Scenarios**:

1. **Given** des choix de tri, de filtres, de vue et d'outils comparés, **When** la personne copie
   l'adresse et l'ouvre ailleurs, **Then** le même tri, les mêmes filtres, la même vue et les mêmes
   outils comparés sont restaurés.
2. **Given** plusieurs choix faits l'un après l'autre, **When** la personne utilise le bouton
   précédent, **Then** elle retrouve l'état d'avant le dernier choix.
3. **Given** une adresse qui nomme une valeur qui n'existe plus (catégorie, tag, pays, outil
   comparé retiré du répertoire), **When** elle est ouverte, **Then** la valeur inconnue est
   ignorée, le reste s'applique, et la page ne tombe pas en erreur.
4. **Given** aucun choix, **When** la personne regarde l'adresse, **Then** elle est celle de la page
   « Explorer », sans paramètre.

---

### User Story 5 - Toujours savoir où en est la page (Priority: P2)

La personne ouvre « Explorer » sur une connexion lente, ou sans JavaScript, ou alors que les
données ne se chargent pas. Dans chaque cas, la page lui dit ce qui se passe et quoi faire: elle
n'affiche jamais une zone vide.

**Why this priority**: l'explorateur est la seule partie du site qui dépend de JavaScript et d'un
chargement de données. Sans ces états, une panne ressemble à un répertoire vide.

**Independent Test**: ouvrir la page avec un chargement ralenti, puis en échec, puis sans
JavaScript, et vérifier le message de chaque cas.

**Acceptance Scenarios**:

1. **Given** les données en cours de chargement, **When** la personne regarde la page, **Then** un
   état de chargement est visible et annoncé.
2. **Given** un chargement qui échoue, **When** la personne regarde la page, **Then** un message
   d'erreur clair dit que les outils n'ont pas pu être chargés, propose de réessayer et renvoie à
   l'accueil, où la liste est lisible.
3. **Given** un navigateur sans JavaScript, **When** la personne ouvre « Explorer », **Then** la
   page explique que l'explorateur demande JavaScript et renvoie à l'accueil; elle n'est pas vide.
4. **Given** n'importe quelle page du site, **When** la personne cherche l'explorateur, **Then** un
   lien « Explorer » l'y mène, et l'accueil et les fiches restent lisibles sans JavaScript.

---

### Edge Cases

- Un outil sans critères vérifiés et un filtre sur un verdict: l'outil n'est pas retenu, quel que
  soit le verdict demandé, y compris « indéterminé » (un critère indéterminé est un verdict rendu
  après lecture de la page; l'absence de vérification n'en est pas un).
- Un outil sans pays et un filtre par pays: l'outil n'est pas retenu.
- Des outils de même score, ou de même catégorie, lors d'un tri: ils sont départagés par leur nom,
  pour que l'ordre soit toujours le même.
- Un tri par nom avec des majuscules, des accents ou des chiffres: l'ordre suit l'usage français
  (« Élodia » avec les « e », sans égard à la casse).
- Une adresse qui demande plus de quatre outils à comparer: seuls les quatre premiers valides sont
  retenus.
- Une adresse qui demande un seul outil à comparer: l'outil est choisi, mais la comparaison ne
  s'ouvre pas.
- Un outil retiré du répertoire: il n'apparaît ni dans les résultats, ni dans les filtres, ni dans
  une comparaison.
- Le fichier de données de l'explorateur absent, illisible ou d'une forme inattendue une fois le
  site publié: le message d'erreur s'affiche; la page ne plante pas.
- Les données changent et le site est régénéré: l'explorateur reflète le nouvel état, et une
  adresse partagée avant le changement reste utilisable.
- Une comparaison de quatre outils sur un téléphone: elle reste lisible, par défilement de la
  comparaison seule ou par empilement, sans défilement horizontal de la page.

## Requirements *(mandatory)*

### Functional Requirements

**Page et résultats**

- **FR-001**: Le site DOIT offrir une page « Explorer » qui montre tous les outils actifs du
  répertoire, et un lien vers elle depuis chaque page.
- **FR-002**: Tout changement de tri, de filtre, de vue ou de comparaison DOIT mettre la page à
  jour sans la recharger.
- **FR-003**: Chaque carte et chaque ligne de résultat DOIT mener à la fiche de l'outil; les fiches
  de la première tranche restent la référence de chaque outil.
- **FR-004**: Les outils marqués comme retirés NE DOIVENT apparaître nulle part dans l'explorateur.

**Tri**

- **FR-005**: La personne DOIT pouvoir trier les résultats par nom, par score ou par catégorie,
  dans le sens croissant ou décroissant.
- **FR-006**: L'ordre DOIT être déterminé: des outils égaux selon le critère de tri sont
  départagés par leur nom; le tri par nom suit l'ordre alphabétique français, sans égard à la casse
  ni aux accents.
- **FR-007**: Le tri en cours et son sens DOIVENT être indiqués en texte, et exposés aux lecteurs
  d'écran.

**Filtres**

- **FR-008**: L'explorateur DOIT offrir les filtres de l'accueil: catégorie, tag, statut du code
  source (dont « pas encore enrichi ») et recherche par nom, avec les mêmes règles.
- **FR-009**: L'explorateur DOIT offrir un filtre de score minimal (de 0 à 3).
- **FR-010**: L'explorateur DOIT offrir, pour chacun des trois critères de souveraineté, un filtre
  sur son verdict vérifié (confirmé, infirmé, indéterminé); un outil sans critères vérifiés n'est
  retenu par aucun de ces filtres.
- **FR-011**: L'explorateur DOIT offrir un filtre par pays de l'éditeur, parmi les pays présents
  dans les données, nommés en français.
- **FR-012**: L'explorateur DOIT offrir un filtre par source du répertoire, parmi les sources des
  outils actifs.
- **FR-013**: L'explorateur DOIT offrir un filtre « enrichi » ou « non enrichi ».
- **FR-014**: Les filtres DOIVENT se combiner: à l'intérieur d'un filtre à choix multiple, un outil
  est retenu s'il répond à au moins une valeur choisie; entre les filtres, il doit répondre à tous.
  Un filtre sans valeur choisie ne filtre rien.
- **FR-015**: Le nombre de résultats DOIT être affiché et annoncé à chaque changement; quand aucun
  outil ne correspond, un message DOIT le dire et proposer d'effacer tous les choix.

**Vues**

- **FR-016**: La personne DOIT pouvoir afficher les mêmes résultats en cartes ou en tableau, dans
  le même ordre.
- **FR-017**: La vue en tableau DOIT montrer, par outil: le nom lié à la fiche, la catégorie, le
  score, le statut du code source, le pays et la source, avec des en-têtes de colonnes.

**Comparaison**

- **FR-018**: La personne DOIT pouvoir choisir des outils à comparer dans l'une ou l'autre vue; le
  choix est conservé en changeant de vue, de tri ou de filtres.
- **FR-019**: La comparaison DOIT s'ouvrir pour deux à quatre outils; avec un seul, la page dit
  qu'il en faut deux; un cinquième est refusé avec un message.
- **FR-020**: La comparaison DOIT montrer côte à côte, pour chaque outil et alignés par ligne: le
  nom lié à la fiche, le score, les critères de souveraineté, le statut du code source, la licence,
  le pays et les services remplacés.
- **FR-021**: Dans la comparaison, une information absente DOIT être dite en clair (« non
  connu », « pas encore enrichi ») plutôt que de laisser une case vide, pour que les colonnes
  restent comparables.
- **FR-022**: La personne DOIT pouvoir retirer un outil de la comparaison et la vider d'un geste.

**Adresse et historique**

- **FR-023**: L'adresse de la page DOIT refléter le tri, les filtres, la vue et les outils comparés;
  ouvrir cette adresse DOIT restaurer le même état.
- **FR-024**: Le bouton précédent du navigateur DOIT ramener à l'état d'avant le dernier choix.
- **FR-025**: Une valeur inconnue dans l'adresse DOIT être ignorée sans erreur; sans aucun choix,
  l'adresse est celle de la page, sans paramètre.
- **FR-026**: Les paramètres d'adresse communs avec l'accueil (catégorie, tag, statut, recherche)
  DOIVENT porter les mêmes noms et les mêmes valeurs.

**Chargement, erreurs et lecture sans JavaScript**

- **FR-027**: Pendant le chargement des données, un état de chargement DOIT être visible et
  annoncé; la page n'affiche jamais une zone vide.
- **FR-028**: Si les données ne peuvent pas être chargées ou lues, un message d'erreur clair DOIT
  le dire, proposer de réessayer et renvoyer à l'accueil.
- **FR-029**: Sans JavaScript, la page « Explorer » DOIT expliquer qu'elle en demande et renvoyer à
  l'accueil; l'accueil et les fiches DOIVENT rester lisibles sans JavaScript.

**Provenance et honnêteté**

- **FR-030**: Chaque champ produit par un modèle d'IA affiché dans l'explorateur (statut du code
  source, licence, tags, verdicts des critères) DOIT être signalé comme tel, avec l'avertissement
  « à vérifier », dans les cartes, le tableau, les filtres et la comparaison.
- **FR-031**: Un score estimé DOIT se distinguer d'un score donné par la source, partout où un
  score s'affiche.
- **FR-032**: Aucun de ces signalements NE DOIT reposer sur la couleur seule ni sur le survol.
- **FR-033**: La page DOIT porter l'attribution et la licence des données, comme les autres pages.

**Données et site**

- **FR-034**: Les données de l'explorateur DOIVENT être produites au moment de générer le site, à
  partir des fichiers de données existants, lus tels quels.
- **FR-035**: La fonctionnalité NE DOIT changer ni la forme des fichiers de données, ni leurs
  schémas, ni les scripts qui les produisent.
- **FR-036**: Le site DOIT rester fait de fichiers statiques: aucun serveur, aucune API, aucun
  appel payant, ni à la génération ni à la consultation.

**Langue et accessibilité**

- **FR-037**: Tout le texte DOIT être en français.
- **FR-038**: Toutes les fonctions (tri, filtres, vues, choix d'outils, comparaison) DOIVENT être
  utilisables au clavier seul, avec un focus visible.
- **FR-039**: La page DOIT être utilisable avec un lecteur d'écran: commandes nommées, tableau avec
  en-têtes, tri exposé, annonces du nombre de résultats, du chargement et des erreurs.
- **FR-040**: La page DOIT être lisible et utilisable sur un téléphone, sans défilement horizontal
  de la page.

### Key Entities *(include if feature involves data)*

- **Outil**: un outil actif du répertoire, avec ce que l'explorateur en montre: nom, catégorie,
  score (et s'il est estimé), statut du code source, tags, pays, source, licence, services
  remplacés, verdict de chaque critère, s'il est enrichi.
- **Critère de souveraineté**: une des trois questions du répertoire; chaque outil vérifié a un
  verdict (confirmé, infirmé, indéterminé) par critère.
- **État de l'explorateur**: le tri et son sens, les filtres choisis, la vue (cartes ou tableau) et
  les outils comparés. Il est porté par l'adresse de la page; rien n'est enregistré ailleurs.
- **Comparaison**: de deux à quatre outils choisis, présentés côte à côte sur les mêmes lignes.
- **Source du répertoire**: la collection dont un outil provient (Praxis, Services FACiLes,
  Charles, ajout manuel).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des outils actifs apparaissent dans l'explorateur sans filtre (154 au
  2026-11-13), et chaque résultat mène à la fiche de l'outil.
- **SC-002**: Pour 100 % des combinaisons de tri et de filtres essayées, les outils affichés et
  leur ordre sont exactement ceux que les données donnent.
- **SC-003**: Une personne compare trois outils qu'elle connaît de nom en moins d'une minute, à
  partir de la page « Explorer ».
- **SC-004**: Pour 100 % des états essayés, ouvrir l'adresse copiée restaure le même tri, les mêmes
  filtres, la même vue et les mêmes outils comparés.
- **SC-005**: Chaque changement de tri ou de filtre met la liste à jour sans délai perceptible
  (moins d'un dixième de seconde pour 154 outils).
- **SC-006**: 100 % des champs produits par IA affichés dans l'explorateur portent le signalement
  « à vérifier »; 100 % des scores estimés sont dits estimés.
- **SC-007**: Dans 100 % des cas de chargement lent, d'échec de chargement et d'absence de
  JavaScript, la page affiche un message qui dit ce qui se passe et quoi faire; jamais une zone
  vide.
- **SC-008**: Un contrôle automatisé d'accessibilité ne relève aucune erreur de niveau A ou AA
  (WCAG 2.1) sur la page, dans ses deux vues et avec une comparaison ouverte, et un parcours au
  clavier seul réussit (filtrer, trier, choisir deux outils, comparer, ouvrir une fiche).
- **SC-009**: Après la fonctionnalité, les fichiers de données, leurs schémas et les scripts qui
  les produisent sont identiques, l'accueil et les fiches se lisent toujours sans JavaScript, et
  tous les contrôles existants passent.

## Assumptions

- **Contraintes imposées par la demande**: l'explorateur est une île SolidJS dans le site statique
  (skill `solidjs` du dépôt), et ses données sont chargées dans le navigateur depuis un fichier
  produit à la génération du site. Ces choix sont fixés; le plan les détaille.
- **Critères dans le filtre et dans la comparaison**: ce sont les critères vérifiés d'après la page
  de l'outil (confirmé, infirmé, indéterminé), les seuls qui portent un verdict. La comparaison ne
  montre pas les citations: elles restent sur la fiche, à un clic.
- **Tri par défaut**: par catégorie, dans l'ordre des catégories des données, puis par nom; c'est
  l'ordre de l'accueil.
- **Tri par catégorie**: selon l'ordre des catégories dans les données (croissant) ou l'ordre
  inverse (décroissant), les outils d'une même catégorie étant classés par nom.
- **Vue par défaut**: en cartes.
- **Filtre de verdict**: un verdict au plus par critère; les trois critères se combinent entre eux
  comme les autres filtres.
- **Filtres à choix multiple**: catégorie, tag, statut du code source, pays et source acceptent
  plusieurs valeurs, comme sur l'accueil.
- **Choix des outils à comparer**: une case à cocher sur chaque carte et chaque ligne; la
  comparaison s'affiche sur la même page, au-dessus des résultats.
- **Lien avec l'accueil**: l'accueil garde sa liste et ses filtres, lisibles sans JavaScript;
  l'explorateur s'y ajoute et ne les remplace pas.
- **Données de l'explorateur**: le fichier ne contient que les champs que l'explorateur affiche ou
  filtre, sans les descriptions longues, pour rester léger sur un téléphone.
- **Hors de cette tranche**: soumission d'outils, comptes, favoris enregistrés, commentaires,
  édition des données, sommaire statistique et graphiques, export des résultats, version anglaise.
- **Constitution**: la fonctionnalité suit la constitution du projet (version 1.2.0), en
  particulier la provenance (principe II), les licences (III), l'absence de coût caché (IV), les
  tests d'abord (V) et le français (VI).
