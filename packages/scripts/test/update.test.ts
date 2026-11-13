// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { classer, type OutilClasse } from "../classify.ts";
import { creerCouleurs } from "../couleurs.ts";
import { interpreterChoix, ligneJournal, lignesEstimation, lignesResume, mettreAJour, raisonDeSauterSommaire, sommaireNecessaire, texteConfirmation } from "../update.ts";

const base = (nom: string, extra: Partial<OutilClasse> = {}): OutilClasse => {
  const o = {
    categorie: "test", nom, score: 2, lien: `https://${nom}.example/`,
    description: "Outil canadien.", derniere_modification: "2026-11-05T09:53", changement: null, source_repertoire_id: "praxis",
    ...extra,
  };
  return { ...o, ...classer(o.description, o.score) };
};
const ANCIENNE = "2026-11-05T09:53";
const NOUVELLE = "2026-12-01T08:00";

test("outil identique: date et changement conservés", () => {
  const a = base("a");
  const { outils, resume } = mettreAJour([a], [a], NOUVELLE);
  assert.deepEqual(outils, [a]);
  assert.deepEqual(resume, { nouveau: [], modification: [], retrait: [], comeback: [] });
});
test("nouvel outil: date de la page et changement « nouveau »", () => {
  const { outils } = mettreAJour([], [base("b")], NOUVELLE);
  assert.equal(outils[0]!.changement, "nouveau");
  assert.equal(outils[0]!.derniere_modification, NOUVELLE);
});
test("description modifiée: seul cet outil change de date, et il est reclassé", () => {
  const a = base("a"), c = base("c");
  const modifie = { ...a, description: "Outil non canadien, auto-hébergeable.", changement: null };
  const { outils } = mettreAJour([a, c], [modifie, c], NOUVELLE);
  assert.equal(outils[0]!.changement, "modification");
  assert.equal(outils[0]!.derniere_modification, NOUVELLE);
  assert.notDeepEqual(outils[0]!.criteres, a.criteres);
  assert.equal(outils[1]!.derniere_modification, ANCIENNE);
});
test("outil disparu: conservé avec changement « retrait », une seule fois", () => {
  const a = base("a");
  const premier = mettreAJour([a], [], NOUVELLE);
  assert.equal(premier.outils[0]!.changement, "retrait");
  assert.equal(premier.outils[0]!.removed, true);
  assert.equal(premier.outils[0]!.derniere_modification, NOUVELLE);
  const second = mettreAJour(premier.outils, [], "2027-01-01T00:00");
  assert.equal(second.outils[0]!.derniere_modification, NOUVELLE);
  assert.deepEqual(second.resume.retrait, []);
});
test("outil retiré qui revient: « comeback » et le champ removed disparaît", () => {
  const retire: OutilClasse = { ...base("a"), changement: "retrait", removed: true };
  const { outils, resume } = mettreAJour([retire], [base("a")], NOUVELLE);
  assert.equal(outils.length, 1);
  assert.equal(outils[0]!.changement, "comeback");
  assert.equal(outils[0]!.derniere_modification, NOUVELLE);
  assert.equal("removed" in outils[0]!, false);
  assert.deepEqual(resume.comeback, ["a"]);
});
test("removed n'apparaît que sur les outils retirés", () => {
  const { outils } = mettreAJour([base("a"), base("b")], [base("a")], NOUVELLE);
  assert.equal("removed" in outils[0]!, false);
  assert.equal(outils[1]!.removed, true);
});
test("modification: les champs d'enrichissement sont conservés", () => {
  const enrichi: OutilClasse = {
    ...base("a"), description_longue: "Longue.", tags: ["gratuit"], source: "libre", licence: null, custom_license: "Licence maison", custom_license_url: "https://example.org/l", repo: "https://github.com/x/y",
    evaluation_enrichie: { score: 2, criteres: ["donnees", "controle"], confiance: "faible" }, enrichi_le: "2026-11-12T09:00:00-05:00",
  };
  const page = { ...base("a"), description: "Nouvelle description." };
  const { outils } = mettreAJour([enrichi], [page], NOUVELLE);
  assert.equal(outils[0]!.changement, "modification");
  assert.equal(outils[0]!.description, "Nouvelle description.");
  assert.equal(outils[0]!.description_longue, "Longue.");
  assert.deepEqual(outils[0]!.tags, ["gratuit"]);
  assert.equal(outils[0]!.repo, "https://github.com/x/y");
  assert.equal(outils[0]!.evaluation_enrichie?.confiance, "faible");
  assert.equal(outils[0]!.custom_license, "Licence maison");
  assert.equal(outils[0]!.enrichi_le, "2026-11-12T09:00:00-05:00");
  assert.equal(outils[0]!.custom_license_url, "https://example.org/l");
});
test("comeback: les champs d'enrichissement sont conservés", () => {
  const retire: OutilClasse = { ...base("a"), description_longue: "Longue.", removed: true, changement: "retrait" };
  const { outils } = mettreAJour([retire], [base("a")], NOUVELLE);
  assert.equal(outils[0]!.changement, "comeback");
  assert.equal(outils[0]!.description_longue, "Longue.");
});

