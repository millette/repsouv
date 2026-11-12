// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les spécifications se testent sans vl-convert; un seul test appelle le vrai programme (ignoré s'il n'est pas installé).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  construireGraphiques, convertirAvecVlConvert, ecrireGraphiques, IDS_GRAPHIQUES, verifierVlConvert, type Graphique,
} from "../graphiques.ts";
import { calculerStatistiques } from "../statistiques.ts";
import { entree, outil, OUTILS } from "./donnees-fictives.ts";

const stats = () => calculerStatistiques(entree());
const ids = (gs: Graphique[]) => gs.map((g) => g.id);
const spec = (g: Graphique) => g.spec as unknown as Record<string, any>;
/** Toutes les lignes de données d'une spécification (à plat ou dans un `facet`). */
const valeurs = (g: Graphique): Record<string, unknown>[] => spec(g).data.values;
const champsUtilises = (o: unknown, trouves = new Set<string>()): Set<string> => {
  if (Array.isArray(o)) o.forEach((x) => champsUtilises(x, trouves));
  else if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) {
      if (k === "field" && typeof v === "string") trouves.add(v);
      else champsUtilises(v, trouves);
    }
  }
  return trouves;
};

test("graphiques: les neuf graphiques attendus (celui des jours exige au moins deux jours d'enrichissement, ce qu'ont les données fictives)", () => {
  assert.deepEqual(ids(construireGraphiques(stats())), [
    "statut-code-source", "categories-statut", "criteres-repertoire-enrichie", "criteres-par-statut", "criteres-verdicts", "licences", "forges", "tags", "enrichissement-jours",
  ]);
});
test("critères vérifiés: une ligne par statut, critère et verdict, en pourcentage des outils du statut, sans la ligne Ensemble", () => {
  const g = construireGraphiques(stats()).find((x) => x.id === "criteres-verdicts")!;
  const lignes = valeurs(g);
  assert.deepEqual([...new Set(lignes.map((l) => l.verdict))], ["Confirmé", "Infirmé", "Indéterminé"]);
  assert.ok(!lignes.some((l) => l.statut === "Ensemble"));
  const libreControle = lignes.filter((l) => l.statut === "Libre" && l.critere === "Contrôle");
  assert.deepEqual(libreControle.map((l) => [l.verdict, l.n, l.pct]), [["Confirmé", 0, 0], ["Infirmé", 1, 100], ["Indéterminé", 0, 0]]);
  assert.match(g.description, /confirmé/);
});
test("critères vérifiés: pas de graphique sans criteres_confirmes", () => {
  const sans = calculerStatistiques(entree(OUTILS.map((o) => { const { criteres_confirmes: _c, ...reste } = o; return reste as typeof o; })));
  assert.ok(!ids(construireGraphiques(sans)).includes("criteres-verdicts"));
});
test("graphiques: tous les identifiants produits sont connus (pour nettoyer les fichiers périmés)", () => {
  for (const id of ids(construireGraphiques(stats()))) assert.ok((IDS_GRAPHIQUES as readonly string[]).includes(id), id);
});
test("graphiques: chaque spécification est du Vega-Lite 6 avec ses données incluses, sans URL ni fichier externe", () => {
  for (const g of construireGraphiques(stats())) {
    const s = spec(g);
    assert.equal(s.$schema, "https://vega.github.io/schema/vega-lite/v6.json", g.id);
    assert.ok(Array.isArray(s.data?.values) && s.data.values.length > 0, `${g.id}: données incluses`);
    assert.equal(JSON.stringify(s).includes('"url"'), false, `${g.id}: pas de données par URL`);
    assert.equal(s.background, "white", g.id);
    assert.ok(s.title?.text && s.title?.subtitle, `${g.id}: titre et sous-titre`);
    assert.ok(g.description.length > 30 && g.titre.length > 3, g.id);
  }
});
test("graphiques: les champs encodés existent dans les données", () => {
  for (const g of construireGraphiques(stats())) {
    const connus = new Set(valeurs(g).flatMap((v) => Object.keys(v)));
    const calcules = new Set(["datum"]);
    for (const champ of champsUtilises(spec(g).encoding ?? {}).union(champsUtilises(spec(g).layer ?? [])).union(champsUtilises(spec(g).spec ?? {})).union(champsUtilises(spec(g).facet ?? {}))) {
      assert.ok(connus.has(champ) || calcules.has(champ), `${g.id}: champ « ${champ} » absent des données`);
    }
  }
});
test("statut du code source: un point par statut, avec le nombre et le pourcentage en français", () => {
  const g = construireGraphiques(stats()).find((x) => x.id === "statut-code-source")!;
  const lignes = valeurs(g);
  assert.deepEqual(lignes.map((l) => [l.statut, l.n]), [["Libre", 2], ["Partiellement libre", 1], ["Code source disponible", 1], ["Propriétaire", 1], ["Pas encore enrichi", 1]]);
  assert.equal(lignes[0]!.etiquette, "2 (33,3 %)");
});
test("catégories: une ligne par catégorie et par statut, dans l'ordre des statuts", () => {
  const s = stats();
  const g = construireGraphiques(s).find((x) => x.id === "categories-statut")!;
  assert.equal(valeurs(g).length, s.categoriesSources.length);
  assert.equal(valeurs(g).reduce((n, l) => n + (l.n as number), 0), s.total);
  assert.deepEqual(spec(g).encoding.y.sort, s.categories.map((c) => c.categorie));
  assert.equal(spec(g).encoding.order.field, "ordre");
});
test("critères: répertoire et évaluation enrichie, en pourcentages calculés sur le bon total", () => {
  const g = construireGraphiques(stats()).find((x) => x.id === "criteres-repertoire-enrichie")!;
  const rep = valeurs(g).filter((l) => l.evaluation === "Répertoire (déduit)");
  const enr = valeurs(g).filter((l) => l.evaluation === "Évaluation enrichie");
  assert.equal(rep.length, 3);
  assert.equal(enr.length, 3);
  const donneesRep = rep.find((l) => l.critere === "Données")!;
  assert.equal(donneesRep.pct, 100); // les six outils du répertoire ont « données »
  assert.equal(donneesRep.etiquette, "100,0 % (6)");
  assert.equal(enr.find((l) => l.critere === "Contrôle")!.etiquette, "40,0 % (2)"); // B et C sur les cinq outils enrichis
  assert.equal(enr.find((l) => l.critere === "Données")!.etiquette, "80,0 % (4)");
});
test("critères sans outil enrichi: seul le répertoire est tracé", () => {
  const sansEnrichi = calculerStatistiques(entree([outil("X"), outil("Y")]));
  const g = construireGraphiques(sansEnrichi).find((x) => x.id === "criteres-repertoire-enrichie")!;
  assert.deepEqual([...new Set(valeurs(g).map((l) => l.evaluation))], ["Répertoire (déduit)"]);
});
test("carte de chaleur: lignes pour chaque statut, critère et évaluation, avec « n/total »", () => {
  const g = construireGraphiques(stats()).find((x) => x.id === "criteres-par-statut")!;
  const lignes = valeurs(g);
  assert.deepEqual([...new Set(lignes.map((l) => l.evaluation))], ["Répertoire (déduit)", "Évaluation enrichie"]);
  assert.ok(lignes.every((l) => /^\d+\/\d+$/.test(l.etiquette as string)));
  assert.ok(lignes.every((l) => (l.pct as number) >= 0 && (l.pct as number) <= 100));
  assert.ok(!lignes.some((l) => l.statut === "Ensemble"));
});
test("licences: chaque licence est classée dans sa famille", () => {
  const g = construireGraphiques(stats()).find((x) => x.id === "licences")!;
  const parLicence = Object.fromEntries(valeurs(g).map((l) => [l.licence, l.famille]));
  assert.match(parLicence["AGPL-3.0-only"] as string, /fort/);
  assert.match(parLicence["MIT"] as string, /Permissive/);
});
test("forges et tags: nombres d'outils; les tags sont limités aux 15 plus fréquents", () => {
  const gs = construireGraphiques(stats());
  const forges = valeurs(gs.find((x) => x.id === "forges")!);
  assert.deepEqual(forges.map((l) => [l.forge, l.n]), [["GitHub", 2], ["git.exemple.org", 1], ["GitLab", 1]]);
  const tags = valeurs(gs.find((x) => x.id === "tags")!);
  assert.ok(tags.length <= 15 && tags[0]!.n === 3);
});
test("sans outil enrichi: pas de graphique de licences, de forges ni de tags", () => {
  const gs = construireGraphiques(calculerStatistiques(entree([outil("X"), outil("Y")])));
  assert.deepEqual(ids(gs), ["statut-code-source", "categories-statut", "criteres-repertoire-enrichie", "criteres-par-statut"]);
});
test("sans aucun outil: aucun graphique", () => {
  assert.deepEqual(construireGraphiques(calculerStatistiques(entree([]))), []);
});
test("enrichissement par jour: seulement à partir de deux jours distincts", () => {
  const outils = [outil("A"), outil("B")].map((o, i) => ({ ...o, description_longue: "L", source: "libre" as const, tags: ["chiffrement"], enrichi_le: i ? "2026-11-13T09:00:00-05:00" : "2026-11-12T09:00:00-05:00" }));
  const g = construireGraphiques(calculerStatistiques(entree(outils))).find((x) => x.id === "enrichissement-jours");
  assert.ok(g);
  assert.deepEqual(valeurs(g!).map((l) => l.jour), ["2026-11-12", "2026-11-13"]);
});

