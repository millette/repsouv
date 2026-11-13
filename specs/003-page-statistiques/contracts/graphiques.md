# Contrat: graphiques de la page « Statistiques »

## Fichiers produits au build

Pour chaque graphique `<id>` et chaque thème (`clair`, `sombre`), dans `<base>/graphiques/`:

| Fichier | Contenu |
|---|---|
| `<id>-<thème>.svg` | Image SVG complète du graphique: mêmes données, formes et couleurs de séries que la spécification de la racine |
| `<id>-<thème>.json` | Spécification Vega compilée, avec les signaux `courant` (nombre, `-1` au départ) et `serie` (texte ou `null`) et un champ `_i` (numéro de ligne) sur chaque valeur |

Le build ne lance pas `vl-convert` et ne fait aucun appel réseau.

## Comportement interactif

L'île est montée quand le graphique devient visible. Tant que la vue n'est pas prête, et si son
chargement échoue, l'image reste affichée.

| Élément | Exigence |
|---|---|
| Vue | Remplace l'image du thème en cours; porte `role="img"` et le texte de remplacement du graphique |
| Arrêt de tabulation | Un seul par graphique: son conteneur, nommé par le titre du graphique, avec la consigne « flèches pour parcourir les valeurs » |
| Flèches | Droite ou bas: valeur suivante; gauche ou haut: précédente; Début et Fin: première et dernière; Échap: aucune. L'ordre est celui des lignes du tableau |
| Valeur en cours | Sa marque reçoit un contour; son texte, celui de la ligne du tableau (« Catégorie: …; Statut: …; Outils: 3 »), s'affiche sous le graphique dans une région `aria-live="polite"` |
| Survol | Une infobulle donne les mêmes informations pour la marque survolée; elle ne passe pas par l'attribut `title` |
| Légende | Pour un graphique à plusieurs séries: un groupe de boutons à bascule (`aria-pressed`), un par série, sous le graphique. Un bouton pressé estompe les autres séries et entoure la série choisie; le presser de nouveau, ou en presser un autre, change le choix |
| Thème | Quand le thème de la page change, la vue repasse dans le thème correspondant, sans recharger la page |
| Sans JavaScript | Aucun de ces éléments n'est affiché; l'image et le tableau suffisent |
