// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Adresses du site. L'identifiant d'une fiche est le slug du nom de l'outil (même règle que slug() de categories.ts
// à la racine, vérifiée par test/adresses.test.ts): lisible, stable tant que le nom ne change pas, sans caractère à encoder.

/** Identifiant de fiche: minuscules sans accents, mots séparés par un tiret. */
export function identifiant(nom: string): string {
  const id = nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!id) throw new Error(`identifiant de fiche vide pour « ${nom} »`);
  return id;
}

/** Deux outils ne peuvent pas partager une adresse: le build s'arrête plutôt que d'écraser une fiche. */
export function verifierUnicite(outils: readonly { nom: string }[]): void {
  const vus = new Map<string, string>();
  for (const { nom } of outils) {
    const id = identifiant(nom);
    const autre = vus.get(id);
    if (autre !== undefined) throw new Error(`deux outils donnent la même adresse de fiche: « ${autre} » et « ${nom} » (identifiant « ${id} »)`);
    vus.set(id, nom);
  }
}

/** Chemin de base avec une barre oblique au début et à la fin (« / », « /repertoire/ »). */
export function normaliserBase(base: string): string {
  const interieur = base.replace(/^\/+|\/+$/g, "");
  return interieur ? `/${interieur}/` : "/";
}

export function adresseAccueil(base: string, parametres = ""): string {
  return normaliserBase(base) + (parametres ? `?${parametres}` : "");
}

export function adresseFiche(id: string, base: string): string {
  return `${normaliserBase(base)}outils/${id}/`;
}
