// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import type { OutilClasse } from "../classify.ts";
import { aCompleterOpenHub, abandonneOpenHub, analyserDepots, analyserProjets, champOpenHub, clientOpenHub, completerOpenHub, concordance, requetesOpenHub, trouverConcordance, type ProjetOpenHub } from "../openhub.ts";
import { USER_AGENT } from "../agent.ts";
import { enrichi, outil } from "../../commun/test/donnees-fictives.ts";

const projet = (extra = "") => `<project><id>42</id><name>Jami</name><vanity_name>jami</vanity_name><html_url>https://openhub.net/p/jami</html_url><homepage_url>https://jami.net/</homepage_url>
  <links><link><category>Code</category><title>Dépôt</title><url>https://git.jami.net/savoirfairelinux/jami-project</url></link><link><url>https://docs.jami.net/</url></link></links>
  <licenses><license><name>GNU General Public License v3.0 or later</name><vanity_url>gpl3_or_later</vanity_url></license></licenses>
  <organization><id>1</id><name>Savoir-faire Linux</name></organization>
  <project_activity_index><value>60</value><description>High</description></project_activity_index>${extra}</project>`;
const ANALYSE = `<analysis><id>9</id><main_language_name>C++</main_language_name><total_code_lines>412345</total_code_lines><total_contributor_count>120</total_contributor_count><twelve_month_contributor_count>31</twelve_month_contributor_count><twelve_month_commit_count>1500</twelve_month_commit_count><min_month>2010-01-01</min_month><max_month>2026-11-01</max_month></analysis>`;
const COLLECTION = `<?xml version="1.0"?><response><status>success</status><items_returned>2</items_returned><result>${projet()}<project><id>7</id><name>Jami Client</name><vanity_name>jami-client</vanity_name><html_url>https://openhub.net/p/jami-client</html_url><homepage_url>https://example.org/</homepage_url><links></links><licenses></licenses></project></result></response>`;
const SEUL = `<?xml version="1.0"?><response><status>success</status><result>${projet(ANALYSE)}</result></response>`;

test("analyserProjets: collection sans analyse (nom, vanity, accueil, liens, licences, organisation, activité), projet seul avec analyse, erreur de statut", () => {
  const [jami, client] = analyserProjets(COLLECTION);
  assert.deepEqual(jami, { id: "42", nom: "Jami", vanity: "jami", page: "https://openhub.net/p/jami", accueil: "https://jami.net/", liens: ["https://git.jami.net/savoirfairelinux/jami-project", "https://docs.jami.net/"], licences: ["GNU General Public License v3.0 or later"], organisation: "Savoir-faire Linux", activite: "High" });
  assert.equal(client!.accueil, "https://example.org/");
  assert.deepEqual(client!.licences, []);
  const [seul] = analyserProjets(SEUL);
  assert.deepEqual(seul!.analyse, { langage_principal: "C++", lignes_de_code: 412345, contributeurs_total: 120, contributeurs_12_mois: 31, commits_12_mois: 1500, premier_mois: "2010-01-01", dernier_mois: "2026-11-01" });
  assert.throws(() => analyserProjets(`<response><status>failed</status><error>Invalid API key</error></response>`), /Open Hub: Invalid API key/);
});

test("concordance: même hôte que lien (www et casse ignorés), ou même URL que repo (barre finale et .git ignorés); sinon null", () => {
  const [jami, client] = analyserProjets(COLLECTION);
  const [gh] = analyserProjets(COLLECTION.replace("https://jami.net/", "https://github.com/x/y"));
  assert.equal(concordance([gh!], { lien: "https://github.com/autre/projet" }), null, "un lien sur une forge ne concorde pas par hôte");
  assert.equal(concordance([gh!], { lien: "https://github.com/x/y" }), gh, "un lien sur une forge concorde comme dépôt");
  assert.equal(concordance([gh!], { lien: "https://github.com/x/autre" }), gh, "même organisation de forge");
  assert.equal(concordance([gh!], { lien: "https://git.jami.net/x/y" }), null, "une forge auto-hébergée inconnue: ni hôte ni organisation");
  assert.equal(concordance([client!, jami!], { lien: "https://www.jami.net/fr/" }), jami);
  assert.equal(concordance([client!, jami!], { lien: "https://autre.example/", repo: "https://git.jami.net/savoirfairelinux/jami-project.git/" }), jami);
  assert.equal(concordance([client!, jami!], { lien: "https://autre.example/", repo: "https://github.com/x/y" }), null);
  assert.equal(concordance([], { lien: "https://jami.net/" }), null);
});

