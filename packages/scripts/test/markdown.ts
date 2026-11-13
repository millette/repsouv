// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Outils partagés par les tests de la documentation (test/documentation.test.ts et test/donnees/documentation.test.ts):
// ancres à la façon de GitHub, texte sans code, problèmes de liens.
import { dirname, join, normalize } from "node:path";

/** Les fichiers Markdown rédigés à la main, par leur chemin depuis la racine du dépôt. */
export const FICHIERS_REDIGES = ["README.md", "implementation.md", "historique.md", "analyse-effort/analyse.md"] as const;
/** Les fichiers Markdown générés par un script (absents avant le premier `nub run update`). */
export const FICHIERS_GENERES = ["donnees/sommaire.md"] as const;
export const FICHIERS_MD = [...FICHIERS_REDIGES, ...FICHIERS_GENERES] as const;

/** Ancre GitHub d'un titre: minuscules, accents graves retirés, ponctuation retirée, espaces en tirets. */
export const ancre = (titre: string) => titre.toLowerCase().replace(/`/g, "").replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");

/** Les ancres des titres d'un texte Markdown, hors blocs de code. */
export function ancres(md: string): Set<string> {
  const h = new Set<string>();
  let code = false;
  for (const l of md.split("\n")) {
    if (l.startsWith("```")) code = !code;
    const m = !code && /^#{1,6} (.+)$/.exec(l);
    if (m) h.add(ancre(m[1]!));
  }
  return h;
}

/** Le texte sans ses blocs de code ni ses portions entre accents graves. */
export const sansCode = (md: string) => md.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");

/** Les problèmes de liens d'un fichier: fichier ou ancre introuvable. */
export function problemesLiens(fichier: string, md: string, lire: (f: string) => string | null): string[] {
  const problemes: string[] = [];
  for (const m of sansCode(md).matchAll(/\]\(([^)\s]+)\)/g)) {
    const cible = m[1]!;
    if (/^(https?:|mailto:)/.test(cible)) continue;
    const [chemin, a] = cible.split("#");
    const fichierCible = chemin ? normalize(join(dirname(fichier), chemin)) : fichier;
    const contenu = fichierCible === fichier ? md : lire(fichierCible);
    if (contenu === null) { problemes.push(`fichier introuvable: ${cible}`); continue; }
    if (a !== undefined && !ancres(contenu).has(decodeURIComponent(a))) problemes.push(`ancre introuvable: ${cible}`);
  }
  return problemes;
}

/** Les conventions communes à tous les fichiers Markdown du dépôt (voir implementation.md, section « Documentation »). */
export function problemesConventions(fichier: string, md: string): string[] {
  const problemes: string[] = [];
  if (!/^# .+\n\n\*Documentation : \[README\]\([^)]*README\.md\) · \[Implémentation\]\([^)]*implementation\.md\) · \[Historique\]\([^)]*historique\.md\) · \[Sommaire statistique\]\([^)]*sommaire\.md\)\*\n/.test(md)) {
    problemes.push("titre de niveau 1 ou ligne « Documentation » manquants");
  }
  if (/—/.test(md)) problemes.push("tiret cadratin");
  const balises = sansCode(md).match(/<(?!https?:)[a-zA-Z][^>]*>/g) ?? [];
  const autres = balises.filter((b) => !b.startsWith("<img "));
  if (autres.length) problemes.push(`balises HTML: ${autres.join(" ")}`);
  const images = balises.length - autres.length;
  if (fichier === "README.md" ? images !== 1 : images !== 0) problemes.push(`balise <img>: ${images}`);
  return problemes;
}
