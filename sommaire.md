# Sommaire du répertoire d'outils favorisant la souveraineté numérique

*Documentation : [README](README.md) · [Implémentation](implementation.md) · [Historique](historique.md) · [Sommaire statistique](sommaire.md)*

Généré le 2026-11-12T15:08:08-05:00 par `sommaire.ts` d'après `outils.json` (données sous licence CC-BY-SA-4.0, créées le 2026-11-12T12:35:52-05:00 et modifiées pour la dernière fois le 2026-11-12T15:06:44-05:00). Ne pas modifier ce fichier à la main : relancer `nub run sommaire`.

Sauf indication contraire, les pourcentages sont calculés sur les 60 outils du répertoire. Les statistiques sur le statut du code source, les licences, les forges et les tags ne portent que sur les 57 outils déjà enrichis.

## Résumé

Ce répertoire rassemble 60 outils numériques pour aider les OSBL des arts et de la culture du Canada français à orienter leurs choix en matière de souveraineté numérique. Les fiches sont organisées par catégories d’usage et évaluées selon trois critères : où peuvent rester les données, qui contrôle l’outil et de qui il dépend pour fonctionner. Le score, de 0 à 3 étoiles, correspond au nombre de critères satisfaits. Dans l’évaluation du répertoire, 52 outils obtiennent 2 étoiles et 8 obtiennent 3 étoiles. Le critère relatif aux données est indiqué comme satisfait pour 60 outils, celui du contrôle pour 29 et celui de la dépendance pour 39. Les catégories couvrent notamment la bureautique, la sécurité, le stockage, les communications, le financement, la billetterie et la gestion de collections culturelles.

La classification disponible distingue 24 logiciels libres, 6 partiellement libres, 1 à code source disponible et 26 propriétaires, tandis que 3 outils ne sont pas encore enrichis. Parmi les licences renseignées, le copyleft fort, notamment GPL et AGPL, représente 16 occurrences, contre 5 pour les licences permissives et 4 pour le copyleft faible. Certaines fiches classées libres ou partiellement libres n’ont toutefois pas de licence précisée. Les dépôts de code recensés se trouvent principalement sur GitHub, mais aussi sur Framagit, git.jami.net et hg.mozilla.org. Ces renseignements permettent de distinguer le statut du logiciel, sa licence et le lieu de publication de son code, sans assimiler la disponibilité du code à une souveraineté complète.

Pour un organisme, les catégories et les étiquettes facilitent le repérage de solutions et leur comparaison selon les activités à soutenir et la maîtrise souhaitée des données. Les étiquettes les plus fréquentes concernent l’auto-hébergement, présent pour 25 outils, les API ou intégrations et l’offre gratuite, avec 22 outils chacune, puis l’automatisation et la vie privée, avec 14 chacune. Un organisme peut ainsi explorer CiviCRM pour ses membres et donateurs, Omeka S pour ses collections numériques ou Nextcloud pour le partage de fichiers. Les indications sur l’auto-hébergement, le fonctionnement hors ligne, le chiffrement et les intégrations aident à choisir selon les besoins et les capacités techniques de l’équipe, plutôt que sur la seule base des étoiles.

Le répertoire reste un point de départ pour une vérification, et non une garantie de souveraineté complète. L’enrichissement porte sur 57 outils : En commun, Paperless-ngx et CIRA Canadian Shield / Bouclier canadien ne sont pas encore enrichis. Les déductions et verdicts automatiques présentent des écarts avec l’évaluation du répertoire et laissent certains critères indéterminés. Une solution peut aussi renforcer la maîtrise d’une partie des données sans supprimer les dépendances existantes, comme La Réserve pour les sauvegardes de Google Workspace et Microsoft 365. Avant de retenir un outil, il convient donc de vérifier la licence applicable, l’hébergement effectif, les dépendances techniques, les possibilités d’exportation, la disponibilité du français et les conditions tarifaires auprès des sources officielles.

*Résumé rédigé par un modèle d'IA (gpt-6-astra) le 2026-11-12T15:08:01-05:00, à partir des statistiques ci-dessous et de la liste des outils. À relire avant de le diffuser.*

## Chiffres clés

- **60 outils** répartis en **20 catégories**.
- **8 outils à 3 étoiles** et **52 à 2 étoiles** (moyenne : 2,13 étoiles).
- **57 outils enrichis** sur 60 (95,0 %).
- **30 logiciels libres ou partiellement libres** parmi les outils enrichis (52,6 %).
- **8 licences SPDX distinctes**, **4 forges de code** et **36 tags** utilisés sur 37 du vocabulaire.

