// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les fichiers Markdown du dépôt suivent les conventions de implementation.md (section « Documentation ») :
// liens et ancres qui existent, ligne « Documentation », pas de tiret cadratin, aucune balise HTML sauf l'image du README.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { test } from "node:test";

export const FICHIERS_MD = [
  "README.md", "implementation.md", "historique.md", "sommaire.md",
  "analyses/classification/README.md", "analyses/classification/resultats-confirmations.md", "analyses/classification/resultats-regle-a.md",
  "spike-mion/RESULTATS.md",
] as const;

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

test("ancre: casse, accents, accents graves et ponctuation, comme GitHub", () => {
  assert.equal(ancre("Scripts npm (`package.json`)"), "scripts-npm-packagejson");
  assert.equal(ancre("D'où viennent les champs"), "doù-viennent-les-champs");
  assert.equal(ancre("`outils.json`"), "outilsjson");
});

test("problemesLiens: ancre du même fichier, ancre d'un autre fichier, fichier et ancre introuvables; les liens dans le code sont ignorés", () => {
  const autres: Record<string, string> = { "b.md": "# B\n\n## Section b\n" };
  const lire = (f: string) => autres[f] ?? null;
  const md = "# A\n\n## Ici\n\n[x](#ici) [y](b.md#section-b) [z](b.md) [w](https://exemple.org/#rien) `[q](#absent)`\n";
  assert.deepEqual(problemesLiens("a.md", md, lire), []);
  assert.deepEqual(problemesLiens("a.md", "[p](#absent) [r](c.md) [s](b.md#rien)", lire), ["ancre introuvable: #absent", "fichier introuvable: c.md", "ancre introuvable: b.md#rien"]);
});

const lire = (f: string) => (existsSync(f) ? readFileSync(f, "utf8") : null);

test("tous les fichiers Markdown existent et leurs liens relatifs et ancres sont valides", () => {
  for (const f of FICHIERS_MD) {
    const md = lire(f);
    assert.ok(md !== null, f);
    assert.deepEqual(problemesLiens(f, md!, lire), [], f);
  }
});

test("chaque fichier Markdown commence par un titre de niveau 1 suivi de la ligne « Documentation », qui relie les cinq fichiers principaux", () => {
  for (const f of FICHIERS_MD) {
    const md = lire(f)!;
    assert.match(md, /^# .+\n\n\*Documentation : \[README\]\([^)]*README\.md\) · \[Implémentation\]\([^)]*implementation\.md\) · \[Historique\]\([^)]*historique\.md\) · \[Sommaire statistique\]\([^)]*sommaire\.md\) · \[Analyse de la classification\]\([^)]*analyses\/classification\/README\.md\)\*\n/, f);
  }
});

test("aucun tiret cadratin, et aucune balise HTML sauf l'image en tête du README", () => {
  for (const f of FICHIERS_MD) {
    const md = lire(f)!;
    assert.doesNotMatch(md, /—/, `${f}: tiret cadratin`);
    const balises = sansCode(md).match(/<(?!https?:)[a-zA-Z][^>]*>/g) ?? [];
    assert.deepEqual(balises.filter((b) => !b.startsWith("<img ")), [], f);
    if (f !== "README.md") assert.equal(balises.length, 0, `${f}: balise <img>`);
  }
  assert.equal((sansCode(lire("README.md")!).match(/<img /g) ?? []).length, 1);
});

test("les fichiers générés disent par quel script et ne doivent pas être modifiés à la main", () => {
  for (const f of ["sommaire.md", "analyses/classification/resultats-confirmations.md", "analyses/classification/resultats-regle-a.md"]) {
    assert.match(lire(f)!, /Généré le .+ par .+\. Ne pas modifier/, f);
  }
});