// ---------- écriture ----------

const faux = (appels: string[]) => (_spec: unknown, svg: string, png: string) => {
  appels.push(svg, png);
  writeFileSync(svg, "<svg/>");
  writeFileSync(png, "png");
};
test("ecrireGraphiques: un SVG et un PNG par graphique, chemins relatifs au sommaire", () => {
  const dossier = join(mkdtempSync(join(tmpdir(), "graph-")), "graphiques");
  const appels: string[] = [];
  const gs = construireGraphiques(stats());
  const ecrits = ecrireGraphiques(gs, dossier, faux(appels));
  assert.equal(ecrits.length, gs.length);
  assert.equal(ecrits[0]!.png, "graphiques/statut-code-source.png");
  assert.equal(ecrits[0]!.svg, "graphiques/statut-code-source.svg");
  assert.equal(readdirSync(dossier).length, gs.length * 2);
  assert.equal(appels.length, gs.length * 2);
});
test("ecrireGraphiques: les fichiers d'un graphique qui n'est plus produit sont supprimés, les autres fichiers restent", () => {
  const dossier = join(mkdtempSync(join(tmpdir(), "graph-")), "graphiques");
  mkdirSync(dossier);
  writeFileSync(join(dossier, "forges.png"), "vieux");
  writeFileSync(join(dossier, "forges.svg"), "vieux");
  writeFileSync(join(dossier, "mes-notes.png"), "à moi");
  ecrireGraphiques(construireGraphiques(calculerStatistiques(entree([outil("X")]))), dossier, faux([]));
  assert.equal(existsSync(join(dossier, "forges.png")), false);
  assert.equal(existsSync(join(dossier, "forges.svg")), false);
  assert.equal(readFileSync(join(dossier, "mes-notes.png"), "utf8"), "à moi");
});
test("ecrireGraphiques: une erreur du convertisseur remonte", () => {
  const dossier = join(mkdtempSync(join(tmpdir(), "graph-")), "graphiques");
  assert.throws(() => ecrireGraphiques(construireGraphiques(stats()), dossier, () => { throw new Error("boum"); }), /boum/);
});
test("vl-convert absent: message clair avec la façon de l'installer ou de s'en passer", () => {
  assert.throws(() => verifierVlConvert("vl-convert-qui-n-existe-pas"), /introuvable.*cargo install vl-convert.*--sans-graphiques/s);
  assert.throws(() => convertirAvecVlConvert({} as never, "a.svg", "a.png", "vl-convert-qui-n-existe-pas"), /introuvable/);
});

