# Ticket amont pour Charles

Brouillon à ouvrir sur <https://gitlab.com/yaniskerdjana/charles/-/issues> (rédigé le 2026-11-13, d'après `data/` au commit 621269c du 2026-09-08). Non ouvert.

Titre : Réutilisation des données : fichier LICENSE absent, deux alternatives rattachées à aucun site, deux alternatives non européennes, deux URL en 404

Bonjour,

Je réutilise les fichiers de `data/` (alternatives, sites-us, categories) dans un répertoire francophone d'outils favorisant la souveraineté numérique, publié en JSON sous CC BY-SA 4.0 avec crédit à Charles. En les lisant, quatre points :

1. **Licence** : le README annonce MIT, mais le dépôt n'a pas de fichier `LICENSE` (GitLab affiche « aucune licence »). Un fichier `LICENSE` à la racine lèverait le doute pour qui réutilise les données.
2. **Matomo et Plausible** ne sont référencés par aucun site de `sites-us.json` : il n'y a pas d'entrée « Google Analytics » (le README la mentionne pourtant dans la catégorie Analytics). Une entrée `google-analytics` (domaines `analytics.google.com`, `marketingplatform.google.com`) les rattacherait.
3. **Deux alternatives non européennes** : Plans (Apple) (`appleplans`) a `country: "US"`, et Matomo `country: "NZ"` (l'éditeur, InnoCraft, est en Nouvelle-Zélande). Deux alternatives hors d'Europe dans une liste d'alternatives européennes : volontaire ?
4. **Deux URL répondent 404** : `https://www.infomaniak.com/kdrive` (Infomaniak kDrive) et `https://www.infomaniak.com/fr/la-suite` (La Suite). Les pages actuelles sont `https://www.infomaniak.com/fr/ksuite/kdrive` et `https://www.infomaniak.com/fr/ksuite` (vérifiées le 2026-11-13).

Merci pour ce travail.
