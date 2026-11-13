# Feature Specification: Déploiement sur GitHub Pages

**Feature Branch**: `004-deploiement-github-pages`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Le projet doit pouvoir être déployé sur github pages"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publier le site à chaque mise à jour du dépôt (Priority: P1)

La personne qui maintient le dépôt pousse ses changements sur la branche principale. Sans autre
geste, le site de consultation est rebâti à partir des données du dépôt et publié sur GitHub Pages,
à l'adresse publique du dépôt. Si les contrôles échouent, rien n'est publié et le site en ligne
reste celui d'avant.

**Why this priority**: c'est l'objet de la demande. Tant que le site ne se publie pas seul, il
n'existe que sur le poste de qui le bâtit.

**Independent Test**: pousser un changement de données sur la branche principale; quelques minutes
plus tard, le site en ligne le reflète.

**Acceptance Scenarios**:

1. **Given** un changement poussé sur la branche principale, **When** la publication s'exécute,
   **Then** le site est bâti à partir des fichiers de données du dépôt et publié à l'adresse GitHub
   Pages du dépôt.
2. **Given** des contrôles qui échouent (tests, types, licences, ou build du site), **When** la
   publication s'exécute, **Then** rien n'est publié et l'échec est visible dans le dépôt.
3. **Given** un site déjà en ligne, **When** une publication échoue, **Then** le site en ligne
   reste celui de la dernière publication réussie.
4. **Given** la personne qui maintient le dépôt, **When** elle veut republier sans rien pousser,
   **Then** elle peut lancer la publication à la main.

---

### User Story 2 - Consulter le site publié sous l'adresse du dépôt (Priority: P1)

Une personne ouvre le site publié. Il vit sous un chemin du domaine GitHub Pages (le nom du dépôt),
pas à la racine d'un domaine. Toutes les pages, tous les liens, les images des graphiques,
l'explorateur et la boîte de détails y fonctionnent comme sur le poste de développement.

**Why this priority**: un site publié dont les liens ou les données pointent vers la racine du
domaine est cassé; c'est le risque principal d'une publication sous un sous-chemin.

**Independent Test**: bâtir le site avec le chemin de base du dépôt et vérifier que chaque lien
interne, chaque image et chaque fichier de données demandé par les pages existe sous ce chemin.

**Acceptance Scenarios**:

1. **Given** le site bâti pour l'adresse du dépôt, **When** on suit n'importe quel lien interne
   d'une page (navigation, fiches, explorateur, statistiques, attribution), **Then** il mène à une
   page du site, sous le chemin du dépôt.
2. **Given** la page « Statistiques » publiée, **When** elle s'affiche, **Then** les images des
   graphiques et leurs versions interactives se chargent.
3. **Given** la page « Explorer » publiée, **When** elle s'affiche, **Then** les outils se
   chargent, les filtres fonctionnent, et la boîte « Détails » montre la fiche d'un outil.
4. **Given** une adresse du site qui n'existe pas, **When** on l'ouvre, **Then** la page
   « Page introuvable » du site s'affiche, avec un lien qui ramène à l'accueil du site.
5. **Given** le site bâti sans adresse de publication (sur un poste), **When** on le consulte,
   **Then** il fonctionne à la racine, comme avant.

---

### User Story 3 - Savoir comment publier et quoi régler (Priority: P2)

La personne qui reprend le dépôt, ou qui le copie, lit la documentation et sait quel réglage faire
une fois sur GitHub, d'où vient l'adresse du site, et comment publier ailleurs si elle le veut.

**Why this priority**: une publication automatique dépend d'un réglage du dépôt sur GitHub que le
code ne peut pas faire à sa place.

**Independent Test**: suivre la documentation sur une copie du dépôt: le site de la copie est
publié à sa propre adresse, sans modifier le code.

**Acceptance Scenarios**:

1. **Given** la documentation du dépôt, **When** la personne cherche comment publier, **Then** elle
   trouve le réglage à faire sur GitHub, l'adresse du site et la façon de lancer une publication.
2. **Given** une copie du dépôt sous un autre nom ou un autre compte, **When** elle est publiée,
   **Then** le site s'adapte à l'adresse de la copie, sans modifier le code.

---

### Edge Cases

