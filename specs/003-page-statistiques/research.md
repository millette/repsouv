# Recherche: page « Statistiques »

Décisions techniques du plan. Les essais cités ont été faits le 2026-11-13 dans `site/`.

## 1. Calculs et spécifications: ceux de la racine, importés

- **Décision**: `site/src/lib/statistiques.ts` importe `calculerStatistiques` de `../statistiques.ts`
  et `construireGraphiques` de `../graphiques.ts`, et les appelle avec les données déjà chargées
  par le site. Aucun calcul n'est réécrit.
- **Pourquoi**: demandé, et c'est la seule façon de garantir que la page et `sommaire.md` ne se
  contredisent jamais (FR-009): mêmes fonctions, mêmes données.
- **Conséquence**: le build du site exécute du code de la racine. `statistiques.ts` importe
  `enrichir.ts` et `openhub.ts` (pour deux fonctions), qui importent `linkedom` et les paquets
  SPDX: il faut donc que les dépendances de la racine soient installées (`nub install` à la
  racine) pour bâtir le site. Essai: l'import fonctionne depuis `site/`, sans effet de bord (les
  scripts de la racine ne s'exécutent que lancés directement). Les scripts de la racine ne
  dépendent toujours pas du site.
- **Solutions écartées**: lire `sommaire.md` (interdit par la demande, et il peut être périmé);
  recopier les calculs dans le site (ils divergeraient); déplacer les deux fonctions importées
  dans un module sans dépendance (ce serait changer les scripts de la racine, exclu).

## 2. Rendu en image au build, sans `vl-convert`

- **Décision**: `site/src/lib/rendu.ts` compile chaque spécification avec `vega-lite`
  (`compile`), puis la rend avec `vega` (`new View(parse(spec), { renderer: "none" }).toSVG()`),
  dans Node. Un point de terminaison statique, `site/src/pages/graphiques/[fichier].ts`, écrit
  `graphiques/<id>-clair.svg` et `graphiques/<id>-sombre.svg`.
- **Essai**: les neuf spécifications se rendent en 13 à 68 ms chacune, de 9 à 59 ko par image.
- **Pourquoi**: demandé (pas de `vl-convert` au build du site). vega sait produire du SVG sans
  navigateur ni canevas.
- **Justification écrite des dépendances d'exécution** (principe V): `vega` et `vega-lite` sont
  les bibliothèques pour lesquelles `graphiques.ts` écrit ses spécifications; sans elles, il
  faudrait `vl-convert` (un binaire à installer) ou réécrire les graphiques.
- **Écart possible avec les images du sommaire**: `vl-convert` et vega dans Node mesurent le texte
  différemment; les images peuvent différer de quelques pixels. Les données, les formes et les
  couleurs sont identiques, ce que la demande exige.

## 3. Deux thèmes

- **Décision**: `site/src/lib/themes-graphiques.ts` rend, pour un thème, une copie de la
  spécification où seuls changent le fond et les couleurs du texte, des axes, des grilles, des
  titres et des légendes (par `background` et `config`). Les couleurs des séries ne changent pas.
  La page porte les deux images de chaque graphique; le CSS montre celle du thème en cours, avec
  la même règle que le thème du site (attribut `data-theme` posé par l'interrupteur, sinon
  préférence du système), donc sans JavaScript.
- **Pourquoi**: clarification du 2026-11-13. Deux images plutôt qu'une image à couleurs variables:
  un `<img>` ne lit pas les variables CSS de la page.
- **Vigilance**: contraste du texte des graphiques sur le fond sombre (au moins 4,5 pour 1), et
  couleurs de la palette Okabe-Ito lisibles sur les deux fonds; un test calcule le contraste des
  couleurs de texte choisies.

## 4. Vue interactive: une île chargée quand le graphique devient visible

- **Décision**: `site/src/components/Graphique.tsx`, île SolidJS montée par `client:visible`. Elle
  charge `vega` par un import dynamique et la spécification déjà compilée
  (`graphiques/<id>-<thème>.json`) par `createResource`, sous `<Suspense>` et `<ErrorBoundary>`.
  Quand la vue est prête, elle prend la place de l'image; si le chargement échoue, l'image reste
  (FR-012). Le navigateur ne charge pas `vega-lite`: la compilation est faite au build.
