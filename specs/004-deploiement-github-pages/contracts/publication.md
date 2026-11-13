# Contrat: publication sur GitHub Pages

Fichier: `.github/workflows/pages.yml`.

| Élément | Exigence |
|---|---|
| Déclencheurs | `push` sur `main`; `workflow_dispatch`. Aucun autre (ni `pull_request`, ni planification) |
| Droits | `contents: read`, `pages: write`, `id-token: write`; aucun droit d'écriture sur le contenu du dépôt |
| Secrets | Aucun secret du dépôt n'est référencé |
| Concurrence | Groupe `pages`; une publication en cours n'est pas annulée |
| Tâche `construire` | Récupère le dépôt; installe Node.js d'après `.node-version`, nub et uv; `nub install` à la racine et dans `site/` |
| Contrôles | À la racine: `nub run test`, `nub run typecheck`, `nub run licences`. Dans `site/`: `nub run check`, `nub run test`, `nub run test:e2e`. Tous avant le dépôt de l'artefact |
| Build de publication | `nub run build` dans `site/`, après les contrôles, avec `SITE_URL` et `SITE_BASE` tirés de `actions/configure-pages` |
| Artefact | `site/dist`, déposé par `actions/upload-pages-artifact` |
| Tâche `publier` | Dépend de `construire`; environnement `github-pages`; `actions/deploy-pages` |
| Interdits | Aucun appel à `update.ts`, `sommaire.ts`, `extract*.ts` ni `ajouter.ts`; aucun `git push` ni `git commit` |

## Site publié

| Élément | Exigence |
|---|---|
| Adresse | `<origine>/<chemin du dépôt>/`, par exemple `https://millette.github.io/repsouv/` |
| Adresses internes | Toutes sous le chemin du dépôt: pages, `_astro/`, `graphiques/`, `explorateur.json`, fiches lues par la boîte « Détails » |
| Adresse inconnue | `404.html` du site, dont les liens ramènent sous le chemin du dépôt |
| Sans chemin | Bâti sans `SITE_BASE`, le site fonctionne à la racine |