const vlConvertInstalle = spawnSync("vl-convert", ["--version"]).status === 0;
test("vl-convert réel: les graphiques sont convertis en vrais SVG et PNG", { skip: !vlConvertInstalle && "vl-convert n'est pas installé" }, () => {
  const dossier = join(mkdtempSync(join(tmpdir(), "graph-")), "graphiques");
  const [premier] = construireGraphiques(stats());
  const [ecrit] = ecrireGraphiques([premier!], dossier);
  const png = readFileSync(join(dossier, "statut-code-source.png"));
  assert.deepEqual([...png.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]); // signature PNG
  assert.ok(png.length > 5_000);
  const svg = readFileSync(join(dossier, "statut-code-source.svg"), "utf8");
  assert.match(svg, /^<svg /);
  assert.match(svg, /Statut du code source/);
  assert.equal(ecrit!.png, "graphiques/statut-code-source.png");
  assert.match(verifierVlConvert(), /^vl-convert \d/);
});
test("vl-convert réel: une spécification invalide est une erreur avec le message de vl-convert", { skip: !vlConvertInstalle && "vl-convert n'est pas installé" }, () => {
  const dossier = mkdtempSync(join(tmpdir(), "graph-"));
  assert.throws(() => convertirAvecVlConvert({ mark: "inexistant" } as never, join(dossier, "a.svg"), join(dossier, "a.png")), /vl-convert vl2svg/);
});