// ---------- présentation ----------

const SANS = creerCouleurs(false);
const AVEC = creerCouleurs(true);
const sansCodes = (s: string) => s.replace(/\x1b\[\d+m/g, "");
const RESUME = { nouveau: ["A", "B"], modification: ["C"], retrait: [], comeback: ["D"] };

test("lignesResume sans couleurs: le texte d'origine", () => {
  assert.deepEqual(lignesResume(RESUME, "2026-11-05T09:53:00-05:00", SANS), [
    "Page modifiée le 2026-11-05T09:53:00-05:00: 4 changement(s)",
    "  nouveau: A, B",
    "  modification: C",
    "  comeback: D",
  ]);
});
test("lignesResume sans changement: une seule ligne", () => {
  assert.deepEqual(lignesResume({ nouveau: [], modification: [], retrait: [], comeback: [] }, "d", SANS), ["Page modifiée le d: 0 changement(s)"]);
});
test("lignesResume avec couleurs: même texte une fois les codes retirés, et chaque type a sa couleur", () => {
  const lignes = lignesResume({ ...RESUME, retrait: ["E"] }, "2026-11-05T09:53:00-05:00", AVEC);
  assert.deepEqual(lignes.map(sansCodes), lignesResume({ ...RESUME, retrait: ["E"] }, "2026-11-05T09:53:00-05:00", SANS));
  assert.match(lignes[0]!, /\x1b\[36m2026-11-05T09:53:00-05:00\x1b\[39m/); // date en cyan
  assert.match(lignes[0]!, /\x1b\[33m.*5 changement\(s\)/); // total en jaune (gras)
  assert.match(lignes.find((l) => l.includes("nouveau"))!, /\x1b\[32mnouveau/); // vert
  assert.match(lignes.find((l) => l.includes("modification"))!, /\x1b\[33mmodification/); // jaune
  assert.match(lignes.find((l) => l.includes("retrait"))!, /\x1b\[31mretrait/); // rouge
  assert.match(lignes.find((l) => l.includes("comeback"))!, /\x1b\[35mcomeback/); // magenta
});
test("lignesResume avec couleurs: zéro changement en vert", () => {
  assert.match(lignesResume({ nouveau: [], modification: [], retrait: [], comeback: [] }, "d", AVEC)[0]!, /\x1b\[32m0 changement\(s\)/);
});

const NIVEAUX = ["info", "succes", "avertissement", "erreur"] as const;
const MESSAGES = ["  Matomo: rapports-analytique, auto-hebergeable (partiel)", "    évaluation différente du répertoire: 1/3 [controle] contre 2/3", "  Zeffy: ÉCHEC: page inaccessible (HTTP 403); outil non enrichi", "Sans deux-points ici"];
test("ligneJournal sans couleurs: le message d'origine, quel que soit le niveau", () => {
  for (const m of MESSAGES) for (const n of NIVEAUX) assert.equal(ligneJournal(m, n, SANS), m, `${n}: ${m}`);
});
test("ligneJournal avec couleurs: même texte une fois les codes retirés", () => {
  for (const m of MESSAGES) for (const n of NIVEAUX) assert.equal(sansCodes(ligneJournal(m, n, AVEC)), m, `${n}: ${m}`);
});
test("ligneJournal: succès en vert (nom en gras), avertissement en jaune, erreur en rouge, info atténuée", () => {
  assert.match(ligneJournal("  Matomo: tags", "succes", AVEC), /^  \x1b\[1m\x1b\[32mMatomo\x1b\[39m\x1b\[22m: tags$/);
  assert.match(ligneJournal("  Matomo: page vide", "avertissement", AVEC), /^  \x1b\[33mMatomo: page vide\x1b\[39m$/);
  assert.match(ligneJournal("  Matomo: ÉCHEC", "erreur", AVEC), /^  \x1b\[1m\x1b\[31mMatomo\x1b\[39m\x1b\[22m: \x1b\[31mÉCHEC\x1b\[39m$/);
  assert.equal(ligneJournal("Fin", "info", AVEC), "\x1b[2mFin\x1b[22m");
  assert.equal(ligneJournal("Pas de nom", "erreur", AVEC), "\x1b[31mPas de nom\x1b[39m");
});

// ---------- sommaire automatique ----------

test("sommaireNecessaire: hors simulation, dès que quelque chose a changé ou a été enrichi", () => {
  assert.equal(sommaireNecessaire({ dryRun: false, changements: 2, enrichis: 0 }), true);
  assert.equal(sommaireNecessaire({ dryRun: false, changements: 0, enrichis: 3 }), true);
  assert.equal(sommaireNecessaire({ dryRun: false, changements: 1, enrichis: 1 }), true);
  assert.equal(sommaireNecessaire({ dryRun: false, changements: 0, enrichis: 0 }), false);
  assert.equal(sommaireNecessaire({ dryRun: true, changements: 2, enrichis: 3 }), false);
});
test("interpreterChoix: 1 ou oui accepte les coûts; 2, vide ou autre chose arrête (l'estimation est déjà affichée)", () => {
  assert.equal(interpreterChoix("1"), "accepter");
  assert.equal(interpreterChoix(" Oui "), "accepter");
  assert.equal(interpreterChoix("2"), "arreter");
  assert.equal(interpreterChoix("3"), "arreter");
  assert.equal(interpreterChoix(""), "arreter");
  assert.equal(interpreterChoix("peut-être"), "arreter");
});
test("texteConfirmation: le premier import annonce le nombre d'outils, le coût estimé et les deux choix", () => {
  const texte = texteConfirmation(60, "≈ 12,34 $");
  assert.match(texte, /Premier import/);
  assert.match(texte, /60 outil\(s\)/);
  assert.match(texte, /≈ 12,34 \$/);
  assert.match(texte, /1\. [^\n]*coûts/i);
  assert.match(texte, /2\. [^\n]*arrêter/i);
  assert.doesNotMatch(texte, /simulation|3\./);
  assert.match(texte, /\[1\/2\]/);
});
test("raisonDeSauterSommaire: clé API absente, vl-convert introuvable, ou rien à signaler", () => {
  const present = () => "vl-convert 1.9.0";
  const absent = () => {
    throw new Error("vl-convert est introuvable");
  };
  assert.equal(raisonDeSauterSommaire("sk-test", present), null);
  assert.match(raisonDeSauterSommaire(undefined, present)!, /OPENAI_API_KEY absente/);
  assert.match(raisonDeSauterSommaire("", present)!, /OPENAI_API_KEY absente/);
  assert.match(raisonDeSauterSommaire("sk-test", absent)!, /vl-convert est introuvable/);
});

// ---------- synchroniser: import initial, écriture de outils.json et de criteres.json ----------

import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { synchroniser } from "../update.ts";
import type { Critere, Outil } from "../extract.ts";
import { ecrireFichier, lireFichier } from "../fichiers.ts";
import type { Source } from "../sources.ts";

const CRITERES: Critere[] = [
  { id: "donnees", icon: "📍", titre: "Où peuvent rester les données ?", description: "Au Canada ?" },
  { id: "controle", icon: "🏢", titre: "Qui contrôle l'outil ?", description: "Canadien ?" },
  { id: "dependance", icon: "🔗", titre: "De qui dépend-il ?", description: "Étranger ?" },
];
const brut = (nom: string): Outil => ({ categorie: "c", nom, score: 2, lien: `https://${nom}`, description: "Outil libre et auto-hébergé", derniere_modification: "", changement: null, source_repertoire_id: "praxis" });
const dossier = () => mkdtempSync(join(tmpdir(), "sync-"));

test("synchroniser: sans outils.json, import initial: tous les outils sont « nouveau », classés, et criteres.json est créé", () => {
  const d = dossier();
  const f = join(d, "outils.json");
  const s = synchroniser(f, [brut("a"), brut("b")], CRITERES, NOUVELLE, false);
  assert.equal(s.importInitial, true);
  assert.deepEqual(s.resume.nouveau, ["a", "b"]);
  assert.equal(s.ecrit, true);
  assert.equal(s.criteresEcrits, true);
  const lu = lireFichier<OutilClasse>(f, "outils");
  assert.deepEqual(lu.donnees.map((o) => [o.nom, o.changement, o.derniere_modification, o.criteres]), [["a", "nouveau", NOUVELLE, ["donnees", "dependance"]], ["b", "nouveau", NOUVELLE, ["donnees", "dependance"]]]);
  assert.equal(lu.meta.data_license, "CC-BY-SA-4.0");
  assert.deepEqual(lireFichier<Critere>(join(d, "criteres.json"), "criteres").donnees, CRITERES);
});

test("synchroniser: import initial en simulation: rien n'est écrit", () => {
  const d = dossier();
  const s = synchroniser(join(d, "outils.json"), [brut("a")], CRITERES, NOUVELLE, true);
  assert.equal(s.importInitial, true);
  assert.deepEqual([s.ecrit, s.criteresEcrits], [false, false]);
  assert.deepEqual([existsSync(join(d, "outils.json")), existsSync(join(d, "criteres.json"))], [false, false]);
});

test("synchroniser: fichier existant et page inchangée: outils.json n'est pas réécrit; criteres.json seulement si les critères changent", () => {
  const d = dossier();
  const f = join(d, "outils.json");
  synchroniser(f, [brut("a")], CRITERES, NOUVELLE, false);
  const avant = readFileSync(f, "utf8");
  const s = synchroniser(f, [brut("a")], CRITERES, "2027-01-01T00:00:00-05:00", false);
  assert.deepEqual([s.importInitial, s.ecrit, s.criteresEcrits], [false, false, false]);
  assert.equal(readFileSync(f, "utf8"), avant);
  const autres = CRITERES.map((c) => ({ ...c, description: `${c.description} (revu)` }));
  const t = synchroniser(f, [brut("a")], autres, "2027-01-01T00:00:00-05:00", false);
  assert.deepEqual([t.ecrit, t.criteresEcrits], [false, true]);
  assert.equal(lireFichier<Critere>(join(d, "criteres.json"), "criteres").donnees[0]!.description, "Au Canada ? (revu)");
});

test("synchroniser: fichier existant au mauvais format: refusé avec un message clair, sans import initial", () => {
  const d = dossier();
  const f = join(d, "outils.json");
  writeFileSync(f, "[]");
  assert.throws(() => synchroniser(f, [brut("a")], CRITERES, NOUVELLE, false), /format invalide/);
  assert.equal(statSync(f).size, 2);
});


test("synchroniser: categories.json est écrit à côté de outils.json à partir des catégories de la page, et les descriptions déjà connues sont conservées", () => {
  const d = dossier();
  const f = join(d, "outils.json");
  const page = [{ ...brut("a"), categorie: "cat-a" }];
  const categories = [{ id: "cat-a", nom: "Cat A", icone: "🧪" }];
  const s = synchroniser(f, page, CRITERES, NOUVELLE, false, categories);
  assert.deepEqual([s.categoriesEcrites, s.categories], [true, categories]);
  const lu = lireFichier<{ id: string; description?: string }>(join(d, "categories.json"), "categories");
  assert.deepEqual(lu.donnees, categories);
  writeFileSync(join(d, "categories.json"), JSON.stringify({ meta: lu.meta, categories: [{ ...categories[0], description: "Décrite." }] }));
  const t = synchroniser(f, page, CRITERES, NOUVELLE, false, [{ id: "cat-a", nom: "Cat A", icone: "🔬" }]);
  assert.deepEqual(t.categories, [{ id: "cat-a", nom: "Cat A", icone: "🔬", description: "Décrite." }]);
  assert.equal(t.categoriesEcrites, true, "l'icône a changé");
  const u = synchroniser(f, page, CRITERES, NOUVELLE, true, categories);
  assert.equal(u.categoriesEcrites, false, "simulation: rien n'est écrit");
});

test("lignesEstimation: une ligne par poste au prix du modèle, le total, et le scénario où le repli reprend chaque appel", () => {
  const usage = { entree: 1000, sortie: 100, cache_lecture: 0, cache_ecriture: 0, raisonnement: 0 };
  const estimation = { outils: 2, usage, cout: 0.0015, hypotheses: "hypothèses" };
  const lignes = lignesEstimation(estimation, { outils: 1, usage }, { categories: 1, usage }, "gpt-6.1-terra", 10, creerCouleurs(false), "gpt-6.1-sol");
  assert.match(lignes[0]!, /^Coût estimé \(hypothèses\):/);
  assert.match(lignes[1]!, /enrichissement de 2 outil\(s\): .*\(gpt-6.1-terra\)/);
  assert.match(lignes[4]!, /sommaire \(un appel pour le résumé\)/);
  assert.match(lignes[5]!, /^  total: .*≈ \d+,\d\d \$ \(gpt-6.1-terra\)$/);
  assert.match(lignes[6]!, /^  si chaque appel devait être repris par gpt-6.1-sol: jusqu'à ≈ \d+,\d\d \$ de plus$/);
  assert.equal(lignesEstimation(estimation, { outils: 1, usage }, { categories: 1, usage }, "gpt-6.1-terra", 10, creerCouleurs(false), null).length, 6);
});

test("mettreAJour: les outils d'une autre source sont conservés tels quels (jamais « retrait »), et un outil sans source est rattaché à Praxis", () => {
  const facil = base("Planète", { source_repertoire_id: "facil", alternative_a: ["https://feedly.example/"], score_estime: true });
  const ancien = base("A");
  const sansSource = { ...base("B") } as Partial<OutilClasse> as OutilClasse;
  delete (sansSource as Partial<OutilClasse>).source_repertoire_id;
  const page = (o: OutilClasse): Outil => ({ categorie: o.categorie, nom: o.nom, score: o.score, lien: o.lien, description: o.description, derniere_modification: "", changement: null, source_repertoire_id: "praxis" });
  const { outils, resume, migres } = mettreAJour([facil, ancien, sansSource], [page(ancien), page(sansSource)], NOUVELLE);
  assert.deepEqual(resume, { nouveau: [], modification: [], retrait: [], comeback: [] });
  assert.equal(migres, 1);
  assert.deepEqual(outils.map((o) => [o.nom, o.source_repertoire_id]), [["Planète", "facil"], ["A", "praxis"], ["B", "praxis"]], "les outils existants gardent leur place");
  assert.deepEqual(outils[0], facil);
  const retrait = mettreAJour([facil, ancien], [], NOUVELLE);
  assert.deepEqual(retrait.resume.retrait, ["A"]);
  assert.equal(retrait.outils.find((o) => o.nom === "Planète")!.removed, undefined);
});
test("mettreAJour: un outil au score estimé garde la classification de sa page, puis celle de son évaluation enrichie une fois enrichi; son score ne compte pas comme modification", () => {
  const page = { ...brut("P"), source_repertoire_id: "facil", score: 1, score_estime: true as const, criteres: ["donnees"] as OutilClasse["criteres"], confiance: "indéterminée" as const };
  const premier = mettreAJour([], [page], NOUVELLE, "facil");
  assert.deepEqual(premier.resume.nouveau, ["P"]);
  assert.equal(premier.outils[0]!.confiance, "indéterminée");
  const enrichi = { ...premier.outils[0]!, score: 3, criteres: ["donnees", "controle", "dependance"] as OutilClasse["criteres"], confiance: "élevée" as const, description_longue: "Longue.", evaluation_enrichie: { score: 3, criteres: ["donnees", "controle", "dependance"] as OutilClasse["criteres"], confiance: "élevée" as const } };
  const second = mettreAJour([enrichi], [page], NOUVELLE, "facil");
  assert.deepEqual(second.resume.modification, []);
  const modifie = mettreAJour([enrichi], [{ ...page, description: "Autre description." }], NOUVELLE, "facil");
  assert.deepEqual(modifie.resume.modification, ["P"]);
  assert.equal(modifie.outils[0]!.score, 3);
  assert.equal(modifie.outils[0]!.description_longue, "Longue.");
});
test("mettreAJour: voir_aussi relie les outils d'un même logiciel (nom ou instance_de.nom), toutes sources confondues, et le nombre de renvois changés est retourné", () => {
  const jasette = base("Jasette FACiLe", { source_repertoire_id: "facil", score_estime: true, instance_de: { nom: "Mastodon", url: "https://github.com/mastodon/mastodon" } });
  const page = [brut("Mastodon"), brut("Autre")];
  const r = mettreAJour([jasette], page, NOUVELLE);
  assert.equal(r.relies, 2);
  assert.deepEqual(r.outils.map((o) => [o.nom, o.voir_aussi]), [["Jasette FACiLe", ["Mastodon"]], ["Mastodon", ["Jasette FACiLe"]], ["Autre", undefined]]);
  const encore = mettreAJour(r.outils, page, NOUVELLE);
  assert.equal(encore.relies, 0);
  const retrait = mettreAJour(r.outils, [brut("Autre")], NOUVELLE);
  assert.deepEqual(retrait.resume.retrait, ["Mastodon"]);
  assert.equal(retrait.relies, 2, "un outil retiré ne renvoie plus et n'est plus cité");
  assert.deepEqual(retrait.outils.map((o) => o.voir_aussi), [undefined, undefined, undefined]);
});
test("synchroniser: des renvois voir_aussi à mettre à jour suffisent à réécrire outils.json", () => {
  const d = mkdtempSync(join(tmpdir(), "sync-"));
  const f = join(d, "outils.json");
  synchroniser(f, [brut("Mastodon")], CRITERES, NOUVELLE, false);
  const lu = lireFichier<OutilClasse>(f, "outils");
  ecrireFichier(f, "outils", [...lu.donnees, { ...lu.donnees[0]!, nom: "Jasette FACiLe", lien: "https://jasette", source_repertoire_id: "facil", instance_de: { nom: "Mastodon", url: "https://github.com/mastodon/mastodon" } }], lu, "2026-12-01T08:00:00-05:00");
  const r = synchroniser(f, [brut("Mastodon")], CRITERES, NOUVELLE, false);
  assert.equal(r.ecrit, true);
  assert.deepEqual(lireFichier<OutilClasse>(f, "outils").donnees.map((o) => o.voir_aussi), [["Jasette FACiLe"], ["Mastodon"]]);
  assert.equal(synchroniser(f, [brut("Mastodon")], CRITERES, NOUVELLE, false).ecrit, false);
});
test("synchroniser: sources.json est créé à côté de outils.json avec la source Praxis, puis conservé tel quel", () => {
  const d = mkdtempSync(join(tmpdir(), "sync-"));
  const f = join(d, "outils.json");
  const r = synchroniser(f, [brut("A")], CRITERES, NOUVELLE, false);
  assert.equal(r.sourcesEcrites, true);
  assert.deepEqual(r.sources.map((s) => s.id), ["praxis"]);
  assert.deepEqual(lireFichier<Source>(join(d, "sources.json"), "sources").donnees[0]!.extracteur, "praxis");
  const s = synchroniser(f, [brut("A")], CRITERES, NOUVELLE, false);
  assert.equal(s.sourcesEcrites, false);
  const sim = synchroniser(join(d, "ailleurs", "outils.json"), [brut("A")], CRITERES, NOUVELLE, true);
  assert.equal(sim.sourcesEcrites, false);
  assert.equal(existsSync(join(d, "ailleurs", "sources.json")), false);
});

test("mettreAJour: un changement de pays est une modification, et le pays d'une source sans ce champ reste absent", () => {
  const base: OutilClasse = { categorie: "c", nom: "P", score: 1, score_estime: true, lien: "https://p.example/", description: "Desc.", derniere_modification: "2026-01-01T00:00:00-05:00", changement: null, source_repertoire_id: "charles", pays: "FR", ...classer("Desc.") };
  const r = mettreAJour([base], [{ ...base, pays: "DE" }], "2026-02-01T00:00:00-05:00", "charles");
  assert.deepEqual(r.resume.modification, ["P"]);
  assert.equal(r.outils[0]!.pays, "DE");
  const meme = mettreAJour([base], [{ ...base }], "2026-02-01T00:00:00-05:00", "charles");
  assert.deepEqual(meme.resume.modification, []);
  const { pays: _p, ...sansPays } = base;
  assert.equal(mettreAJour([sansPays], [{ ...sansPays }], "2026-02-01T00:00:00-05:00", "charles").outils[0]!.pays, undefined);
});
