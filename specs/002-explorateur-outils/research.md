# Recherche: explorateur interactif des outils

Décisions techniques du plan. Elles s'appuient sur le site de la tranche 001 (`site/`) et sur le
skill `solidjs` du dépôt.

## 1. Île de l'explorateur

- **Décision**: une île SolidJS, `site/src/components/Explorateur.tsx`, montée par
  `client:only="solid-js"` dans `site/src/pages/explorer.astro`. L'intégration Solid est déjà
  installée (tranche 001).
- **Pourquoi**: demandé. L'explorateur n'a de sens qu'avec JavaScript (tri, filtres, comparaison);
  `client:only` évite de rendre au build une liste que le navigateur referait aussitôt, et de
  lancer la lecture des données pendant le build.
- **Sans JavaScript**: le contenu d'attente de l'île (`slot="fallback"`), présent dans le HTML servi, dit
  « Chargement des outils… », que l'explorateur demande JavaScript, et renvoie à la page « Outils »
  (FR-029). L'île le remplace une fois montée; sans JavaScript, il reste affiché. Un bloc
  `<noscript>` a été écarté à l'implémentation: un navigateur où les scripts sont bloqués par un
  réglage ou une extension ne l'affiche pas toujours (vérifié avec Chromium piloté par Playwright).
- **Solutions écartées**: `client:load` avec rendu au build (la liste complète serait dans le HTML
  et dans le fichier de données; la demande veut que la page sans JavaScript renvoie ailleurs).

## 2. Données: fichier produit au build, lu par `createResource`

- **Décision**: un point de terminaison statique d'Astro, `site/src/pages/explorateur.json.ts`,
  écrit `explorateur.json` au build à partir de `site()` (les cinq fichiers de la racine, lus tels
  quels). Dans le navigateur, `site/src/lib/chargement.ts` le lit par `fetch` et vérifie sa forme;
  l'île l'appelle par `createResource`, sous `<Suspense>` (état de chargement) et
  `<ErrorBoundary>` (message d'erreur, bouton « Réessayer » qui relance la ressource).
- **Adresse du fichier**: construite depuis `import.meta.env.BASE_URL`, jamais un `/` en dur, pour
  que le site fonctionne sous un chemin de base. L'île ne reçoit en propriété que cette adresse et
  le chemin de base (de la configuration, jamais les données).
- **Contenu**: seulement ce que l'explorateur affiche ou filtre (voir
  [contracts/donnees.md](contracts/donnees.md)), sans les descriptions longues ni les citations:
  moins de 150 ko pour 154 outils (104 ko mesurés, dont l'essentiel en descriptions courtes; 16 ko compressé).
- **Pourquoi**: demandé, et règles du skill `solidjs` (« Resources in static Astro islands »).
- **Appel réseau**: c'est la lecture, par le navigateur, d'un fichier statique du site lui-même;
  ni serveur, ni API, ni appel payant (FR-036). Le test de la tranche 001 qui interdit `fetch` dans
  `site/src/` est resserré: `fetch` n'est admis que dans `chargement.ts`, et seulement vers une
  adresse reçue en paramètre.
- **Solutions écartées**: passer les données en propriétés de l'île (elles seraient sérialisées
  dans le HTML; le skill réserve les propriétés à la configuration); lire les cinq fichiers JSON
  bruts depuis le navigateur (1 Mo et plus, avec les descriptions longues).

## 3. État dans l'adresse

- **Décision**: l'état complet (tri, sens, filtres, vue, outils comparés) est un store Solid,
  initialisé depuis l'adresse et réécrit dans l'adresse à chaque changement
  (`site/src/lib/etat.ts`, sans accès au DOM). Un choix discret (case, tri, vue, comparaison)
  pousse une entrée d'historique; la frappe dans la recherche remplace l'entrée courante;
  `popstate` restaure l'état de l'entrée atteinte.