## Dates

### Dans le répertoire

La page du répertoire n'affiche qu'une date pour toute la note : la date d'un outil (`derniere_modification`) est celle de la page quand l'outil a été ajouté ou a changé.

- **Outils les plus anciens** : 2026-11-05T09:53:00-05:00, 60 outil(s) (1Password, 2FAS Auth, 2FAS Pass, Antidote, Bitwarden et 55 autre(s)).
- **Outils les plus récents** : 2026-11-05T09:53:00-05:00, 60 outil(s) (1Password, 2FAS Auth, 2FAS Pass, Antidote, Bitwarden et 55 autre(s)).

| Date de modification | Outils |
|---|---|
| 2026-11-05T09:53:00-05:00 | 60 |

| Changement détecté | Outils |
|---|---|
| nouveau | 60 |

### Enrichissement

- 57 outils enrichis, dont 57 avec une date d'enrichissement enregistrée.
- **Premier enrichissement** : 2026-11-12T12:36:14-05:00 (Matomo).
- **Dernier enrichissement** : 2026-11-12T12:55:53-05:00 (Wallabag).
- Dernière écriture du fichier de données : 2026-11-12T15:06:44-05:00.

| Jour | Outils enrichis |
|---|---|
| 2026-11-12 | 57 |

## Catégories

