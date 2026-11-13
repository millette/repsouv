# Feature Specification: Page « Statistiques »

**Feature Branch**: `003-page-statistiques`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Une page « Statistiques » sur le site de consultation, qui présente le portrait chiffré du répertoire en graphiques, pour les personnes qui veulent une vue d'ensemble avant de lire les fiches. Troisième tranche, après le site en lecture seule (001); elle ne dépend pas de l'explorateur. Elle reprend le contenu de sommaire.md, calculé par statistiques.ts et dessiné par graphiques.ts: chiffres clés, neuf graphiques, tableau des mêmes chiffres sous chaque graphique, valeur exacte au survol et au clavier, mise en évidence d'une série par la légende, liens vers les outils comptés, dénominateurs et date des données."

## Clarifications

### Session 2026-11-13

- Q: Que font les graphiques, dessinés sur fond blanc dans le sommaire, quand le site est en thème sombre ? → A: Ils s'adaptent au thème: fond, axes et étiquettes sombres; les couleurs des statuts restent.
- Q: Comment une personne au clavier obtient-elle la valeur exacte d'une barre ? → A: Un seul arrêt de tabulation par graphique, puis les flèches d'une barre à l'autre; la valeur en cours s'affiche et est annoncée.
- Q: Comment le tableau des mêmes chiffres s'affiche-t-il sous chaque graphique ? → A: Dans un bloc repliable « Voir les chiffres », fermé au départ, qui s'ouvre sans JavaScript.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir le portrait chiffré du répertoire (Priority: P1)