- **Paramètres**: ceux de la tranche 001 gardent leur nom (`categorie`, `tag`, `statut`, `q`);
  s'ajoutent `score`, `donnees`, `controle`, `dependance`, `pays`, `source`, `enrichi`, `tri`,
  `sens`, `vue` et `comparer` (voir [contracts/adresse.md](contracts/adresse.md)). Les valeurs par
  défaut ne sont pas écrites: sans choix, l'adresse est celle de la page.
- **Pourquoi**: FR-023 à FR-026. Reprendre la mécanique éprouvée de la tranche 001 évite de la
  réinventer.
- **Solutions écartées**: le stockage local (un lien copié ne restaurerait rien); un fragment
  `#…` (moins lisible, et les liens des fiches emploient déjà des paramètres).

## 4. Tri

- **Décision**: `site/src/lib/tri.ts`. Tri par nom avec `Intl.Collator("fr", { sensitivity:
  "base", numeric: true })`; par score; par catégorie selon le rang de la catégorie dans les
  données. Toute égalité est départagée par le nom, croissant, quel que soit le sens demandé.
- **Pourquoi**: FR-005 et FR-006. `Intl.Collator` donne l'ordre alphabétique français sans table
  maison (« Élodia » avec les « e »).

## 5. Filtres

- **Décision**: `site/src/lib/selection.ts` reprend la règle de la tranche 001 (« ou » dans un
  filtre à choix multiple, « et » entre les filtres) et l'étend: score minimal, verdict par
  critère, pays, source, enrichi ou non. `normaliser()` reste dans `filtres.ts`.
- **Verdicts**: un outil sans critères vérifiés n'est retenu par aucun filtre de verdict, même
  « indéterminé »: un critère indéterminé est un verdict rendu après lecture de la page.
- **Valeurs offertes**: seulement celles que les données portent (pays et sources des outils
  actifs, tags utilisés), dans l'ordre des données; les pays sont nommés en français.

## 6. Comparaison

- **Décision**: `site/src/lib/comparaison.ts` gère le choix (de deux à quatre outils, cinquième
  refusé) et produit les lignes du tableau: score, verdict vérifié de chacun des trois critères,
  critères déduits des étoiles, statut du code source, licence, pays, services remplacés. La
  comparaison est un `<table>` avec les outils en colonnes et un en-tête de ligne par
  information, affiché au-dessus des résultats; sur un écran étroit, il défile seul en largeur.
- **Cases vides**: une information absente est écrite en clair (« Non vérifié », « Non connu »,
  « Pas encore enrichi »), pour que les colonnes restent comparables (FR-021).
- **Pourquoi**: clarifications du 2026-11-13. Un tableau HTML est ce que les lecteurs d'écran
  parcourent le mieux pour comparer des colonnes.
- **Solutions écartées**: une boîte de dialogue (cache les résultats); des cartes côte à côte
  (lignes non alignées).

## 7. Vues en cartes et en tableau

- **Décision**: deux rendus des mêmes résultats triés, choisis par deux boutons radio (« Cartes »,
  « Tableau »). Le tableau a des en-têtes de colonnes (`<th scope="col">`); l'en-tête de la
  colonne triée porte `aria-sort`. Le tableau est dans un conteneur qui défile seul en largeur sur
  téléphone.
- **Provenance dans le tableau**: l'en-tête de la colonne « Statut du code source » porte le
  libellé « Produit par IA, à vérifier » une fois, plutôt que 154 fois; un score estimé est dit
  estimé dans sa cellule.

## 8. Accueil, page « Outils » et navigation

- **Décision**: `site/src/pages/index.astro` devient la présentation du projet; la liste par
  catégorie passe dans `site/src/pages/outils/index.astro` (adresse `/outils/`, au-dessus des
  fiches `/outils/<id>/`), avec les mêmes cartes, sans filtre ni île. L'île `Filtres.tsx` et ses
  tests sont supprimés; les tests de la liste suivent la page « Outils ». Un composant
  `Navigation.astro` met dans l'en-tête les liens « Accueil », « Outils » et « Explorer », la page
  en cours portant `aria-current="page"` et un style qui ne repose pas sur la couleur seule.