![Diagramme à barres empilées : nombre d'outils par catégorie (20 catégories), réparti selon le statut du code source.](graphiques/categories-statut.svg)

| Catégorie | Outils | % du répertoire | Enrichis | Libres ou partiels | Score moyen |
|---|---|---|---|---|---|
| 📝 Bureautique et collaboration | 8 | 13,3 % | 8 | 6 | 2,25 |
| 🔐 Sécurité et gestion des accès | 6 | 10,0 % | 5 | 3 | 2 |
| ☁️ Stockage, infonuagique et sauvegarde | 5 | 8,3 % | 5 | 1 | 2,4 |
| 📋 Gestion de projets et des tâches | 4 | 6,7 % | 4 | 4 | 2 |
| 📣 Marketing par courriel | 4 | 6,7 % | 4 | 0 | 2,25 |
| 🌐 Communautés, réseaux et partage des connaissances | 3 | 5,0 % | 2 | 2 | 2 |
| 💬 Communication et collaboration d’équipe | 3 | 5,0 % | 3 | 3 | 2,33 |
| 🤝 Financement, subventions et dons | 3 | 5,0 % | 3 | 0 | 2 |
| 📁 Gestion documentaire et signature électronique | 3 | 5,0 % | 2 | 1 | 2 |
| 🎙️ Transcription et assistance aux réunions | 3 | 5,0 % | 3 | 1 | 2 |
| 🔎 Veille et gestion de l’information | 3 | 5,0 % | 3 | 2 | 2,33 |
| 📊 Analyse et mesure | 2 | 3,3 % | 2 | 1 | 2 |
| 🎨 Création et gestion de contenus numériques | 2 | 3,3 % | 2 | 1 | 2,5 |
| 🎟️ Gestion d’événements et billetterie | 2 | 3,3 % | 2 | 1 | 2 |
| 🏛️ Gestion de collections et de contenus culturels | 2 | 3,3 % | 2 | 1 | 2 |
| 👥 Gestion de la relation, des membres et CRM | 2 | 3,3 % | 2 | 1 | 2 |
| ⏱️ Ressources humaines et gestion du temps | 2 | 3,3 % | 2 | 0 | 2 |
| 💰 Comptabilité et finances | 1 | 1,7 % | 1 | 0 | 2 |
| ✉️ Messagerie électronique | 1 | 1,7 % | 1 | 1 | 2 |
| 🧭 Navigation Web | 1 | 1,7 % | 1 | 1 | 2 |

## Statut du code source

![Diagramme à barres : nombre d'outils par statut du code source (Libre 24, Partiellement libre 6, Code source disponible 1, Propriétaire 26, Pas encore enrichi 3).](graphiques/statut-code-source.svg)

| Statut | Outils | % du répertoire | % des outils enrichis |
|---|---|---|---|
| Libre | 24 | 40,0 % | 42,1 % |
| Partiellement libre (open core) | 6 | 10,0 % | 10,5 % |
| Code source disponible | 1 | 1,7 % | 1,8 % |
| Propriétaire | 26 | 43,3 % | 45,6 % |
| Pas encore enrichi | 3 | 5,0 % |  |

## Licences

![Diagramme à barres : nombre d'outils par licence SPDX (8 licences), colorées selon leur famille (Copyleft fort (GPL, AGPL), Copyleft faible (LGPL, MPL, EPL, EUPL), Permissive (MIT, Apache, BSD, ISC)).](graphiques/licences.svg)

| Licence (SPDX) | Outils | % des outils enrichis |
|---|---|---|
| AGPL-3.0-only | 8 | 14,0 % |
| AGPL-3.0-or-later | 4 | 7,0 % |
| MPL-2.0 | 4 | 7,0 % |
| Apache-2.0 | 3 | 5,3 % |
| GPL-3.0-or-later | 2 | 3,5 % |
| MIT | 2 | 3,5 % |
| GPL-2.0-or-later | 1 | 1,8 % |
| GPL-3.0-only | 1 | 1,8 % |

**Familles de licences** (classement indicatif d'après l'identifiant SPDX) :

| Famille | Outils |
|---|---|
| Copyleft fort (GPL, AGPL) | 16 |
| Permissive (MIT, Apache, BSD, ISC) | 5 |
| Copyleft faible (LGPL, MPL, EPL, EUPL) | 4 |

**Outils enrichis sans licence connue**, par statut :

| Statut | Outils |
|---|---|
| Propriétaire | 26 |
| Libre | 4 |
| Code source disponible | 1 |
| Partiellement libre (open core) | 1 |

## Critères de souveraineté

Les critères du répertoire sont **déduits** des descriptions (voir le README) ; l'évaluation enrichie est un second avis indépendant du modèle d'IA.

### Nombre d'outils par critère (répertoire)

![Diagramme à barres groupées : part des outils qui satisfont chacun des trois critères de souveraineté, selon le répertoire (déduit, 60 outils) et selon l'évaluation enrichie (57 outils).](graphiques/criteres-repertoire-enrichie.svg)

| Critère | Outils | % du répertoire |
|---|---|---|
| Où peuvent rester les données ? | 60 | 100,0 % |
| Qui contrôle l’outil ? | 29 | 48,3 % |
| De qui dépend-il pour fonctionner ? | 39 | 65,0 % |

### Critères satisfaits par statut du code source (répertoire)

![Carte de chaleur : pour chaque statut du code source, part des outils qui satisfont chacun des trois critères, selon le répertoire (déduit) et selon l'évaluation enrichie.](graphiques/criteres-par-statut.svg)

| Statut | Outils | Où peuvent rester les données ? | Qui contrôle l’outil ? | De qui dépend-il pour fonctionner ? | Critères au total | Moyenne par outil |
|---|---|---|---|---|---|---|
| Libre | 24 | 24 | 1 | 24 | 49 | 2,04 |
| Partiellement libre (open core) | 6 | 6 | 0 | 6 | 12 | 2 |
| Code source disponible | 1 | 1 | 0 | 1 | 2 | 2 |
| Propriétaire | 26 | 26 | 26 | 7 | 59 | 2,27 |
| Pas encore enrichi | 3 | 3 | 2 | 1 | 6 | 2 |
| Ensemble | 60 | 60 | 29 | 39 | 128 | 2,13 |

### Évaluation enrichie (second avis)

| Critère | Outils | % des évaluations |
|---|---|---|
| Où peuvent rester les données ? | 47 | 82,5 % |
| Qui contrôle l’outil ? | 21 | 36,8 % |
| De qui dépend-il pour fonctionner ? | 34 | 59,6 % |

| Statut | Outils | Où peuvent rester les données ? | Qui contrôle l’outil ? | De qui dépend-il pour fonctionner ? | Critères au total | Moyenne par outil |
|---|---|---|---|---|---|---|
| Libre | 24 | 24 | 1 | 24 | 49 | 2,04 |
| Partiellement libre (open core) | 6 | 6 | 0 | 6 | 12 | 2 |
| Code source disponible | 1 | 1 | 0 | 1 | 2 | 2 |
| Propriétaire | 26 | 16 | 20 | 3 | 39 | 1,5 |
| Ensemble | 57 | 47 | 21 | 34 | 102 | 1,79 |

- **39** évaluation(s) sur 57 concordent avec le répertoire (68,4 %) ; **18** s'en écartent (Klipfolio, cDox, Kashoo, Elodia, Zeffy, CanaDon, Webnames.ca, Member365, Le point de vente, Envoke et 8 autre(s)).
- Confiance de l'évaluation enrichie : moyenne 29, élevée 26, faible 2.

### Critères vérifiés d'après la page de l'outil (citation à l'appui)

Pour chaque outil enrichi, une IA a lu la page de l'outil et répondu, critère par critère, **confirmé**, **infirmé** ou **indéterminé**, avec une citation copiée mot pour mot (champ `criteres_confirmes` de `outils.json`). Un critère indéterminé n'est pas contredit : la page ne permet simplement pas de conclure. Ce nombre peut être inférieur au nombre d'étoiles, qui reste celui de la source.

![Barres empilées : pour chaque critère et chaque statut du code source, part des outils vérifiés dont le critère est confirmé, infirmé ou indéterminé d'après la page de l'outil (57 outils vérifiés).](graphiques/criteres-verdicts.svg)

| Statut | Outils | Où peuvent rester les données ? (confirmés / infirmés / indéterminés) | Qui contrôle l’outil ? (confirmés / infirmés / indéterminés) | De qui dépend-il pour fonctionner ? (confirmés / infirmés / indéterminés) |
|---|---|---|---|---|
| Libre | 24 | 24 / 0 / 0 | 1 / 23 / 0 | 17 / 0 / 7 |
| Partiellement libre (open core) | 6 | 6 / 0 / 0 | 0 / 6 / 0 | 4 / 0 / 2 |
| Code source disponible | 1 | 1 / 0 / 0 | 0 / 1 / 0 | 1 / 0 / 0 |
| Propriétaire | 26 | 14 / 0 / 12 | 25 / 0 / 1 | 3 / 2 / 21 |
| Ensemble | 57 | 45 / 0 / 12 | 26 / 30 / 1 | 25 / 2 / 30 |

- **57** outil(s) vérifié(s) sur 57 enrichis, par gpt-6-astra (57).
- **32** outil(s) sur 57 ont autant de critères confirmés que d'étoiles (56,1 %) ; pour les autres, la page n'établit pas tous les critères que les étoiles représentent.
- **39** outil(s) sur 57 ont exactement les critères de l'évaluation enrichie (68,4 %).

## Forges de code

![Diagramme à barres : nombre d'outils par forge de code (GitHub 26, Framagit 1, git.jami.net 1, hg.mozilla.org 1).](graphiques/forges.svg)

| Forge | Outils | Hôte(s) | Outils concernés |
|---|---|---|---|
| GitHub | 26 | github.com | 2FAS Auth, Bitwarden, CiviCRM, Collabora Online, CryptPad, Discourse et 20 autre(s) |
| Framagit | 1 | framagit.org | Mobilizon |
| git.jami.net | 1 | git.jami.net | Jami |
| hg.mozilla.org | 1 | hg.mozilla.org | Thunderbird |

- **Logiciels libres ou partiels sans dépôt connu** : La Digitale.
- Autres outils enrichis sans dépôt (propriétaires ou inconnus) : 27.

## Tags

- Moyenne de **4,39 tags par outil enrichi**.
- 36 tags utilisés sur 37 du vocabulaire; **non utilisés** : gestion-documentaire.

![Diagramme à barres : les 15 tags les plus fréquents (auto-hebergeable 25, api-integrations 22, gratuit 22, automatisation 14, vie-privee 14…).](graphiques/tags.svg)

| Tag | Description | Outils | % des outils enrichis |
|---|---|---|---|
| auto-hebergeable | Peut être installé et exploité sur l'infrastructure de l'organisation plutôt que chez le fournisseur. | 25 | 43,9 % |
| api-integrations | Offre une API ou des intégrations avec d'autres outils et services. | 22 | 38,6 % |
| gratuit | Offre une version gratuite, entièrement ou pour les organismes admissibles. | 22 | 38,6 % |
| automatisation | Automatise des tâches, des flux de travail ou des campagnes. | 14 | 24,6 % |
| vie-privee | Mise sur la protection de la vie privée : limitation du pistage, collecte minimale de données, fonctionnement sans compte. | 14 | 24,6 % |
| rapports-analytique | Produit des rapports, des tableaux de bord ou des indicateurs de suivi. | 13 | 22,8 % |
| application-mobile | Offre une application pour téléphone ou tablette. | 10 | 17,5 % |
| redaction-documents | Rédaction, édition ou correction de textes, tableurs, présentations et autres documents. | 10 | 17,5 % |
| securite-acces | Mots de passe, authentification à deux facteurs, protection contre l'hameçonnage et gestion des accès. | 10 | 17,5 % |
| application-bureau | S'installe comme application sur l'ordinateur. | 9 | 15,8 % |
| chiffrement | Chiffre les données ou les échanges, notamment de bout en bout. | 9 | 15,8 % |
| collaboration-temps-reel | Permet de travailler à plusieurs en même temps sur un même contenu. | 9 | 15,8 % |
| courriel-infolettres | Courriel, infolettres et marketing par courriel. | 8 | 14,0 % |
| gestion-contacts-membres | Gestion de contacts, de membres, de donateurs et de la relation avec eux (CRM). | 8 | 14,0 % |
| hors-ligne | Fonctionne sans connexion Internet ou garde les données localement sur l'appareil. | 7 | 12,3 % |
| messagerie-visioconference | Messagerie, appels audio et vidéo, visioconférence. | 6 | 10,5 % |
| evenements-billetterie | Organisation d'événements, inscriptions et vente de billets. | 5 | 8,8 % |
| communaute-reseau-social | Communautés en ligne, forums et réseaux sociaux. | 4 | 7,0 % |
| gestion-projets-taches | Planification de projets, suivi de tâches et d'échéances, tableaux Kanban. | 4 | 7,0 % |
| intelligence-artificielle | Utilise l'intelligence artificielle pour ses fonctions principales (génération, transcription, assistance). | 4 | 7,0 % |
| notes-veille | Prise de notes, organisation des connaissances, flux RSS et lecture d'articles sauvegardés. | 4 | 7,0 % |
| stockage-partage-fichiers | Stockage, synchronisation et partage de fichiers. | 4 | 7,0 % |
| dons-paiements | Collecte de dons, campagnes de financement et traitement de paiements. | 3 | 5,3 % |
| federe-decentralise | Repose sur des instances indépendantes qui communiquent entre elles ou sur une architecture pair-à-pair. | 3 | 5,3 % |
| sauvegarde | Sauvegarde et récupération de données. | 3 | 5,3 % |
| transcription-reunions | Transcription de la parole, dictée vocale et comptes rendus de réunions. | 3 | 5,3 % |
| anglais-seulement | Interface ou soutien disponibles uniquement en anglais. | 2 | 3,5 % |
| collections-patrimoine | Catalogage et publication de collections, de bibliothèques et de contenus culturels. | 2 | 3,5 % |
| comptabilite-facturation | Comptabilité, facturation, suivi des dépenses et rapports financiers. | 2 | 3,5 % |
| conception-design | Conception graphique, maquettes et prototypes. | 2 | 3,5 % |
| domaines-hebergement-web | Noms de domaine, hébergement Web et services d'infrastructure en ligne. | 2 | 3,5 % |
| ressources-humaines | Dossiers d'employés, vacances, absences et feuilles de temps. | 2 | 3,5 % |
| signature-electronique | Signature électronique de documents et suivi des signataires. | 2 | 3,5 % |
| navigation-web | Navigation sur le Web. | 1 | 1,8 % |
| subventions | Recherche de subventions et préparation de demandes de financement. | 1 | 1,8 % |
| tarif-osbl | Prévoit un rabais ou une tarification particulière pour les OSBL et organismes de bienfaisance. | 1 | 1,8 % |

**Tags les plus souvent associés** :

| Paire de tags | Outils |
|---|---|
| auto-hebergeable + gratuit | 14 |
| api-integrations + auto-hebergeable | 11 |
| api-integrations + automatisation | 10 |
| api-integrations + rapports-analytique | 9 |
| auto-hebergeable + collaboration-temps-reel | 8 |
| collaboration-temps-reel + redaction-documents | 8 |
| gratuit + vie-privee | 8 |
| auto-hebergeable + redaction-documents | 7 |
| api-integrations + gratuit | 6 |
| automatisation + rapports-analytique | 6 |

## Fiabilité et suivi

- Confiance de la déduction des critères : élevée 40, moyenne 17, faible 3.
- Outils restant à enrichir : 3.