Une personne qui découvre le répertoire ouvre la page « Statistiques ». Elle y lit les chiffres clés
(combien d'outils, de catégories, quelle répartition des étoiles, quelle part d'outils enrichis,
d'où viennent les outils, de quels pays), puis parcourt neuf graphiques. Sous chaque graphique, un
tableau donne les mêmes chiffres. La page se lit sans JavaScript.

**Why this priority**: c'est la raison d'être de la page. Avec les chiffres clés, les graphiques en
images et leurs tableaux, la page donne déjà la vue d'ensemble, pour tout le monde, y compris sans
JavaScript et sans voir les graphiques.

**Independent Test**: ouvrir la page sans JavaScript et vérifier les chiffres clés, les neuf
graphiques avec leur texte de remplacement et leurs neuf tableaux, dont les chiffres sont ceux que
les données donnent.

**Acceptance Scenarios**:

1. **Given** la page « Statistiques », **When** la personne la lit, **Then** elle trouve les
   chiffres clés: nombre d'outils et de catégories, répartition des étoiles, part des outils
   enrichis, provenance par source, pays de l'éditeur.
2. **Given** la page, **When** la personne la parcourt, **Then** elle trouve neuf graphiques, chacun
   avec un titre: outils par catégorie et statut du code source, statut du code source, licences par
   famille, critères selon le répertoire et selon l'évaluation enrichie, critères par statut du code
   source, verdicts des critères vérifiés, forges de code, tags les plus fréquents, enrichissement
   par jour.
3. **Given** un graphique, **When** la personne ouvre le bloc « Voir les chiffres » placé dessous,
   **Then** un tableau donne les mêmes chiffres, avec une légende et des en-têtes; le bloc est
   fermé au départ et s'ouvre sans JavaScript.
4. **Given** un navigateur sans JavaScript, **When** la personne ouvre la page, **Then** chaque
   graphique est visible comme une image, avec son texte de remplacement et son tableau.
5. **Given** un pourcentage sur la page, **When** la personne le lit, **Then** la page dit sur
   combien d'outils il porte (tous les outils, ou seulement les outils enrichis ou vérifiés).
6. **Given** la page, **When** la personne cherche de quand datent les chiffres, **Then** la date
   des données est indiquée.
7. **Given** n'importe quelle page du site, **When** la personne regarde la navigation, **Then** un
   lien « Statistiques » mène à la page.

---

### User Story 2 - Lire la valeur exacte et isoler une série (Priority: P2)

La personne veut la valeur exacte d'une barre ou d'une case sans chercher dans le tableau, et voir
une série se détacher des autres. Au survol comme au clavier, chaque barre ou case donne sa valeur;
la légende permet de mettre une série en évidence.

**Why this priority**: c'est un confort de lecture. Les tableaux donnent déjà toutes les valeurs.

**Independent Test**: avec JavaScript, survoler une barre puis l'atteindre au clavier: sa valeur
exacte s'affiche; choisir une série dans la légende: elle se détache des autres.

**Acceptance Scenarios**:

1. **Given** un graphique, **When** la personne survole une barre ou une case, **Then** sa valeur
   exacte s'affiche, avec ce qu'elle mesure.
2. **Given** un graphique, **When** la personne l'atteint par une tabulation, puis passe d'une
   barre à l'autre avec les flèches, **Then** la valeur exacte de la barre en cours s'affiche et est
   annoncée; la tabulation suivante quitte le graphique.
3. **Given** un graphique à plusieurs séries, **When** la personne choisit une série dans la
   légende, à la souris ou au clavier, **Then** cette série se détache des autres, et un second
   choix rétablit l'affichage.
4. **Given** une série mise en évidence, **When** la personne regarde le graphique, **Then** la
   distinction ne repose pas sur la couleur seule.
5. **Given** un navigateur sans JavaScript, **When** la personne ouvre la page, **Then** les
   graphiques restent des images complètes: rien n'est cassé ni vide.

---

### User Story 3 - Aller d'un chiffre aux outils qu'il compte (Priority: P2)

La personne voit qu'une catégorie compte beaucoup d'outils libres et veut les voir. Depuis le
graphique ou son tableau, elle arrive sur la liste des outils que le chiffre compte.

**Why this priority**: la page donne la vue d'ensemble; ce lien la relie au reste du site.

**Independent Test**: depuis le tableau d'un graphique par catégorie, par statut du code source ou
par tag, activer un lien et vérifier que la liste obtenue compte autant d'outils que le chiffre.

**Acceptance Scenarios**:

1. **Given** le tableau des outils par catégorie, **When** la personne active une catégorie,
   **Then** elle arrive sur la liste des outils de cette catégorie.
2. **Given** le tableau du statut du code source, **When** la personne active un statut, **Then**
   elle arrive sur la liste des outils de ce statut, « pas encore enrichi » compris.
3. **Given** le tableau des tags, **When** la personne active un tag, **Then** elle arrive sur la
   liste des outils qui portent ce tag.
4. **Given** un lien suivi, **When** la liste s'affiche, **Then** elle compte autant d'outils que le
   chiffre du tableau.
5. **Given** un graphique sans filtre correspondant (licences, forges, critères, enrichissement par
   jour), **When** la personne lit son tableau, **Then** ses lignes ne sont pas des liens.

---

### User Story 4 - Savoir ce que chaque chiffre mesure (Priority: P2)

La personne lit trois graphiques sur les critères de souveraineté. Elle sait, pour chacun, s'il
montre ce qui est déduit des étoiles, ce qui vient de l'évaluation par IA, ou ce qui est vérifié
avec citation.

**Why this priority**: la constitution du projet interdit de présenter du contenu généré comme
vérifié; trois lectures des critères qui se ressemblent sont le risque principal de confusion.

**Independent Test**: lire les titres, les légendes et les tableaux des graphiques des critères, du
statut du code source et des licences: la provenance y est nommée en texte.

**Acceptance Scenarios**:

1. **Given** un graphique des critères, **When** la personne lit son titre et sa légende, **Then**
   ce qui est déduit des étoiles, ce qui vient de l'évaluation par IA et ce qui est vérifié avec
   citation sont nommés comme tels.
2. **Given** un chiffre qui repose sur un champ produit par IA (statut du code source, licence, tag,
   forge, verdict), **When** il s'affiche, **Then** il porte le signalement « à vérifier ».
3. **Given** n'importe quel graphique, **When** la personne le lit sans distinguer les couleurs,
   **Then** elle peut encore distinguer les séries (étiquettes, tableau).
4. **Given** la page, **When** la personne en lit le pied, **Then** elle y trouve l'attribution, la
   licence CC BY-SA 4.0 et la mention que les graphiques sont des dérivés des données.

---

### Edge Cases

- Un graphique sans données (par exemple aucun outil enrichi, donc ni licences, ni forges, ni
  tags): il n'est pas affiché, sans titre ni tableau vide.
- Les données changent et le site est régénéré: les chiffres, les graphiques et les tableaux
  changent ensemble, comme `sommaire.md` une fois régénéré.
- `sommaire.md` date d'une génération plus ancienne que le site: la page affiche la date de ses
  propres données; elle ne lit pas `sommaire.md`.
- Un nombre décimal ou un pourcentage: écrit à la française (virgule décimale, espace avant « % »).
- Un graphique large sur un téléphone: il se réduit ou défile seul, sans défilement horizontal de
  la page; son tableau reste lisible.
- Un tableau long (25 catégories, 58 lignes par catégorie et statut): il reste lisible, replié par
  défaut si besoin, et se lit sans JavaScript.
- Le thème sombre: les graphiques passent sur fond sombre, avec des axes et des étiquettes
  lisibles, et gardent leurs couleurs de statut; changer de thème avec l'interrupteur de
  l'en-tête change aussi les graphiques, sans recharger la page.
- Sans JavaScript en thème sombre: l'image du graphique est celle du thème que le système demande.
- JavaScript activé mais le graphique interactif ne se charge pas: l'image produite au build reste
  affichée.
- Un tag, une catégorie ou un statut qui n'a plus d'outil: sa ligne n'apparaît pas, donc aucun lien
  ne mène à une liste vide.

## Requirements *(mandatory)*

### Functional Requirements

**Page et chiffres clés**

- **FR-001**: Le site DOIT offrir une page « Statistiques », avec un lien vers elle dans la
  navigation de chaque page.
- **FR-002**: La page DOIT présenter les chiffres clés: nombre d'outils et de catégories,
  répartition des étoiles, part des outils enrichis, provenance par source, pays de l'éditeur.
- **FR-003**: La page DOIT indiquer la date des données.
- **FR-004**: Chaque pourcentage DOIT dire sur combien d'outils il porte: tous les outils, ou
  seulement les outils enrichis ou vérifiés.

**Graphiques et tableaux**

- **FR-005**: La page DOIT présenter les neuf graphiques du sommaire statistique: outils par
  catégorie et statut du code source, statut du code source, licences par famille, critères selon
  le répertoire et selon l'évaluation enrichie, critères par statut du code source, verdicts des
  critères vérifiés, forges de code, tags les plus fréquents, enrichissement par jour.
- **FR-006**: Chaque graphique DOIT avoir un titre, un texte de remplacement qui dit ce qu'il
  montre, et, dessous, un tableau des mêmes chiffres avec légende et en-têtes, dans un bloc
  repliable « Voir les chiffres », fermé au départ, qui s'ouvre sans JavaScript.
- **FR-007**: Les chiffres d'un tableau DOIVENT être exactement ceux que son graphique dessine.
- **FR-008**: Un graphique sans données NE DOIT PAS s'afficher, ni son titre, ni son tableau.
- **FR-009**: La page et le sommaire statistique du dépôt NE DOIVENT jamais se contredire: mêmes
  calculs et mêmes graphiques pour les mêmes données.
- **FR-010**: Un statut du code source DOIT garder la même couleur dans tous les graphiques, celle
  du sommaire, en thème clair comme en thème sombre.
- **FR-031**: Les graphiques DOIVENT s'adapter au thème du site: en thème sombre, un fond sombre et
  des axes, des titres et des étiquettes lisibles (contraste suffisant); un changement de thème
  s'applique aux graphiques sans recharger la page, et sans JavaScript l'image suit le thème du
  système.

**Lecture sans JavaScript**

- **FR-011**: Sans JavaScript, chaque graphique DOIT rester visible comme une image produite à la
  génération du site, avec son texte de remplacement et son tableau.
- **FR-012**: JavaScript NE DOIT ajouter que le survol, le parcours au clavier et la mise en
  évidence; si le graphique interactif ne se charge pas, l'image reste affichée.

**Interaction**

- **FR-013**: Au survol, chaque barre ou case DOIT donner sa valeur exacte et ce qu'elle mesure.
- **FR-014**: Au clavier, chaque graphique DOIT être un seul arrêt de tabulation; les flèches
  passent d'une barre ou d'une case à l'autre, et la valeur exacte de l'élément en cours s'affiche
  et est annoncée aux lecteurs d'écran.
- **FR-015**: Dans un graphique à plusieurs séries, la légende DOIT permettre de mettre une série
  en évidence, à la souris et au clavier, et de rétablir l'affichage.
- **FR-016**: La mise en évidence NE DOIT PAS reposer sur la couleur seule.

**Liens vers les outils**

- **FR-017**: Les lignes des tableaux par catégorie, par statut du code source et par tag DOIVENT
  mener à la liste des outils que le chiffre compte.
- **FR-018**: La liste atteinte DOIT compter autant d'outils que le chiffre.
- **FR-019**: Les lignes d'un tableau sans filtre correspondant NE DOIVENT PAS être des liens.

**Provenance et honnêteté**

- **FR-020**: Les titres et les légendes DOIVENT nommer comme tels ce qui est déduit des étoiles,
  ce qui vient de l'évaluation par IA et ce qui est vérifié avec citation.
- **FR-021**: Chaque graphique ou chiffre qui repose sur un champ produit par IA (statut du code
  source, licence, forge, tag, évaluation, verdict) DOIT porter le signalement « à vérifier ».
- **FR-022**: Aucune distinction NE DOIT reposer sur la couleur seule.
- **FR-023**: La page DOIT porter l'attribution et la licence CC BY-SA 4.0, et dire que les
  graphiques sont des dérivés des données, sous la même licence.
- **FR-024**: La page NE DOIT PAS afficher le résumé rédigé par IA du sommaire statistique.

**Données et site**

- **FR-025**: Les chiffres DOIVENT être recalculés à la génération du site depuis les fichiers de
  données existants, lus tels quels; la page NE DOIT PAS lire le sommaire statistique.
- **FR-026**: La fonctionnalité NE DOIT changer ni la forme des données, ni leurs schémas, ni les
  scripts qui les produisent; le sommaire statistique et ses graphiques continuent d'être produits
  comme avant.
- **FR-027**: La génération du site NE DOIT faire aucun appel payant, ni exiger l'outil de
  conversion d'images dont le sommaire a besoin.

**Langue et accessibilité**

- **FR-028**: Tout le texte DOIT être en français, et les nombres écrits à la française (virgule
  décimale).
- **FR-029**: La page DOIT être utilisable au clavier seul et avec un lecteur d'écran: titres,
  textes de remplacement, tableaux avec en-têtes, valeurs annoncées.
- **FR-030**: La page DOIT être lisible sur un téléphone, sans défilement horizontal de la page.

### Key Entities *(include if feature involves data)*

- **Chiffre clé**: une mesure du répertoire (outils, catégories, étoiles, enrichissement,
  provenance, pays), avec, pour un pourcentage, le nombre d'outils sur lequel il porte.
- **Graphique**: un des neuf graphiques du sommaire: un titre, un texte de remplacement, les
  valeurs qu'il dessine, une image produite à la génération, et, s'il a plusieurs séries, une
  légende.
- **Tableau d'un graphique**: les mêmes valeurs, en lignes et en colonnes, avec légende et
  en-têtes; certaines lignes mènent aux outils comptés.
- **Série**: un groupe de valeurs d'un graphique (un statut du code source, une évaluation, un
  verdict), toujours de la même couleur d'un graphique à l'autre.