- Les données changent sans que le code change: la publication rebâtit quand même le site.
- Deux changements poussés coup sur coup: une seule publication aboutit, celle du dernier état.
- Le dépôt est publié sous un domaine personnalisé, donc à la racine: le site fonctionne aussi.
- La publication ne doit dépenser aucun appel payant: ni enrichissement, ni résumé par IA.
- Une branche de travail poussée: elle ne publie pas le site.
- Le dépôt d'une contribution extérieure (fork): la publication ne tourne pas sur une demande de
  fusion, et ne reçoit aucun secret.

## Requirements *(mandatory)*

### Functional Requirements

**Publication**

- **FR-001**: Le dépôt DOIT contenir de quoi publier le site de consultation sur GitHub Pages sans
  autre outil que GitHub: chaque changement de la branche principale rebâtit et publie le site.
- **FR-002**: La publication DOIT pouvoir être lancée à la main.
- **FR-003**: La publication DOIT d'abord exécuter les contrôles du dépôt et du site; si l'un
  échoue, rien n'est publié et le site en ligne reste inchangé.
- **FR-004**: Seule la branche principale DOIT publier; une branche de travail ou une demande de
  fusion ne publie rien.
- **FR-005**: La publication NE DOIT faire aucun appel payant et n'exiger aucun secret: le site se
  bâtit à partir des fichiers de données du dépôt, tels quels.
- **FR-006**: La publication NE DOIT modifier aucun fichier du dépôt.

**Site sous l'adresse du dépôt**

- **FR-007**: Le site DOIT fonctionner sous le chemin du dépôt sur GitHub Pages: tous les liens
  internes, les feuilles de style, les scripts, les images des graphiques, le fichier de
  l'explorateur et les fiches lues par la boîte « Détails » sont demandés sous ce chemin.
- **FR-008**: L'adresse et le chemin du site publié DOIVENT être déduits du dépôt qui publie, pour
  qu'une copie du dépôt se publie à sa propre adresse sans modifier le code.
- **FR-009**: Le site DOIT continuer de fonctionner à la racine quand il est bâti sans adresse de
  publication, et sous un domaine personnalisé.
- **FR-010**: Une adresse inexistante du site publié DOIT afficher la page « Page introuvable » du
  site, dont les liens ramènent au site.

**Documentation**

- **FR-011**: La documentation DOIT dire comment activer la publication sur GitHub, à quelle
  adresse le site est publié, comment relancer une publication, et comment publier ailleurs.

### Key Entities *(include if feature involves data)*

- **Publication**: une exécution qui contrôle, bâtit et met en ligne le site, déclenchée par un
  changement de la branche principale ou à la main; elle réussit en entier ou ne change rien.
- **Adresse du site**: le domaine et le chemin sous lesquels le site est publié, déduits du dépôt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Après un changement poussé sur la branche principale, le site en ligne le reflète en
  moins de dix minutes, sans aucun geste de plus.
- **SC-002**: Bâti pour l'adresse du dépôt, 100 % des liens internes, des images et des fichiers
  de données que les pages demandent existent sous le chemin du dépôt.
- **SC-003**: 100 % des publications dont un contrôle échoue laissent le site en ligne inchangé.
- **SC-004**: Une copie du dépôt publie son site à sa propre adresse sans modifier un fichier.
- **SC-005**: La publication n'emploie aucun secret et ne coûte rien.
- **SC-006**: Le site bâti sans adresse de publication passe tous les contrôles existants.

## Assumptions

- **Ce qui est publié**: le site de consultation (`site/`). Le dépôt lui-même reste la façon de
  publier les données JSON.
- **Dépôt**: `millette/repsouv` sur GitHub, d'après le dépôt distant configuré; l'adresse attendue
  est `https://millette.github.io/repsouv/`.
- **Réglage sur GitHub**: activer GitHub Pages avec GitHub Actions comme source est un geste à
  faire une fois dans les réglages du dépôt; le code ne peut pas le faire.
- **Mise à jour des données**: la publication ne lance pas `node update.ts`; les données sont
  mises à jour et poussées par la personne qui maintient le dépôt, comme aujourd'hui.
- **Contrôles avant publication**: ceux que la constitution exige avant un commit (tests, types,
  licences à la racine) et les tests du site, y compris dans un navigateur; à confirmer à la
  clarification, parce que les tests dans un navigateur allongent chaque publication.
- **Vérification**: la publication elle-même ne peut être exercée que sur GitHub, après que les
  changements sont poussés et le réglage fait; avant cela, le site bâti pour l'adresse du dépôt
  est vérifié sur le poste.
- **Constitution**: version 1.2.0; en particulier les coûts explicites (principe IV) et le
  français (principe VI).
