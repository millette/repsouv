// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { classer, type OutilClasse } from "../classify.ts";
import { creerCouleurs } from "../couleurs.ts";
import { avertissementSommaireNonMisAJour, ligneJournal, lignesResume, mettreAJour, raisonDeSauterSommaire, sommaireNecessaire } from "../update.ts";

const base = (nom: string, extra: Partial<OutilClasse> = {}): OutilClasse => {
  const o = {
    categorie: "Test", icone: "🧪", nom, score: 2, lien: `https://${nom}.example/`,
    description: "Outil canadien.", derniere_modification: "2026-11-05T09:53", changement: null,
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
    evaluation_enrichie: { score: 2, criteres: ["donnees", "controle"], confiance: "faible" }, page_lue: false, enrichi_le: "2026-11-12T09:00:00-05:00",
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
  assert.equal(outils[0]!.page_lue, false);
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

test("sommaireNecessaire: seulement avec --enrichir, hors simulation, et si quelque chose a changé", () => {
  const base = { enrichir: true, dryRun: false, changements: 0, enrichis: 0 };
  assert.equal(sommaireNecessaire({ ...base, changements: 2 }), true); // outils nouveaux, modifiés ou retirés
  assert.equal(sommaireNecessaire({ ...base, enrichis: 3 }), true); // outils enrichis
  assert.equal(sommaireNecessaire({ ...base, changements: 1, enrichis: 1 }), true);
  assert.equal(sommaireNecessaire(base), false); // rien n'a changé
  assert.equal(sommaireNecessaire({ ...base, changements: 2, enrichis: 3, enrichir: false }), false); // sans --enrichir
  assert.equal(sommaireNecessaire({ ...base, changements: 2, enrichis: 3, dryRun: true }), false); // simulation
  assert.equal(sommaireNecessaire({ ...base, changements: 2, enrichis: 3, sansSommaire: true }), false); // --sans-sommaire
  assert.equal(sommaireNecessaire({ ...base, changements: 2, sansSommaire: false }), true);
});
test("sommaireNecessaire avec --sommaire seul (sans --enrichir): seulement si des changements sont détectés", () => {
  const seul = { enrichir: false, dryRun: false, changements: 0, enrichis: 0, sommaire: true };
  assert.equal(sommaireNecessaire({ ...seul, changements: 1 }), true);
  assert.equal(sommaireNecessaire(seul), false); // rien n'a changé
  assert.equal(sommaireNecessaire({ ...seul, changements: 1, dryRun: true }), false); // simulation
  assert.equal(sommaireNecessaire({ ...seul, changements: 1, sansSommaire: true }), false);
  assert.equal(sommaireNecessaire({ ...seul, changements: 1, sommaire: false }), false); // sans le flag, update seul ne touche pas au sommaire
  assert.equal(sommaireNecessaire({ ...seul, changements: 1, enrichir: true }), true); // --sommaire est redondant avec --enrichir
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

test("avertissement si des changements ont eu lieu et que le sommaire n'est pas mis à jour (update seul)", () => {
  const base = { enrichir: false, dryRun: false, changements: 2, enrichis: 0 };
  const a = avertissementSommaireNonMisAJour(base)!;
  assert.match(a, /Le sommaire n'est plus à jour \(des changements ont été détectés\)/);
  assert.match(a, /nub run sommaire/);
  assert.match(a, /--sommaire/);
});
test("avertissement avec --sans-sommaire, y compris après un enrichissement", () => {
  const a = avertissementSommaireNonMisAJour({ enrichir: true, dryRun: false, changements: 0, enrichis: 3, sansSommaire: true })!;
  assert.match(a, /des outils ont été enrichis, --sans-sommaire/);
  assert.match(a, /nub run sommaire/);
  assert.doesNotMatch(a, /ajouter --sommaire/);
});
test("pas d'avertissement: rien n'a changé, simulation, ou sommaire mis à jour", () => {
  const base = { enrichir: false, dryRun: false, changements: 0, enrichis: 0 };
  assert.equal(avertissementSommaireNonMisAJour(base), null); // aucun changement
  assert.equal(avertissementSommaireNonMisAJour({ ...base, changements: 2, dryRun: true }), null); // simulation: rien d'écrit
  assert.equal(avertissementSommaireNonMisAJour({ ...base, changements: 2, sommaire: true }), null); // --sommaire: il sera mis à jour
  assert.equal(avertissementSommaireNonMisAJour({ ...base, changements: 2, enrichir: true }), null); // --enrichir: idem
  assert.equal(avertissementSommaireNonMisAJour({ ...base, enrichir: true, enrichis: 1 }), null);
});
test("un avertissement et une mise à jour du sommaire s'excluent toujours", () => {
  for (const enrichir of [true, false]) for (const sommaire of [true, false]) for (const sansSommaire of [true, false]) for (const dryRun of [true, false]) for (const [changements, enrichis] of [[0, 0], [1, 0], [0, 1], [2, 2]]) {
    const o = { enrichir, sommaire, sansSommaire, dryRun, changements: changements!, enrichis: enrichis! };
    assert.equal(avertissementSommaireNonMisAJour(o) !== null && sommaireNecessaire(o), false, JSON.stringify(o));
  }
});