- **Provenance d'un chiffre**: donnée de la source, déduction du dépôt, évaluation par IA, ou
  vérification par IA avec citation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La page présente les chiffres clés et les neuf graphiques du sommaire, chacun avec
  son tableau; 100 % des chiffres d'un tableau sont ceux de son graphique.
- **SC-002**: Pour les mêmes données, 100 % des chiffres communs à la page et au sommaire
  statistique régénéré sont identiques.
- **SC-003**: Sans JavaScript, 100 % des graphiques sont visibles comme images, avec leur texte de
  remplacement et leur tableau.
- **SC-004**: 100 % des liens d'un tableau mènent à une liste qui compte autant d'outils que le
  chiffre de la ligne.
- **SC-005**: 100 % des pourcentages de la page disent sur combien d'outils ils portent.
- **SC-006**: 100 % des graphiques qui reposent sur un champ produit par IA portent le signalement
  « à vérifier », et les trois lectures des critères sont nommées dans leurs titres.
- **SC-007**: Un contrôle automatisé d'accessibilité ne relève aucune erreur de niveau A ou AA
  (WCAG 2.1) sur la page, en thème clair et en thème sombre, et un parcours au clavier seul obtient
  la valeur d'une barre et met une série en évidence.
- **SC-008**: Après la fonctionnalité, les fichiers de données, leurs schémas, les scripts de la
  racine, `sommaire.md` et `graphiques/` sont identiques, et tous les contrôles existants passent.
