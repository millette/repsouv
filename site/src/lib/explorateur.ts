// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Données de l'explorateur: un dérivé léger des cinq fichiers du dépôt, écrit au build dans explorateur.json et lu par
// l'île dans le navigateur. Seulement ce que l'explorateur affiche ou filtre; descriptions longues, citations, second
// avis et Open Hub restent sur les fiches. Une valeur absente n'a pas de champ (jamais null).
import { identifiant } from "./adresses.ts";
import { lecturesCriteres, type StatutVerdict } from "./criteres.ts";
import type { Donnees } from "./donnees.ts";
import { nomHote, nomPays } from "./libelles.ts";
import { estEnrichi, outilsActifs, type Statut, statutDe } from "./repertoire.ts";

export interface OutilExplorateur {
  /** Identifiant de la fiche (slug du nom). */
  id: string;
  nom: string;
  categorie: string;
  score: number;
  /** Présent quand le score ne vient pas de la source. */
  scoreEstime?: true;
  statut: Statut;
  tags: string[];
  /** Code du pays de l'éditeur, quand la source le dit. */
  pays?: string;
  /** Identifiant de la source du répertoire. */
  source: string;
  enrichi: boolean;
  /** Licence SPDX, sinon licence maison. */
  licence?: string;
  /** Noms d'hôte des services que l'outil remplace. */
  remplace: string[];
  /** Verdict vérifié de chaque critère; absent si l'outil n'a pas été vérifié. */
  verdicts?: Record<string, StatutVerdict>;
  /** Critères déduits des étoiles par le dépôt. */
  deduits: string[];
  description: string;
}

export interface DonneesExplorateur {
  meta: { data_license: string; updated_at: string };
  categories: { id: string; nom: string; icone: string }[];
  tags: string[];
  sources: { id: string; nom: string }[];
  criteres: { id: string; icon: string; titre: string }[];
  pays: { code: string; nom: string }[];
  outils: OutilExplorateur[];
}

export function donneesExplorateur(donnees: Donnees): DonneesExplorateur {
  const actifs = outilsActifs(donnees.outils);
  const outils = actifs.map((o): OutilExplorateur => {
    const verifies = lecturesCriteres(o, donnees.criteres).verifies;
    const licence = o.licence || o.custom_license;
    return {
      id: identifiant(o.nom),
      nom: o.nom,
      categorie: o.categorie,
      score: o.score,
      ...(o.score_estime ? { scoreEstime: true as const } : {}),
      statut: statutDe(o),
      tags: o.tags ?? [],
      ...(o.pays ? { pays: o.pays } : {}),
      source: o.source_repertoire_id,
      enrichi: estEnrichi(o),
      ...(licence ? { licence } : {}),
      remplace: (o.alternative_a ?? []).map(nomHote),
      ...(verifies ? { verdicts: Object.fromEntries(verifies.verdicts.map((v) => [v.critere.id, v.statut])) } : {}),
      deduits: donnees.criteres.filter((c) => o.criteres.includes(c.id)).map((c) => c.id),
      description: o.description,
    };
  });
  const utilises = <T>(valeurs: T[]) => new Set(valeurs);
  const categories = utilises(outils.map((o) => o.categorie));
  const tags = utilises(outils.flatMap((o) => o.tags));
  const sources = utilises(outils.map((o) => o.source));
  const pays = [...utilises(outils.flatMap((o) => (o.pays ? [o.pays] : [])))].map((code) => ({ code, nom: nomPays(code) }));
  return {
    meta: { data_license: donnees.meta.data_license, updated_at: donnees.meta.updated_at },
    categories: donnees.categories.filter((c) => categories.has(c.id)).map(({ id, nom, icone }) => ({ id, nom, icone })),
    tags: donnees.tags.filter((t) => tags.has(t.id)).map((t) => t.id),
    sources: donnees.sources.filter((s) => sources.has(s.id)).map(({ id, nom }) => ({ id, nom })),
    criteres: donnees.criteres.map(({ id, icon, titre }) => ({ id, icon, titre })),
    pays: pays.sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    outils,
  };
}