const ENLISTMENTS = `<?xml version="1.0"?><response><status>success</status><items_returned>2</items_returned><items_available>105</items_available><result><enlistment><id>1</id><code_location><url>https://github.com/matomo-org/component-cache</url><type>git</type></code_location></enlistment><enlistment><id>2</id><code_location><url>git://github.com/matomo-org/matomo.git</url></code_location></enlistment></result></response>`;
test("analyserDepots et trouverConcordance: même dépôt ou même organisation de forge dans les enlistments des premiers candidats; une requête par candidat examiné", async () => {
  assert.deepEqual(analyserDepots(ENLISTMENTS), ["https://github.com/matomo-org/component-cache", "git://github.com/matomo-org/matomo.git"]);
  const [jami, client2] = analyserProjets(COLLECTION);
  const demandes: string[] = [];
  const client = { depots: async (id: string) => { demandes.push(id); return id === "jami-client" ? analyserDepots(ENLISTMENTS) : []; } };
  assert.equal(await trouverConcordance(client, [jami!, client2!], { lien: "https://matomo.org/", repo: "https://github.com/matomo-org/matomo" }), client2);
  assert.deepEqual(demandes, ["jami", "jami-client"]);
  assert.equal(await trouverConcordance(client, [jami!, client2!], { lien: "https://matomo.org/", repo: "https://github.com/matomo-org/piwik-plugin" }), client2, "même organisation GitHub");
  assert.equal(await trouverConcordance(client, [jami!, client2!], { lien: "https://autre.example/", repo: "https://gitlab.com/autre/projet" }), null);
  assert.equal(await trouverConcordance(client, [jami!], { lien: "https://jami.net/" }), jami, "concordance directe sans requête");
  assert.equal(await trouverConcordance(client, [jami!], { lien: "https://x.example/" }), null, "sans repo, pas de lecture des dépôts");
});

test("champOpenHub: champs de l'outil à partir d'un projet avec ou sans analyse", () => {
  const [seul] = analyserProjets(SEUL);
  const champ = champOpenHub(seul!, "2026-11-13T10:00:00-05:00");
  assert.equal(champ.organisation, "Savoir-faire Linux");
  assert.equal(champ.contributeurs_12_mois, 31);
  assert.equal(champ.consulte_le, "2026-11-13T10:00:00-05:00");
  const [sans] = analyserProjets(COLLECTION);
  assert.equal(champOpenHub(sans!, "d").lignes_de_code, null);
});

test("aCompleterOpenHub et abandonneOpenHub: outils enrichis au code public seulement, sans openhub, selon le compteur", () => {
  assert.equal(aCompleterOpenHub(enrichi("A")), true);
  assert.equal(aCompleterOpenHub(enrichi("B", { source: "partiel" })), true);
  assert.equal(aCompleterOpenHub(enrichi("C", { source: "proprietaire" })), false);
  assert.equal(aCompleterOpenHub(outil("D")), false);
  assert.equal(aCompleterOpenHub(enrichi("E", { openhub_id: "e", openhub: champOpenHub(analyserProjets(SEUL)[0]!, "d") })), false);
  assert.equal(aCompleterOpenHub(enrichi("F", { echecs_openhub: 3 })), false);
  assert.equal(abandonneOpenHub(enrichi("F", { echecs_openhub: 3 })), true);
  assert.equal(aCompleterOpenHub(enrichi("G", { echecs_openhub: 2 })), true);
  assert.equal(requetesOpenHub([enrichi("A"), enrichi("C", { source: "proprietaire" }), enrichi("F", { echecs_openhub: 3 })]), 5);
});

const faux = (recherche: ProjetOpenHub[], seul?: ProjetOpenHub) => {
  const appels: string[] = [];
  return {
    appels,
    client: {
      rechercher: async (nom: string) => (appels.push(`rechercher ${nom}`), recherche),
      depots: async (id: string) => (appels.push(`depots ${id}`), [] as string[]),
      projet: async (id: string) => { appels.push(`projet ${id}`); if (!seul) throw new Error("introuvable"); return seul; },
    },
  };
};

