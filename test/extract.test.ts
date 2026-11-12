// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { dateIso, estUrl, extraire, telechargerRepertoire, travailAPerdre } from "../extract.ts";
import { ecrireFichier, lireFichier } from "../fichiers.ts";

test("dateIso convertit la date française en heure de Toronto, avec le décalage de la saison", () => {
  assert.equal(dateIso("5 novembre 2026 09:53"), "2026-11-05T09:53:00-05:00");
  assert.equal(dateIso("5 juillet 2026 10:00"), "2026-07-05T10:00:00-04:00");
});
test("extraire rejette une page sans date de modification", () => {
  assert.throws(() => extraire("<html></html>"), /introuvable/);
});

test("travailAPerdre: un import brut ou classifié n'a rien à perdre", () => {
  assert.deepEqual(travailAPerdre([{ nom: "a", changement: null }, { nom: "b", criteres: ["donnees"] } as never]), []);
});
test("travailAPerdre: l'enrichissement et l'historique sont signalés", () => {
  const perte = travailAPerdre([
    { nom: "a", description_longue: "Longue." },
    { nom: "b", licence: null },
    { nom: "e", enrichi_le: "2026-11-12T09:00:00-05:00" },
    { nom: "c", changement: "modification" },
    { nom: "d", removed: true },
  ]);
  assert.equal(perte.length, 2);
  assert.match(perte[0]!, /3 outil\(s\) enrichi/);
  assert.match(perte[1]!, /2 outil\(s\) avec un historique/);
});

// Page minimale: une date de modification et un seul outil.
const PAGE = `<html><body>
<p class="overline-col">Modification</p><p class="text-col">5 novembre 2026 09:53</p>
<blockquote><h3>🧪 Test</h3><p><strong><a href="https://x.example/">X</a> ★★☆</strong></p><p>Une description.</p></blockquote>
</body></html>`;

/** Sert `reponses` (statut, corps) sur un port local libre pendant `f`, sans toucher au réseau. */
async function avecServeur<T>(statut: number, corps: string, f: (url: string) => Promise<T>): Promise<T> {
  const serveur = createServer((_q, r) => {
    r.writeHead(statut, { "content-type": "text/html; charset=utf-8" });
    r.end(corps);
  });
  await new Promise<void>((ok) => serveur.listen(0, "127.0.0.1", ok));
  try {
    return await f(`http://127.0.0.1:${(serveur.address() as AddressInfo).port}/`);
  } finally {
    serveur.close();
  }
}

const extractTs = resolve("extract.ts");
/** Lance extract.ts sans bloquer la boucle d'événements (le serveur local doit pouvoir répondre). */
const lancer = (...args: string[]) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((fini) => {
    const p = spawn("nub", [extractTs, ...args]);
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (status) => fini({ status, stdout, stderr }));
  });
const dossierTemporaire = () => mkdtempSync(join(tmpdir(), "extract-"));

test("telechargerRepertoire: télécharge la page et en extrait les outils", async () => {
  const r = await avecServeur(200, PAGE, (url) => telechargerRepertoire(url));
  assert.equal(r.outils.length, 1);
  assert.equal(r.outils[0]!.nom, "X");
  assert.equal(r.modification, "2026-11-05T09:53:00-05:00");
  assert.equal(r.outils[0]!.derniere_modification, "2026-11-05T09:53:00-05:00");
});
test("telechargerRepertoire: une erreur HTTP est signalée avec l'URL et le code", async () => {
  await avecServeur(404, "introuvable", (url) =>
    assert.rejects(telechargerRepertoire(url), (e: Error) => e.message.includes("HTTP 404") && e.message.includes(url)),
  );
});
test("telechargerRepertoire: un serveur injoignable est signalé", async () => {
  await assert.rejects(telechargerRepertoire("http://127.0.0.1:1/"), /Téléchargement impossible/);
});
test("estUrl: reconnaît http et https seulement", () => {
  assert.equal(estUrl("https://x.example/"), true);
  assert.equal(estUrl("http://x.example/"), true);
  assert.equal(estUrl("outils.json"), false);
  assert.equal(estUrl("file:///x.html"), false);
});

