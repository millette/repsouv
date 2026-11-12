// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Données fictives partagées par les tests du sommaire et des graphiques (jamais outils.json).
import type { OutilClasse } from "../classify.ts";
import type { Tag } from "../enrichir.ts";
import type { Categorie } from "../categories.ts";
import type { Critere, CriteresConfirmes } from "../extract.ts";
import type { Entree } from "../statistiques.ts";
import type { Source } from "../sources.ts";

export const META = { data_license: "CC-BY-SA-4.0", created_at: "2026-11-11T16:43:11-05:00", updated_at: "2026-11-12T10:00:00-05:00" };
export const D0 = "2026-11-05T09:53:00-05:00";
export const D1 = "2026-11-20T14:00:00-05:00";

export const CATEGORIES: Categorie[] = [
  { id: "cat1", nom: "Cat1", icone: "🧪", description: "Outils d'essai de la première catégorie, pour les tests." },
  { id: "cat2", nom: "Cat2", icone: "🧫" },
];
export const CRITERES: Critere[] = [
  { id: "donnees", icon: "📍", titre: "Où peuvent rester les données ?", description: "d" },
  { id: "controle", icon: "🏢", titre: "Qui contrôle l'outil ?", description: "d" },
  { id: "dependance", icon: "🔗", titre: "De qui dépend-il pour fonctionner ?", description: "d" },
];
export const SOURCES: Source[] = [
  { id: "praxis", nom: "Praxis", url: "https://praxis.example/", extracteur: "praxis" },
  { id: "facil", nom: "FACiL", url: "https://facil.example/", extracteur: "manuel", pdc: "https://facil.example/pdc/", donnees: "https://facil.example/donnees/", soumis_par: { nom: "Robin Millette", url: "https://robin.millette.info/", email: "robin@example.com" } },
];
export const TAGS: Tag[] = [
  { id: "chiffrement", description: "Chiffre les données." },
  { id: "auto-hebergeable", description: "Installable | chez soi." },
  { id: "gratuit", description: "Gratuit." },
  { id: "inutilise", description: "Jamais utilisé." },
  { id: "nouveau-tag", description: "Ajouté.", justification: "Aucun tag existant ne convient.", propose_pour: "Maison" },
];

export const outil = (nom: string, extra: Partial<OutilClasse> = {}): OutilClasse => ({
  categorie: "cat1", nom, score: 2, lien: `https://${nom}.example/`, description: `Description de ${nom}.`,
  derniere_modification: D0, changement: null, source_repertoire_id: "praxis", criteres: ["donnees", "dependance"], confiance: "moyenne", ...extra,
});
export const enrichi = (nom: string, extra: Partial<OutilClasse> = {}) =>
  outil(nom, {
    description_longue: "Longue.", tags: ["chiffrement"], source: "libre", licence: "AGPL-3.0-only", custom_license: null, custom_license_url: null,
    repo: `https://github.com/org/${nom}`, enrichi_le: "2026-11-12T09:00:00-05:00",
    evaluation_enrichie: { score: 2, criteres: ["donnees", "dependance"], confiance: "élevée" }, ...extra,
  });

/** Un outil enrichi avant que la date d'enrichissement soit enregistrée. */
export const sansDate = (o: OutilClasse): OutilClasse => {
  delete o.enrichi_le;
  return o;
};

/** Verdicts d'IA (criteres_confirmes): `c` confirmé avec citation, `x` infirmé avec citation, `?` indéterminé. */
export const confirmes = (donnees: "c" | "x" | "?", controle: "c" | "x" | "?", dependance: "c" | "x" | "?"): CriteresConfirmes => {
  const v = { donnees, controle, dependance };
  const ids = ["donnees", "controle", "dependance"] as const;
  return {
    criteres: ids.filter((id) => v[id] === "c"),
    preuves: Object.fromEntries(ids.filter((id) => v[id] === "c").map((id) => [id, `preuve ${id}`])),
    infirmes: Object.fromEntries(ids.filter((id) => v[id] === "x").map((id) => [id, `contre ${id}`])),
    modele: "gpt-6-astra", date: "2026-11-12T07:41:55-05:00",
  };
};

export const OUTILS: OutilClasse[] = [
  enrichi("A", { tags: ["chiffrement", "auto-hebergeable"], criteres_confirmes: confirmes("c", "x", "c") }),
  enrichi("B", {
    source: "partiel", licence: "MIT", repo: "https://gitlab.com/org/B", tags: ["chiffrement", "auto-hebergeable", "gratuit"],
    criteres: ["donnees", "controle"], enrichi_le: "2026-11-12T09:00:20-05:00",
    evaluation_enrichie: { score: 1, criteres: ["controle"], confiance: "faible", ecart: "Le répertoire suppose les données au Canada." },
    criteres_confirmes: confirmes("x", "c", "?"),
  }),
  enrichi("C", { source: "proprietaire", licence: null, repo: null, score: 3, criteres: ["donnees", "controle", "dependance"], tags: ["gratuit"], categorie: "cat2", enrichi_le: "2026-11-13T08:00:00-05:00",
    evaluation_enrichie: { score: 3, criteres: ["donnees", "controle", "dependance"], confiance: "élevée" }, criteres_confirmes: confirmes("c", "c", "c") }),
  outil("D", { categorie: "cat2", changement: "nouveau", derniere_modification: D1 }),
  enrichi("Maison", { source: "source-disponible", criteres_confirmes: confirmes("?", "?", "?"), licence: null, custom_license: "Licence maison", custom_license_url: "https://maison.example/licence", repo: "https://git.exemple.org/x/Maison", tags: [] }),
  sansDate(enrichi("G", { licence: "Apache-2.0 OR MIT", categorie: "cat2" })),
  outil("Retire", { removed: true, changement: "retrait", derniere_modification: D1 }),
];
export const entree = (outils = OUTILS, sources?: Source[]): Entree => ({ outils, categories: CATEGORIES, tags: TAGS, criteres: CRITERES, meta: META, ...(sources && { sources }) });
