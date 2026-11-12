// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// classify2.ts: même choix des critères que classify.ts, `confiance` recalibrée d'après l'évaluation enrichie.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { CONTROLE, DEPENDANCE, DONNEES, classer, type OutilClasse } from "../classify.ts";
import { classer2, confianceV2 } from "../classify2.ts";
import { lireFichier } from "../fichiers.ts";

const donnees = lireFichier<OutilClasse>("outils.json", "outils").donnees;
const MATOMO = donnees.find((o) => o.nom === "Matomo")!;

test("les critères retenus sont exactement ceux de classify.ts, pour les 60 outils du répertoire", () => {
  assert.equal(donnees.length >= 60, true);
  for (const o of donnees) assert.deepEqual(classer2(o.description, o.score).criteres, classer(o.description, o.score).criteres, o.nom);
});

test("confiance élevée: chaque critère retenu a un indice dans la description, et le choix est net", () => {
  const r = classer2("Outil libre et auto-hébergé", 2);
  assert.deepEqual(r.criteres, [DONNEES, DEPENDANCE]);
  assert.equal(r.confiance, "élevée");
});

test("confiance moyenne: un seul critère retenu sans indice dans la description", () => {
  const r = classer2("Service canadien", 2);
  assert.deepEqual(r.criteres, [DONNEES, CONTROLE]);
  assert.equal(r.confiance, "moyenne");
});

test("confiance moyenne alors que classify.ts disait élevée: Matomo (choix net, mais dépendance sans indice fort)", () => {
  assert.equal(classer(MATOMO.description, MATOMO.score).confiance, "élevée");
  assert.equal(classer2(MATOMO.description, MATOMO.score).confiance, "moyenne");
});

test("confiance faible: deux critères retenus sans indice, ou égalité entre critères", () => {
  assert.equal(classer2("Outil de comptabilité", 2).confiance, "faible");
});

test("trois étoiles: les trois critères sont retenus, mais la confiance dépend des indices (classify.ts disait toujours élevée)", () => {
  const description = "Outil québécois d'aide à la rédaction";
  const r = classer2(description, 3);
  assert.deepEqual(r.criteres, [DONNEES, CONTROLE, DEPENDANCE]);
  assert.equal(classer(description, 3).confiance, "élevée");
  assert.equal(r.confiance, "faible");
});

test("sans score connu: mêmes critères que classify.ts et confiance indéterminée", () => {
  const description = "Outil libre et auto-hébergé";
  assert.deepEqual(classer2(description), classer(description));
  assert.equal(classer2(description).confiance, "indéterminée");
});

test("confianceV2 est le plus bas des deux niveaux: celui de classify.ts (écart) et celui des indices", () => {
  assert.equal(confianceV2("élevée", 0), "élevée");
  assert.equal(confianceV2("élevée", 1), "moyenne");
  assert.equal(confianceV2("élevée", 2), "faible");
  assert.equal(confianceV2("moyenne", 0), "moyenne");
  assert.equal(confianceV2("faible", 0), "faible");
  assert.equal(confianceV2("indéterminée", 2), "indéterminée");
});

/** Probabilité qu'un outil où l'IA est d'accord ait une confiance plus haute qu'un outil où elle ne l'est pas (AUC, égalités à 1/2). */
function auc(outils: OutilClasse[], confiance: (o: OutilClasse) => string): number {
  const rang: Record<string, number> = { faible: 0, moyenne: 1, "élevée": 2 };
  const accord = outils.filter((o) => o.evaluation_enrichie!.score === o.score);
  const desaccord = outils.filter((o) => o.evaluation_enrichie!.score !== o.score);
  let somme = 0;
  for (const a of accord) for (const d of desaccord) {
    const x = rang[confiance(a)]!, y = rang[confiance(d)]!;
    somme += x > y ? 1 : x === y ? 0.5 : 0;
  }
  return somme / (accord.length * desaccord.length);
}

test("évaluation enrichie: la confiance v2 prédit l'accord avec l'IA au moins aussi bien que celle de classify.ts", () => {
  const enrichis = donnees.filter((o) => o.evaluation_enrichie);
  assert.ok(enrichis.length >= 50, `outils enrichis: ${enrichis.length}`);
  const v1 = auc(enrichis, (o) => classer(o.description, o.score).confiance);
  const v2 = auc(enrichis, (o) => classer2(o.description, o.score).confiance);
  assert.ok(v2 >= v1, `AUC v2 ${v2.toFixed(3)} < v1 ${v1.toFixed(3)}`);
});

test("évaluation enrichie: les critères que l'IA retient sont toujours inclus dans ceux de classify2 (aucun faux négatif)", () => {
  for (const o of donnees.filter((o) => o.evaluation_enrichie)) {
    const retenus = classer2(o.description, o.score).criteres;
    for (const c of o.evaluation_enrichie!.criteres) assert.ok(retenus.includes(c), `${o.nom}: ${c}`);
  }
});

const classify2Ts = resolve("classify2.ts");
const copieTemporaire = () => {
  const dossier = mkdtempSync(join(tmpdir(), "classify2-"));
  const f = join(dossier, "outils.json");
  copyFileSync("outils.json", f);
  return { dossier, f };
};

test("CLI: sur une copie, seuls `confiance` et les métadonnées changent; un fichier de sortie laisse la source intacte", () => {
  const { dossier, f } = copieTemporaire();
  const avant = readFileSync(f, "utf8");
  const sortie = join(dossier, "v2.json");
  const r = spawnSync("nub", [classify2Ts, f, sortie], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(f, "utf8"), avant, "la source n'est pas modifiée");
  const v1 = lireFichier<OutilClasse>(f, "outils").donnees;
  const v2 = lireFichier<OutilClasse>(sortie, "outils").donnees;
  assert.equal(v2.length, v1.length);
  v1.forEach((o, i) => assert.deepEqual({ ...v2[i], confiance: o.confiance }, o, o.nom));
});

test("CLI: une option inconnue est refusée", () => {
  const { f } = copieTemporaire();
  const r = spawnSync("nub", [classify2Ts, f, "--bogus"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Option inconnue: --bogus/);
});