- **Contenu de l'accueil**: tiré de `README.md` (ce qu'est le répertoire, source, crédits, outils à
  installer) et de `historique.md` (étapes), rassemblé dans `site/src/lib/presentation.ts` comme
  des données, avec un test qui vérifie que chaque logiciel cité figure dans la documentation ou
  dans les dépendances du dépôt (FR-045). Les nombres (outils, catégories, sources) sont calculés
  depuis les données, jamais écrits en dur.
- **Liens des fiches**: la catégorie et les tags mènent à `/explorer/?categorie=…` et
  `/explorer/?tag=…`.
- **Pourquoi**: clarifications du 2026-11-13.

## 9. Tests

- **Unitaires** (`site/test/*.test.ts`): construction des données, chargement (forme invalide
  refusée avec un message), état et adresse (aller-retour, valeurs inconnues ignorées), sélection,
  tri, comparaison, présentation.
- **Site bâti** (`site/test/build/`): `explorateur.json` contient exactement les outils actifs et
  les champs du contrat; accueil de présentation; page « Outils » (tests de l'ancienne liste);
  navigation sur chaque page; page « Explorer » avec son message `<noscript>`.
- **Navigateur** (`site/test/e2e/`): tri, chaque filtre, combinaison, vues, comparaison (deux à
  quatre, cinquième refusé), adresse partagée et bouton précédent, chargement ralenti et échec de
  chargement (requête interceptée par Playwright), sans JavaScript, clavier seul, axe A et AA en
  thème clair et sombre, 360 px de large, moins de 100 ms par filtre.

## 10. Détails d'un outil en boîte modale (amendement du 2026-11-13)

- **Décision**: un `<dialog>` natif avec les classes « modal » de daisyUI, dans un composant Solid
  `site/src/components/explorateur/Details.tsx`. Ouvert par `showModal()`: le navigateur retient
  le focus dans la boîte, la ferme à la touche Échap et rend le focus à la commande d'origine. Un
  formulaire `method="dialog"` en arrière-plan (motif de daisyUI) la ferme au clic hors d'elle.
- **Contenu**: celui de la fiche. `chargerFiche()` (`site/src/lib/chargement.ts`) lit la page
  statique `/outils/<id>/`; `contenuFiche()` en extrait le titre et le contenu principal, sans le
  lien de retour. L'île l'insère dans la boîte: c'est du HTML produit par le site lui-même au
  build, où les données sont déjà échappées et le HTML des descriptions neutralisé. Le `<h1>` de
  la fiche devient le titre de la boîte.
- **Pourquoi**: « tous les détails disponibles » sont exactement ce que la fiche montre, avec sa
  provenance et ses citations. Relire la fiche évite de réécrire son gabarit en Solid et de grossir
  `explorateur.json` de tout ce qu'il laisse volontairement de côté.
- **Solutions écartées**: un fichier JSON par outil et un second gabarit en Solid (deux rendus à
  tenir identiques); mettre tous les détails dans `explorateur.json` (plus de 1 Mo pour ouvrir une
  page de liste); une `<iframe>` de la fiche (en-tête et pied répétés, focus et hauteur difficiles).
- **Adresse**: paramètre `fiche=<id>`, écrit en dernier. Ouvrir et fermer poussent chacun une
  entrée d'historique, pour que le bouton précédent ferme la boîte. Un identifiant inconnu est
  ignoré.
- **États**: « Chargement des détails… », puis le contenu, ou un message d'erreur avec le lien
  « Ouvrir la fiche »; la boîte n'est jamais vide (FR-050).
- **Liens dans la boîte**: ceux de la fiche. La catégorie et les tags mènent à l'explorateur
  filtré, donc ferment la boîte en changeant de page; « Voir aussi » mène à d'autres fiches.
