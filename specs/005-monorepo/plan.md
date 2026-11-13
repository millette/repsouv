# Plan : monorepo et code commun

**Branche** : `005-monorepo` | **Date** : 2026-11-13

Demande : « Restructurer le projet en monorepo et refactoriser le code commun. » Ce plan tient lieu de
plan d'implémentation (constitution, flux de travail) ; il n'y a pas de `spec.md`, la demande ne changeant
ni les données elles-mêmes ni ce que le site montre.

## Décisions (réponses de Robin Millette, 2026-11-13)

| Question | Décision |
|---|---|
| Structure | Tout sous `packages/` : `packages/commun`, `packages/scripts`, `packages/site`. La racine garde la documentation et la configuration |
| Données | Dans `donnees/` : les cinq fichiers JSON, `schemas/`, `sommaire.md` et `graphiques/` |
| Node.js seul | Conservé, le chemin change : `node packages/scripts/update.ts` et `node packages/scripts/sommaire.ts` |

## Structure visée

```text
donnees/              outils.json, categories.json, criteres.json, tags.json, sources.json,
                      schemas/, sommaire.md, graphiques/
packages/
├── commun/           ce que les scripts et le site partagent : types des données, lecture des fichiers,
│                     statistiques, graphiques
├── scripts/          update, sommaire, extracteurs, enrichissement, vérification, schémas ; leurs tests
└── site/             le site de consultation (l'ancien site/)
package.json          racine des espaces de travail (workspaces: packages/*), commandes d'ensemble
```

Les paquets s'importent par chemin relatif (`../commun/…`), sans dépendance `workspace:` : `npm install`
doit suffire à qui n'a pas nub, et npm ne comprend pas ce protocole.

## Étapes

### Étape 1 : données dans `donnees/`
**But** : déplacer les données et leurs dérivés ; les scripts et le site les trouvent à leur nouvelle place.
**Critères** : contrôles de la racine et du site au vert ; aucune donnée modifiée (seul le chemin change).
**État** : fait

### Étape 2 : scripts et site sous `packages/`
**But** : `packages/scripts` (scripts et tests de la racine) et `packages/site` ; la racine devient la racine
des espaces de travail, avec un seul fichier de verrouillage.
**Critères** : `node packages/scripts/update.ts --dry-run` fonctionne ; tous les contrôles au vert ; le flux
de publication suit les nouveaux chemins.
**État** : fait

### Étape 3 : `packages/commun`
**But** : y placer ce que le site importe aujourd'hui de la racine (types, statistiques, graphiques) et le
code que les deux côtés dupliquent ; le site n'importe plus rien de `packages/scripts`.
**Critères** : tests de `commun` ; tous les contrôles au vert.
**État** : fait

`packages/commun` contient `modele.ts` (les types des données, source des schémas JSON), `ids.ts` (identifiants
fixes), `abandon.ts` (outils abandonnés après des échecs), `slug.ts`, `statistiques.ts` et `graphiques.ts` (la
construction des spécifications ; leur écriture en SVG par `vl-convert` reste dans `packages/scripts/graphiques.ts`).
Les modules des scripts réexportent ce qui en vient. Le site importe ces modules par des imports ordinaires : il n'a
plus besoin des dépendances des scripts pour se bâtir. La lecture des fichiers reste propre à chaque côté (les scripts
valident les dates de « meta » et écrivent, le site refuse un tableau vide et nomme le fichier fautif).

### Étape 4 : documentation, constitution, licences
**But** : README, `implementation.md`, `historique.md`, `site/README.md`, constitution (chemins et commandes),
`REUSE.toml`.
**Critères** : tests de documentation au vert ; `nub run licences` conforme.
**État** : à faire