- **SC-009**: La génération du site réussit sur une machine qui n'a pas l'outil de conversion
  d'images du sommaire, sans aucun appel réseau.

## Assumptions

- **Contraintes imposées par la demande**: les graphiques sont dessinés avec vega et vega-lite à
  partir des spécifications que produit `graphiques.ts`, et les chiffres par `statistiques.ts`. Le
  plan détaille comment; la spécification en retient l'effet: la page et le sommaire ne se
  contredisent pas (FR-009).
- **Liens vers les outils**: les filtres par catégorie, par statut et par tag sont dans
  l'explorateur depuis la tranche 002 (l'accueil n'en a plus); les liens des tableaux mènent donc à
  l'explorateur filtré. La page ne dépend pas de l'explorateur pour le reste: sans lui, ces lignes
  seraient du texte.
- **Sans JavaScript, les liens**: ils mènent à la page « Explorer », qui renvoie alors à la page
  « Outils »; c'est le comportement de la tranche 002.
- **Chiffres clés**: ceux de la section « chiffres clés » du sommaire que la demande nomme; les
  dates, la fiabilité de la classification, les échecs d'enrichissement et Open Hub sont hors de
  cette tranche.
- **Tags les plus fréquents**: les mêmes que dans le sommaire (les plus fréquents, pas tous).
- **Graphiques en thème sombre**: seuls le fond et les couleurs du texte, des axes et des grilles
  changent; les données, les formes et les couleurs des séries sont celles du sommaire, dont les
  images, elles, restent sur fond clair.
- **Ordre de parcours au clavier**: les flèches suivent l'ordre des lignes du tableau du graphique.
- **Hors de cette tranche**: résumé par IA, statistiques Open Hub détaillées, dates et tableaux de
  suivi (fiabilité, échecs d'enrichissement), graphiques au choix de la personne, export des images
  ou des chiffres, évolution dans le temps, version anglaise.
- **Constitution**: la fonctionnalité suit la constitution du projet (version 1.2.0), en
  particulier la provenance (principe II), les licences (III), l'absence de coût caché (IV), les
  tests d'abord (V) et le français (VI).