test("CLI: télécharge la page et écrit outils.json et criteres.json", async () => {
  const dossier = dossierTemporaire();
  const [outils, criteres] = [join(dossier, "outils.json"), join(dossier, "criteres.json")];
  const r = await avecServeur(200, PAGE, (url) => lancer(outils, criteres, url));
  assert.equal(r.status, 0, r.stderr);
  const fichierOutils = JSON.parse(readFileSync(outils, "utf8"));
  assert.equal(fichierOutils.meta.data_license, "CC-BY-SA-4.0");
  assert.equal(fichierOutils.outils[0].nom, "X");
  assert.equal(fichierOutils.meta.created_at, fichierOutils.meta.updated_at);
  const fichierCriteres = JSON.parse(readFileSync(criteres, "utf8"));
  assert.equal(fichierCriteres.meta.data_license, "CC-BY-SA-4.0");
  assert.deepEqual(fichierCriteres.criteres, []);
});
test("CLI: refuse d'écraser un outils.json enrichi sans --force, puis l'écrase avec --force", async () => {
  const sortie = join(dossierTemporaire(), "outils.json");
  ecrireFichier(sortie, "outils", [{ nom: "X", description_longue: "Précieuse." }], null, "2026-11-11T16:00:00-05:00");
  const enrichi = readFileSync(sortie, "utf8");

  await avecServeur(200, PAGE, async (url) => {
    const refus = await lancer(sortie, url);
    assert.equal(refus.status, 1);
    assert.match(refus.stderr, /Refus d'écraser/);
    assert.match(refus.stderr, /--force/);
    assert.equal(readFileSync(sortie, "utf8"), enrichi);

    const force = await lancer("--force", sortie, url);
    assert.equal(force.status, 0, force.stderr);
    const outils = JSON.parse(readFileSync(sortie, "utf8")).outils;
    assert.equal(outils[0].nom, "X");
    assert.equal(outils[0].description_longue, undefined);
  });
});
test("CLI: sans travail à perdre, l'import se fait sans --force, même répété", async () => {
  const sortie = join(dossierTemporaire(), "outils.json");
  await avecServeur(200, PAGE, async (url) => {
    assert.equal((await lancer(sortie, url)).status, 0);
    assert.equal((await lancer(sortie, url)).status, 0);
  });
});
test("CLI: un téléchargement raté donne un message clair, sans trace de pile, et n'écrit rien", async () => {
  const sortie = join(dossierTemporaire(), "outils.json");
  const r = await lancer(sortie, "http://127.0.0.1:1/");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^Erreur: Téléchargement impossible/);
  assert.doesNotMatch(r.stderr, /\n\s+at /);
  assert.equal(existsSync(sortie), false);
});
test("CLI: même un --force n'écrase rien quand le téléchargement échoue", async () => {
  const sortie = join(dossierTemporaire(), "outils.json");
  writeFileSync(sortie, "[]");
  const r = await avecServeur(500, "erreur", (url) => lancer("--force", sortie, url));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /HTTP 500/);
  assert.equal(readFileSync(sortie, "utf8"), "[]");
});
test("CLI: une option inconnue ou l'absence de fichier de sortie est refusée", async () => {
  const sortie = join(dossierTemporaire(), "outils.json");
  assert.match((await lancer("--forse", sortie)).stderr, /Option inconnue/);
  assert.match((await lancer()).stderr, /Usage/);
});
test("CLI: un réimport garde created_at, et updated_at ne change que si le contenu change", async () => {
  const sortie = join(dossierTemporaire(), "outils.json");
  await avecServeur(200, PAGE, async (url) => {
    assert.equal((await lancer(sortie, url)).status, 0);
    const premier = JSON.parse(readFileSync(sortie, "utf8"));
    assert.equal((await lancer(sortie, url)).status, 0);
    const deuxieme = JSON.parse(readFileSync(sortie, "utf8"));
    assert.deepEqual(deuxieme, premier); // même page: rien ne bouge, dates comprises
  });
  const autrePage = PAGE.replace("Une description.", "Une autre description.");
  await avecServeur(200, autrePage, async (url) => {
    const avant = JSON.parse(readFileSync(sortie, "utf8"));
    assert.equal((await lancer(sortie, url)).status, 0);
    const apres = JSON.parse(readFileSync(sortie, "utf8"));
    assert.equal(apres.meta.created_at, avant.meta.created_at);
    assert.equal(apres.outils[0].description, "Une autre description.");
  });
});
test("CLI: aucun fichier HTML local n'est lu (un faux .html dans le dossier de travail et celui de sortie est ignoré)", async () => {
  const dossier = dossierTemporaire();
  const leurre = `<html><body>
<p class="overline-col">Modification</p><p class="text-col">1 janvier 2020 00:00</p>
<blockquote><h3>🧪 Leurre</h3><p><strong><a href="https://leurre.example/">Leurre</a> ★★☆</strong></p><p>Ne doit pas être lu.</p></blockquote>
</body></html>`;
  writeFileSync(join(dossier, "page.html"), leurre);
  writeFileSync(join(process.cwd(), "_leurre.html"), leurre);
  try {
    const sortie = join(dossier, "outils.json");
    const r = await avecServeur(200, PAGE, (url) => lancer(sortie, url));
    assert.equal(r.status, 0, r.stderr);
    const noms = JSON.parse(readFileSync(sortie, "utf8")).outils.map((o: { nom: string }) => o.nom);
    assert.deepEqual(noms, ["X"]); // la page du serveur, pas le leurre
  } finally {
    rmSync(join(process.cwd(), "_leurre.html"), { force: true });
  }
});
test("CLI: un outils.json qui n'a pas le format attendu n'est pas écrasé sans --force (il pourrait contenir du travail)", async () => {
  const sortie = join(dossierTemporaire(), "outils.json");
  const ancien = JSON.stringify([{ nom: "X", description_longue: "Précieuse." }]); // simple tableau, sans « meta »
  writeFileSync(sortie, ancien);
  await avecServeur(200, PAGE, async (url) => {
    const refus = await lancer(sortie, url);
    assert.equal(refus.status, 1);
    assert.match(refus.stderr, /Refus d'écraser.*pas le format attendu/);
    assert.equal(readFileSync(sortie, "utf8"), ancien);

    const force = await lancer("--force", sortie, url);
    assert.equal(force.status, 0, force.stderr);
    assert.equal(JSON.parse(readFileSync(sortie, "utf8")).meta.data_license, "CC-BY-SA-4.0");
  });
});
