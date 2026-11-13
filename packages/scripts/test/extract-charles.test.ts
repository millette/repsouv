// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { slug, type Categorie } from "../categories.ts";
import type { OutilClasse } from "../classify.ts";
import {
  CARACTERISTIQUES, CATEGORIE_PAR_CATEGORIE, CATEGORIE_PAR_ID, CATEGORIES_CHARLES, composerDescription, extraireCharles, LIEN_PAR_ID, lireDossierCharles, PAYS, SOURCE_CHARLES,
  synchroniserCharles, TARIF, telechargerCharles, urlsCharles, type DonneesCharles,
} from "../extract-charles.ts";
import { USER_AGENT } from "../agent.ts";
import { ecrireFichier, lireFichier } from "../fichiers.ts";
import { problemesSource, type Source } from "../sources.ts";
import { CATEGORIES, META, OUTILS, outil, SOURCES, TAGS } from "./donnees-fictives.ts";

const T0 = "2026-09-08T17:47:04-04:00";
const T1 = "2026-11-13T10:00:00-05:00";
const alternative = (id: string, name: string, category: string, extra: Partial<DonneesCharles["alternatives"][number]> = {}) => ({
  id, name, url: `https://${id}.example/`, country: "FR", category, pricing: "free", features: ["privacy", "eu-hosted"], ...extra,
});
const DONNEES: DonneesCharles = {
  alternatives: [
    alternative("qwant", "Qwant", "search", { features: ["privacy", "no-tracking", "eu-hosted"] }),
    alternative("nextcloud", "Nextcloud", "cloud", { country: "DE", pricing: "freemium", features: ["self-hosted", "open-source", "eu-hosted"] }),
    alternative("anytype", "Anytype", "productivity", { country: "CH", features: ["local-first", "open-source"] }),
    alternative("mollie", "Mollie", "payment", { country: "NL", pricing: "freemium", features: ["eu-hosted", "business"] }),
    alternative("appleplans", "Plans (Apple)", "maps", { country: "US", features: ["offline-maps"] }),
    alternative("plausible", "Plausible", "analytics", { country: "EE", pricing: "paid", features: ["analytics", "lightweight"] }),
  ],
  sites: [
    { id: "googlesearch", name: "Google Search", domains: ["google.com", "google.fr"], alternatives: ["qwant"] },
    { id: "dropbox", name: "Dropbox", domains: ["dropbox.com", "www.dropbox.com"], alternatives: ["nextcloud"] },
    { id: "googledrive", name: "Google Drive", domains: ["drive.google.com"], alternatives: ["nextcloud"] },
    { id: "googlephotos", name: "Google Photos", domains: ["photos.google.com"], alternatives: ["nextcloud"] },
    { id: "notion", name: "Notion", domains: ["notion.so"], alternatives: ["anytype"] },
    { id: "stripe", name: "Stripe", domains: ["stripe.com"], alternatives: ["mollie"] },
    { id: "googlemaps", name: "Google Maps", domains: ["maps.google.com"], alternatives: ["appleplans"] },
  ],
  categories: ["search", "cloud", "productivity", "payment", "maps", "analytics"].map((id) => ({ id })),
  modification: T0,
};

test("SOURCE_CHARLES est une source valide, d'extracteur charles, qui pointe le dépôt GitLab et son dossier data", () => {
  assert.deepEqual(problemesSource(SOURCE_CHARLES), []);
  assert.equal(SOURCE_CHARLES.extracteur, "charles");
  assert.equal(SOURCE_CHARLES.url, "https://gitlab.com/yaniskerdjana/charles");
  assert.equal(SOURCE_CHARLES.donnees, "https://gitlab.com/yaniskerdjana/charles/-/tree/main/data");
});