- **Propriétés de l'île**: de la configuration seulement (identifiant du graphique, chemin de
  base, noms des séries, libellés); les données restent dans la spécification compilée.
- **Thème**: l'île observe l'attribut `data-theme` de la page et la préférence du système, et
  recharge la spécification de l'autre thème.
- **Pourquoi**: demandé (`client:visible`), et règles du skill `solidjs`.

## 5. Survol, clavier et mise en évidence

- **Décision**: `site/src/lib/interaction.ts` prépare la spécification avant compilation, sans
  toucher à `graphiques.ts`: un numéro de ligne `_i` sur chaque valeur, les infobulles activées,
  et deux paramètres, `courant` (ligne atteinte au clavier) et `serie` (série mise en évidence),
  dont dépendent l'opacité et le contour des marques.
  - **Survol**: l'île affiche la valeur exacte dans une infobulle à elle (gestionnaire d'infobulle
    de vega), pas dans l'attribut `title`.
  - **Clavier**: le graphique est un seul arrêt de tabulation; les flèches changent `courant`;
    la barre en cours reçoit un contour, et son texte (celui de la ligne du tableau) s'affiche
    sous le graphique dans une région annoncée (`aria-live`).
  - **Légende**: pour un graphique à plusieurs séries, l'île ajoute des boutons à bascule
    (`aria-pressed`), un par série; un bouton pressé règle `serie`: les autres séries s'estompent
    et la série choisie reçoit un contour, donc la distinction ne repose pas sur la couleur seule
    (FR-016).
- **Essai**: des paramètres de premier niveau se compilent pour les neuf spécifications, y compris
  celles à couches et à facettes.
- **Solutions écartées**: la légende interactive de vega (non atteignable au clavier); un arrêt de
  tabulation par barre (plus de 150 arrêts).

## 6. Tableaux et liens

- **Décision**: `site/src/lib/tableaux.ts` décrit, pour chaque graphique, les colonnes de son
  tableau à partir des champs de ses valeurs (`spec.data.values`): les chiffres du tableau sont
  donc ceux que le graphique dessine (FR-007). Chaque tableau est un composant `.astro` dans un
  `<details>` « Voir les chiffres », fermé au départ.
- **Liens** (FR-017 à FR-019): les tableaux par catégorie et statut, par statut et par tag mènent
  à l'explorateur filtré (`adresseExplorer`), dont les paramètres sont fixés par
  `specs/002-explorateur-outils/contracts/adresse.md`. Un test vérifie, avec la règle de sélection
  de l'explorateur, que chaque lien retient autant d'outils que le chiffre.
- **Provenance**: une table associe chaque graphique à ce qu'il compte (déduction, évaluation par
  IA, vérification par IA, champ produit par IA), affichée en texte sous son titre.

## 7. Nombres à la française

- **Décision**: `site/src/lib/nombres.ts`, avec `Intl.NumberFormat("fr-CA")`: virgule décimale,
  espace avant « % ». Les étiquettes dessinées dans les graphiques viennent de `graphiques.ts`,
  qui écrit déjà les décimales avec une virgule.

## 8. Tests

- **Unitaires**: chiffres clés, tableaux (colonnes, liens, provenance), adaptation au thème
  (seules les couleurs de fond et de texte changent; contraste), préparation de l'interaction
  (les données ne changent pas), nombres.
- **Site bâti**: la page a les chiffres clés et un bloc par graphique (titre, provenance, deux
  images avec texte de remplacement, tableau); les 18 images et les 18 spécifications existent;
  les chiffres de chaque tableau sont ceux de `construireGraphiques` appelé sur les mêmes données;
  chaque lien retient autant d'outils que son chiffre.
- **Navigateur**: survol, flèches, légende, changement de thème, liens, sans JavaScript, échec du
  chargement de la vue (l'image reste), axe en thème clair et sombre, 360 px de large.
