import assert from "node:assert/strict";
import { test } from "node:test";
import { classer, type OutilClasse } from "../classify.ts";
import { mettreAJour } from "../update.ts";

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
    ...base("a"), description_longue: "Longue.", tags: ["gratuit"], source: "libre", licence: "MIT", repo: "https://github.com/x/y",
  };
  const page = { ...base("a"), description: "Nouvelle description." };
  const { outils } = mettreAJour([enrichi], [page], NOUVELLE);
  assert.equal(outils[0]!.changement, "modification");
  assert.equal(outils[0]!.description, "Nouvelle description.");
  assert.equal(outils[0]!.description_longue, "Longue.");
  assert.deepEqual(outils[0]!.tags, ["gratuit"]);
  assert.equal(outils[0]!.repo, "https://github.com/x/y");
});
test("comeback: les champs d'enrichissement sont conservés", () => {
  const retire: OutilClasse = { ...base("a"), description_longue: "Longue.", removed: true, changement: "retrait" };
  const { outils } = mettreAJour([retire], [base("a")], NOUVELLE);
  assert.equal(outils[0]!.changement, "comeback");
  assert.equal(outils[0]!.description_longue, "Longue.");
});