test("completerOpenHub: un service instance d'un logiciel: recherche par le nom du logiciel, concordance sur son dépôt normalisé plutôt que sur l'hôte du service", async () => {
  const [jami] = analyserProjets(COLLECTION);
  const [seul] = analyserProjets(SEUL);
  const { client, appels } = faux([jami!], seul);
  const outils: OutilClasse[] = [enrichi("Jasette FACiLe", { lien: "https://jasette.facil.example/", repo: null, instance_de: { nom: "Jami", url: "https://git.jami.net/savoirfairelinux/jami-project/-/tags/v1" } })];
  const r = await completerOpenHub(outils, { client });
  assert.deepEqual(r.completes, ["Jasette FACiLe"]);
  assert.deepEqual(appels, ["rechercher Jami", "projet jami"]);
  const sans = await completerOpenHub([enrichi("Autre FACiLe", { lien: "https://jami.net/", repo: null, instance_de: { nom: "X", url: "https://github.com/x/y" } })], { client: faux([jami!], seul).client });
  assert.deepEqual(sans.completes, [], "l'hôte du service ne compte plus quand l'outil est une instance");
});
test("completerOpenHub: concordance trouvée: openhub_id et openhub inscrits en place, compteur retiré, sauvegarde; outil déjà complété jamais refait", async () => {
  const [jami] = analyserProjets(COLLECTION);
  const [seul] = analyserProjets(SEUL);
  const { client, appels } = faux([jami!], seul);
  const outils: OutilClasse[] = [enrichi("Jami", { lien: "https://jami.net/", repo: "https://git.jami.net/savoirfairelinux/jami-project", echecs_openhub: 1 }), enrichi("Déjà", { openhub_id: "x", openhub: champOpenHub(seul!, "d") })];
  let sauvegardes = 0;
  const journal: string[] = [];
  const r = await completerOpenHub(outils, { client, horloge: () => "2026-11-13T10:00:00-05:00", apresChaque: () => sauvegardes++, journal: (m) => journal.push(m) });
  assert.deepEqual(r.completes, ["Jami"]);
  assert.deepEqual(appels, ["rechercher Jami", "projet jami"]);
  assert.equal(outils[0]!.openhub_id, "jami");
  assert.equal(outils[0]!.openhub!.contributeurs_12_mois, 31);
  assert.equal(outils[0]!.openhub!.consulte_le, "2026-11-13T10:00:00-05:00");
  assert.equal(outils[0]!.echecs_openhub, undefined);
  assert.equal(sauvegardes, 1);
  assert.ok(journal.some((m) => /Jami: Jami \(jami\), High, 31 contributeur/.test(m)));
});

test("completerOpenHub: sans concordance, les meilleurs candidats sont journalisés, rien n'est écrit sauf le compteur; abandon à maxEchecs; erreur réseau comptée", async () => {
  const [jami, client2] = analyserProjets(COLLECTION);
  const { client } = faux([jami!, client2!]);
  const outils: OutilClasse[] = [enrichi("Autre", { lien: "https://autre.example/", repo: "https://github.com/a/b" }), enrichi("Fin", { lien: "https://fin.example/", echecs_openhub: 2 })];
  const journal: string[] = [];
  const r = await completerOpenHub(outils, { client, journal: (m) => journal.push(m) });
  assert.deepEqual(r.completes, []);
  assert.equal(r.erreurs.length, 2);
  assert.equal(r.sansConcordance[0]!.nom, "Autre");
  assert.match(r.sansConcordance[0]!.candidats, /Jami \(jami, https:\/\/jami\.net\/\); Jami Client \(jami-client/);
  assert.equal(outils[0]!.echecs_openhub, 1);
  assert.equal(outils[0]!.openhub, undefined);
  assert.deepEqual(r.erreurs.map((e) => e.nom), ["Autre", "Fin"]);
  assert.equal(outils[1]!.echecs_openhub, 3);
  assert.ok(journal.some((m) => /Fin: Open Hub: .*abandonné après 3/.test(m)));
  const s = await completerOpenHub(outils, { client });
  assert.deepEqual(s.abandonnes, ["Fin"]);
  const reseau = await completerOpenHub([enrichi("R")], { client: { rechercher: async () => { throw new Error("Open Hub HTTP 503"); }, depots: async () => [], projet: async () => { throw new Error("x"); } } });
  assert.match(reseau.erreurs[0]!.message, /HTTP 503/);
});

test("clientOpenHub: recherche et projet passent la clé et les paramètres, et lisent le XML; HTTP en erreur refusé", async () => {
  const urls: string[] = [];
  const agents: string[] = [];
  const telecharger = (async (url: URL, init: { headers: Record<string, string> }) => { urls.push(url.toString()); agents.push(init.headers["user-agent"]!); return { ok: true, status: 200, text: async () => (url.pathname === "/p.xml" ? COLLECTION : url.pathname.endsWith("/enlistments.xml") ? ENLISTMENTS : SEUL) }; }) as unknown as typeof fetch;
  const c = clientOpenHub("CLE", telecharger);
  assert.equal((await c.rechercher("Jami"))[0]!.nom, "Jami");
  assert.equal(agents[0], USER_AGENT, "User-Agent du projet");
  assert.match(urls[0]!, /^https:\/\/www\.openhub\.net\/p\.xml\?api_key=CLE&query=Jami&sort=relevance$/);
  assert.equal((await c.projet("jami")).analyse!.lignes_de_code, 412345);
  assert.match(urls[1]!, /^https:\/\/www\.openhub\.net\/p\/jami\.xml\?api_key=CLE$/);
  assert.equal((await c.depots("jami")).length, 2);
  assert.match(urls[2]!, /^https:\/\/www\.openhub\.net\/p\/jami\/enlistments\.xml\?api_key=CLE$/);
  const refuse = clientOpenHub("CLE", (async () => ({ ok: false, status: 401, text: async () => "" })) as unknown as typeof fetch);
  await assert.rejects(refuse.rechercher("x"), /Open Hub HTTP 401/);
});
