# Implementation Plan: Déploiement sur GitHub Pages

**Branch**: `004-deploiement-github-pages` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-deploiement-github-pages/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Publier le site de consultation sur GitHub Pages à chaque changement de la branche principale, et à
la main, après tous les contrôles du dépôt et du site. Le site vit alors sous le chemin du dépôt
(`https://millette.github.io/repsouv/`), déduit du dépôt qui publie.

Approche: un flux GitHub Actions (`.github/workflows/pages.yml`) en deux tâches: la première
installe, contrôle, bâtit le site avec l'adresse et le chemin que GitHub Pages lui donne, et dépose
le résultat; la seconde le met en ligne. Le site sait déjà vivre sous un chemin de base
(`SITE_URL`, `SITE_BASE`, tranche 001): des tests le prouvent désormais sur le poste, dont un test
dans un navigateur du site bâti sous `/repsouv/`.

## Technical Context

**Language/Version**: YAML de GitHub Actions; TypeScript et Node.js 26 pour les tests

**Primary Dependencies**: actions `actions/checkout` v7, `actions/setup-node` v7,
`astral-sh/setup-uv` v10, `actions/configure-pages` v6, `actions/upload-pages-artifact` v5,
`actions/deploy-pages` v5 (versions relevées le 2026-11-13); nub, installé par son script. Aucune
dépendance ajoutée au dépôt.

**Storage**: aucun; le site bâti est déposé comme artefact de la publication.

**Testing**: `node:test` (site bâti sous un chemin de base; lecture du flux de publication);
Playwright (le site sous `/repsouv/` dans un navigateur).

**Target Platform**: GitHub Actions (Ubuntu) et GitHub Pages.

**Project Type**: site Web statique et sa publication continue.

**Performance Goals**: une publication en moins de dix minutes (SC-001).

**Constraints**: aucun secret, aucun appel payant, aucune écriture dans le dépôt; seule la branche
principale publie; les contrôles précèdent la mise en ligne.

**Scale/Scope**: un fichier de flux, deux fichiers de tests, la documentation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Comment le plan le respecte |
|---|---|---|
| I. Les données d'abord | Conforme | La publication lit les données du dépôt telles quelles et n'écrit rien. |
| II. Provenance et honnêteté | Conforme | Rien ne change dans ce que le site affiche. La documentation dit ce qui est vérifié sur le poste et ce qui ne peut l'être que sur GitHub. |
| III. Licences REUSE | Conforme | Le fichier de flux porte ses en-têtes SPDX; `nub run licences` fait partie des contrôles de la publication. |
| IV. Les coûts sont explicites | Conforme | La publication ne lance ni `update.ts` ni `sommaire.ts`, n'emploie aucun secret et ne fait aucun appel payant; un test le vérifie dans le fichier de flux. |
| V. Tests d'abord, simplicité | Conforme | Tests écrits avant le flux; un seul fichier de flux, sans action maison. |
| VI. Tout en français | Conforme | Noms des tâches et des étapes, commentaires et documentation en français. |
| Contraintes techniques et flux de travail | Conforme | nub pour installer et lancer; les trois contrôles de la constitution sont ceux de la publication. |

Aucune violation.

**Réévaluation après la conception (Phase 1)**: conforme. Limite assumée et écrite: le flux
lui-même ne s'exécute que sur GitHub; sur le poste, on vérifie sa forme et tout ce qu'il lance.

## Project Structure

### Documentation (this feature)

```text
specs/004-deploiement-github-pages/
├── plan.md
├── research.md
├── quickstart.md
├── contracts/publication.md   # Ce que le flux de publication garantit
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
.github/workflows/pages.yml          # NOUVEAU: contrôler, bâtir, publier
site/
├── playwright.config.ts             # second serveur: le site bâti sous /repsouv/
├── .gitignore                       # dist-base/
└── test/
    ├── build/base.test.ts           # NOUVEAU: site bâti sous un chemin de base, adresses internes
    ├── publication.test.ts          # NOUVEAU: forme du flux de publication
    └── e2e/base.spec.ts             # NOUVEAU: le site sous /repsouv/ dans un navigateur
README.md, site/README.md, implementation.md, historique.md
```

**Structure Decision**: un seul fichier de flux à la racine, là où GitHub le cherche; les tests
restent dans `site/test/`, avec ceux du site.

## Complexity Tracking

Aucune violation à justifier.
