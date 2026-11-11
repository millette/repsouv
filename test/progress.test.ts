// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { createProgress } from "../progress.ts";

const faux = (tty: boolean, columns = 40) => {
  const sortie: string[] = [];
  const stream = { isTTY: tty, columns, write: (s: string) => (sortie.push(s), true) } as unknown as NodeJS.WriteStream;
  return { stream, sortie };
};

test("total non positif: erreur", () => {
  assert.throws(() => createProgress(0), RangeError);
  assert.throws(() => createProgress(Number.NaN), RangeError);
});
test("TTY: dessine une barre avec le pourcentage sur une seule ligne", () => {
  const { stream, sortie } = faux(true);
  const p = createProgress(4, { stream, intervalMs: 0 });
  p.update(1);
  assert.match(sortie.at(-1)!, /^\r\[#+-+\] 25%\x1b\[K$/);
  p.update(4);
  assert.match(sortie.at(-1)!, /100%/);
  p.end();
  assert.equal(sortie.at(-1), "\n");
});
test("la valeur est bornée entre 0 et le total", () => {
  const { stream, sortie } = faux(true);
  const p = createProgress(10, { stream, intervalMs: 0 });
  p.update(99);
  assert.match(sortie.at(-1)!, /100%/);
  p.update(-5);
  assert.match(sortie.at(-1)!, /0%/);
});
test("hors TTY: silencieux par défaut, une ligne par tranche de 10 % avec logWhenNotTTY", () => {
  const muet = faux(false);
  createProgress(10, { stream: muet.stream }).update(5);
  assert.deepEqual(muet.sortie, []);

  const { stream, sortie } = faux(false);
  const p = createProgress(10, { stream, logWhenNotTTY: true });
  for (let i = 1; i <= 10; i++) p.update(i);
  assert.equal(sortie.length, 10);
  assert.equal(sortie.at(-1), "100%\n");
});
test("end() est idempotent et update() est ignoré après", () => {
  const { stream, sortie } = faux(true);
  const p = createProgress(2, { stream, intervalMs: 0 });
  p.update(1);
  p.end();
  const n = sortie.length;
  p.end();
  p.update(2);
  assert.equal(sortie.length, n);
});
test("message(): efface la ligne, écrit le texte puis redessine la barre (TTY)", () => {
  const { stream, sortie } = faux(true);
  const p = createProgress(2, { stream, intervalMs: 0 });
  p.update(1);
  sortie.length = 0;
  p.message("Matomo: ok");
  assert.equal(sortie[0], "\r\x1b[K");
  assert.equal(sortie[1], "Matomo: ok\n");
  assert.match(sortie[2]!, /50%/);
});
test("message(): hors TTY, simple ligne de texte", () => {
  const { stream, sortie } = faux(false);
  createProgress(2, { stream }).message("bonjour");
  assert.deepEqual(sortie, ["bonjour\n"]);
});
test("étiquette: affichée après le pourcentage, redessinée tout de suite, tronquée si l'écran est étroit", () => {
  const { stream, sortie } = faux(true, 50);
  const p = createProgress(4, { stream, intervalMs: 10_000 });
  p.update(0, "Matomo");
  assert.match(sortie.at(-1)!, /0% Matomo\x1b\[K$/);
  p.update(0, "Klipfolio");
  assert.match(sortie.at(-1)!, /0% Klipfolio/);
  p.update(1, "Un nom d'outil vraiment beaucoup trop long pour l'écran");
  const ligne = sortie.at(-1)!.replace(/^\r|\x1b\[K$/g, "");
  assert.ok(ligne.length <= 49, ligne);
  assert.match(ligne, /…$/);
});
test("étiquette: absente hors TTY (lignes de pourcentage seulement)", () => {
  const { stream, sortie } = faux(false);
  createProgress(2, { stream, logWhenNotTTY: true }).update(1, "Matomo");
  assert.deepEqual(sortie, ["50%\n"]);
});
test("couleurs: la barre peut être peinte sans changer sa largeur visible ni le texte", () => {
  const sans = faux(true, 50);
  const avec = faux(true, 50);
  const peint = {
    filled: (t: string) => `\x1b[32m${t}\x1b[39m`,
    empty: (t: string) => `\x1b[2m${t}\x1b[22m`,
    label: (t: string) => `\x1b[36m${t}\x1b[39m`,
  };
  const a = createProgress(4, { stream: sans.stream, intervalMs: 0 });
  const b = createProgress(4, { stream: avec.stream, intervalMs: 0, paint: peint });
  a.update(1, "Matomo");
  b.update(1, "Matomo");
  const visible = (s: string) => s.replace(/\x1b\[\d+m/g, "");
  assert.equal(visible(avec.sortie.at(-1)!), sans.sortie.at(-1));
  assert.match(avec.sortie.at(-1)!, /\x1b\[32m#+\x1b\[39m\x1b\[2m-+\x1b\[22m\] 25% \x1b\[36mMatomo\x1b\[39m/);
  assert.equal(sans.sortie.at(-1)!.includes("\x1b[3"), false);
});
test("couleurs: une étiquette trop longue est tronquée sur sa largeur visible, pas avec les codes", () => {
  const { stream, sortie } = faux(true, 50);
  const p = createProgress(4, { stream, intervalMs: 0, paint: { label: (t) => `\x1b[36m${t}\x1b[39m` } });
  p.update(1, "Un nom d'outil vraiment beaucoup trop long pour l'écran");
  const ligne = sortie.at(-1)!.replace(/^\r|\x1b\[K$/g, "").replace(/\x1b\[\d+m/g, "");
  assert.ok(ligne.length <= 49, ligne);
  assert.match(ligne, /…$/);
});