test("les tables renvoient à des slugs; chaque catégorie déclarée a pour id le slug de son nom, porte la source charles et est utilisée par une table", () => {
  const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const valeurs = [...Object.values(CATEGORIE_PAR_CATEGORIE), ...Object.values(CATEGORIE_PAR_ID).filter((v): v is string => v !== null)];
  for (const id of valeurs) assert.match(id, SLUG);
  for (const c of CATEGORIES_CHARLES) {
    assert.equal(c.id, slug(c.nom));
    assert.equal(c.source_repertoire_id, "charles");
    assert.ok(c.icone);
    assert.ok(valeurs.includes(c.id), `${c.id} n'est utilisée par aucune table`);
  }
  assert.equal(CATEGORIE_PAR_ID.appleplans, null, "Plans d'Apple est exclu (américain selon la source)");
  for (const v of Object.values(PAYS)) assert.match(v, /^d'origine /);
  for (const v of [...Object.values(TARIF), ...Object.values(CARACTERISTIQUES)]) assert.ok(v.trim());
  for (const url of Object.values(LIEN_PAR_ID)) assert.match(url, /^https:\/\/\S+$/);
});

test("extraireCharles: LIEN_PAR_ID remplace l'URL morte de la source par le lien corrigé, et seulement pour les alternatives listées", () => {
  const d = structuredClone(DONNEES);
  d.alternatives.push(alternative("infomaniak", "Infomaniak kDrive", "cloud", { url: "https://www.infomaniak.com/kdrive" }));
  const { outils } = extraireCharles(d);
  assert.equal(outils.find((o) => o.nom === "Infomaniak kDrive")!.lien, LIEN_PAR_ID.infomaniak);
  assert.equal(outils.find((o) => o.nom === "Qwant")!.lien, "https://qwant.example/");
});

test("composerDescription: pays, tarif, caractéristiques traduites (sans doublon) et services remplacés; ce qui manque aux tables est rapporté", () => {
  const inconnues: string[] = [];
  const d = composerDescription(alternative("x", "X", "search", { country: "ZZ", pricing: "troc", features: ["privacy", "privacy-focused", "mystere"] }), ["Google Search", "Bing", "Yahoo"], inconnues);
  assert.equal(d, "X est une alternative européenne recensée par Charles. Caractéristiques : axé sur la vie privée. Proposée en remplacement de Google Search, Bing et Yahoo.");
  assert.deepEqual(inconnues, ["pays « ZZ »", "tarif « troc »", "caractéristique « mystere »"]);
  assert.equal(composerDescription(alternative("q", "Qwant", "search", { features: [] }), []), "Qwant est une alternative européenne recensée par Charles, d'origine française, gratuite.");
});

test("extraireCharles: un outil par alternative avec catégorie (table, exception, exclusion), description composée, score estimé par seuil, alternative_a (sites inversés), catégories déclarées utilisées, avertissements", () => {
  const { outils, source, categories, exclus, avertissements } = extraireCharles(DONNEES);
  assert.equal(source.id, "charles");
  assert.deepEqual(outils.map((o) => o.nom), ["Qwant", "Nextcloud", "Anytype", "Mollie", "Plausible"]);
  const qwant = outils[0]!;
  assert.equal(qwant.categorie, "navigation-web");
  assert.equal(qwant.lien, "https://qwant.example/");
  assert.equal(qwant.description, "Qwant est une alternative européenne recensée par Charles, d'origine française, gratuite. Caractéristiques : axé sur la vie privée, sans pistage, hébergé dans l'Union européenne. Proposée en remplacement de Google Search.");
  assert.deepEqual(qwant.alternative_a, ["https://google.com/"], "le premier domaine du site");
  assert.equal(qwant.source_repertoire_id, "charles");
  assert.equal(qwant.score_estime, true);
  assert.equal(qwant.score, qwant.criteres.length);
  assert.equal(qwant.confiance, "indéterminée");
  assert.equal(qwant.changement, null);
  assert.equal(qwant.derniere_modification, "");
  assert.equal(qwant.pays, "FR", "le pays de la source");
  const nextcloud = outils[1]!;
  assert.deepEqual(nextcloud.alternative_a, ["https://dropbox.com/", "https://drive.google.com/", "https://photos.google.com/"]);
  assert.match(nextcloud.description, /d'origine allemande, gratuite avec des options payantes\. Caractéristiques : auto-hébergeable, open source, hébergé dans l'Union européenne\. Proposée en remplacement de Dropbox, Google Drive et Google Photos\./);
  assert.ok(nextcloud.criteres.includes("donnees"), "« auto-hébergeable » compte pour le critère données");
  assert.equal(outils[2]!.categorie, "veille-et-gestion-de-l-information", "exception par id");
  assert.equal(outils[3]!.categorie, "paiement-en-ligne");
  assert.deepEqual(categories, [{ id: "paiement-en-ligne", nom: "Paiement en ligne", icone: "💳", source_repertoire_id: "charles" }], "seule la catégorie déclarée qu'un outil utilise");
  assert.equal(outils[4]!.alternative_a, undefined);
  assert.deepEqual(exclus, ["Plans (Apple) (appleplans: exclue par CATEGORIE_PAR_ID)"]);
  assert.deepEqual(avertissements, ["Plausible: aucun site de sites-us.json ne la propose en alternative"]);
});

test("extraireCharles: caractéristique inconnue en avertissement; catégorie absente des données, catégorie sans table, site vers une alternative inconnue, noms en double, données vides: erreurs explicites", () => {
  const avec = (modifier: (d: DonneesCharles) => void) => {
    const d = structuredClone(DONNEES);
    modifier(d);
    return d;
  };
  const { avertissements } = extraireCharles(avec((d) => { d.alternatives[0]!.features = ["privacy", "teleportation"]; }));
  assert.ok(avertissements.includes("Qwant: caractéristique « teleportation » inconnu(e) (à ajouter aux tables de extract-charles.ts)"));
  assert.throws(() => extraireCharles(avec((d) => { d.alternatives[0]!.category = "magie"; })), /Qwant: catégorie « magie » absente de data\/categories\.json/);
  assert.throws(() => extraireCharles(avec((d) => { d.categories.push({ id: "magie" }); d.alternatives[0]!.category = "magie"; })), /sans correspondance dans CATEGORIE_PAR_CATEGORIE .*: magie/);
  assert.throws(() => extraireCharles(avec((d) => { d.sites[0]!.alternatives.push("inconnue"); })), /site « googlesearch » renvoie à une alternative inconnue « inconnue »/);
  assert.throws(() => extraireCharles(avec((d) => { d.alternatives[1]!.name = "QWANT "; })), /même nom/);
  assert.throws(() => extraireCharles(avec((d) => { d.alternatives[1]!.id = "qwant"; })), /même id/);
  assert.throws(() => extraireCharles(avec((d) => { d.alternatives[1]!.url = "nextcloud.example"; })), /sans nom ou sans URL/);
  assert.throws(() => extraireCharles(avec((d) => { d.alternatives = []; })), /aucune alternative/);
});

test("urlsCharles: fichiers bruts de main et API des commits de data/, pour le dépôt par défaut ou un autre dépôt GitLab", () => {
  const u = urlsCharles();
  assert.equal(u.brut("alternatives"), "https://gitlab.com/yaniskerdjana/charles/-/raw/main/data/alternatives.json");
  assert.equal(u.commits, "https://gitlab.com/api/v4/projects/yaniskerdjana%2Fcharles/repository/commits?path=data&ref_name=main&per_page=1");
  assert.equal(urlsCharles("https://forge.example/groupe/sous/projet.git/").brut("sites-us"), "https://forge.example/groupe/sous/projet/-/raw/main/data/sites-us.json");
  assert.throws(() => urlsCharles("https://gitlab.com/seul"), /URL d'un dépôt GitLab/);
});

const reponse = (corps: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => corps }) as unknown as Response;
const faux = (commits: unknown, okCommits = true) => {
  const appels: { url: string; agent: string | undefined; accept: string | undefined }[] = [];
  const telecharger = (async (entree: string | URL | Request, init?: RequestInit) => {
    const url = String(entree);
    const h = init?.headers as Record<string, string>;
    appels.push({ url, agent: h["user-agent"], accept: h.accept });
    if (url.endsWith("/alternatives.json")) return reponse({ alternatives: DONNEES.alternatives });
    if (url.endsWith("/sites-us.json")) return reponse({ sites: DONNEES.sites });
    if (url.endsWith("/categories.json")) return reponse({ categories: DONNEES.categories });
    if (url.includes("/repository/commits")) return reponse(commits, okCommits);
    return reponse(null, false);
  }) as typeof fetch;
  return { telecharger, appels };
};

test("telechargerCharles: trois fichiers bruts et l'API des commits avec le User-Agent du projet; la date du dernier commit est convertie en heure de Toronto", async () => {
  const { telecharger, appels } = faux([{ committed_date: "2026-09-08T21:47:04.000+00:00" }]);
  const { donnees, avertissements } = await telechargerCharles(undefined, telecharger, T1);
  assert.equal(appels.length, 4);
  for (const a of appels) {
    assert.equal(a.agent, USER_AGENT);
    assert.equal(a.accept, "application/json");
  }
  assert.equal(donnees.modification, T0);
  assert.equal(donnees.alternatives.length, 6);
  assert.deepEqual(avertissements, []);
});

test("telechargerCharles: sans date de commit (API en erreur ou réponse vide), les outils sont datés de la lecture avec un avertissement; un fichier brut en erreur arrête tout", async () => {
  const sansDate = await telechargerCharles(undefined, faux([]).telecharger, T1);
  assert.equal(sansDate.donnees.modification, T1);
  assert.match(sansDate.avertissements[0]!, /date du dernier commit inconnue .*committed_date.*heure de lecture/);
  const api = await telechargerCharles(undefined, faux(null, false).telecharger, T1);
  assert.equal(api.donnees.modification, T1);
  assert.match(api.avertissements[0]!, /HTTP 500/);
  const casse = (async (entree: string | URL | Request, init?: RequestInit) => (String(entree).endsWith("/sites-us.json") ? reponse(null, false) : faux([]).telecharger(entree, init))) as typeof fetch;
  await assert.rejects(telechargerCharles(undefined, casse, T1), /Téléchargement impossible .*sites-us\.json.*HTTP 500/);
  const malforme = (async (entree: string | URL | Request, init?: RequestInit) => (String(entree).endsWith("/sites-us.json") ? reponse({ pages: [] }) : faux([]).telecharger(entree, init))) as typeof fetch;
  await assert.rejects(telechargerCharles(undefined, malforme, T1), /sites-us\.json: tableau « sites » attendu/);
});

const clone = () => {
  const d = mkdtempSync(join(tmpdir(), "charles-clone-"));
  mkdirSync(join(d, "data"));
  writeFileSync(join(d, "data", "alternatives.json"), JSON.stringify({ alternatives: DONNEES.alternatives }));
  writeFileSync(join(d, "data", "sites-us.json"), JSON.stringify({ sites: DONNEES.sites }));
  writeFileSync(join(d, "data", "categories.json"), JSON.stringify({ categories: DONNEES.categories }));
  return d;
};

test("lireDossierCharles: les trois fichiers de data/ d'un clone local, datés de l'heure de lecture; fichier manquant en erreur", () => {
  const d = clone();
  const donnees = lireDossierCharles(d, T1);
  assert.equal(donnees.modification, T1);
  assert.deepEqual(donnees.alternatives.map((a) => a.id), DONNEES.alternatives.map((a) => a.id));
  assert.equal(donnees.sites.length, 7);
  assert.throws(() => lireDossierCharles(join(d, "absent")), /alternatives\.json: fichier introuvable/);
});

const dossier = (outils: OutilClasse[] = OUTILS, categories: Categorie[] = CATEGORIES) => {
  const d = mkdtempSync(join(tmpdir(), "charles-"));
  ecrireFichier(join(d, "outils.json"), "outils", outils, null, META.created_at);
  ecrireFichier(join(d, "categories.json"), "categories", categories, null, META.created_at);
  ecrireFichier(join(d, "tags.json"), "tags", TAGS, null, META.created_at);
  ecrireFichier(join(d, "sources.json"), "sources", [SOURCES[0]!], null, META.created_at);
  return d;
};

test("synchroniserCharles: les alternatives entrent comme nouvelles, datées du commit, sans toucher aux outils Praxis; un doublon de nom d'une autre source n'est pas importé mais listé; source et catégories écrites; second passage sans écriture; alternative disparue retirée", () => {
  const d = dossier([...OUTILS, outil("nextcloud ")]);
  const f = join(d, "outils.json");
  const r = synchroniserCharles(f, DONNEES);
  assert.deepEqual(r.resume.nouveau, ["Qwant", "Anytype", "Mollie", "Plausible"]);
  assert.deepEqual(r.doublons, ["Nextcloud (praxis)"], "casse et espaces ignorés");
  assert.deepEqual(r.exclus, ["Plans (Apple) (appleplans: exclue par CATEGORIE_PAR_ID)"]);
  assert.equal(r.ecrit, true);
  assert.equal(r.sourcesEcrites, true);
  assert.equal(r.categoriesEcrites, true);
  const outils = lireFichier<OutilClasse>(f, "outils").donnees;
  assert.equal(outils.length, OUTILS.length + 1 + 4);
  assert.deepEqual(outils.slice(0, OUTILS.length + 1).map((o) => o.nom), [...OUTILS.map((o) => o.nom), "nextcloud "], "les outils Praxis restent en tête, inchangés");
  const qwant = outils.find((o) => o.nom === "Qwant")!;
  assert.equal(qwant.derniere_modification, T0);
  assert.equal(qwant.changement, "nouveau");
  assert.equal(qwant.confiance, "indéterminée", "la classification de l'extracteur est conservée");
  assert.deepEqual(lireFichier<Source>(join(d, "sources.json"), "sources").donnees.map((s) => s.id), ["praxis", "charles"]);
  const categories = lireFichier<Categorie>(join(d, "categories.json"), "categories").donnees;
  assert.deepEqual(categories.map((c) => c.id), [...CATEGORIES.map((c) => c.id), "paiement-en-ligne"]);
  assert.equal(categories.at(-1)!.source_repertoire_id, "charles");
  const s = synchroniserCharles(f, DONNEES);
  assert.equal(s.ecrit, false);
  assert.equal(s.sourcesEcrites, false);
  assert.equal(s.categoriesEcrites, false);
  const moins = synchroniserCharles(f, { ...DONNEES, alternatives: DONNEES.alternatives.filter((a) => a.id !== "plausible") });
  assert.deepEqual(moins.resume.retrait, ["Plausible"]);
  assert.equal(lireFichier<OutilClasse>(f, "outils").donnees.find((o) => o.nom === "Plausible")!.removed, true);
  assert.throws(() => synchroniserCharles(join(d, "absent", "outils.json"), DONNEES), /absent: lancer/);
});

test("synchroniserCharles: voir_aussi relie une alternative au service d'une autre source qui en est une instance", () => {
  const d = dossier([...OUTILS, outil("Nuage", { source_repertoire_id: "facil", instance_de: { nom: "NextCloud", url: "https://github.com/nextcloud/server" } })]);
  const f = join(d, "outils.json");
  synchroniserCharles(f, DONNEES);
  const outils = lireFichier<OutilClasse>(f, "outils").donnees;
  assert.deepEqual(outils.find((o) => o.nom === "Nextcloud")!.voir_aussi, ["Nuage"]);
  assert.deepEqual(outils.find((o) => o.nom === "Nuage")!.voir_aussi, ["Nextcloud"]);
});

test("synchroniserCharles: un outil au score estimé déjà enrichi garde le score de l'évaluation enrichie et n'est pas marqué modifié pour autant", () => {
  const d = dossier();
  const f = join(d, "outils.json");
  synchroniserCharles(f, DONNEES);
  const lu = lireFichier<OutilClasse>(f, "outils");
  const enrichis = lu.donnees.map((o) => (o.nom === "Qwant" ? { ...o, score: 2, criteres: ["donnees", "dependance"], confiance: "élevée", description_longue: "Longue.", tags: ["vie-privee"], source: "proprietaire", licence: null, custom_license: null, custom_license_url: null, repo: null, evaluation_enrichie: { score: 2, criteres: ["donnees", "dependance"], confiance: "élevée" }, enrichi_le: T1 } : o)) as OutilClasse[];
  ecrireFichier(f, "outils", enrichis, lu, T1);
  const r = synchroniserCharles(f, DONNEES);
  assert.deepEqual(r.resume.modification, []);
  assert.equal(r.ecrit, false);
  const qwant = lireFichier<OutilClasse>(f, "outils").donnees.find((o) => o.nom === "Qwant")!;
  assert.equal(qwant.score, 2);
  assert.equal(qwant.description_longue, "Longue.");
});
