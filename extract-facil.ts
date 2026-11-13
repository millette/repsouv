// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Extracteur de la source « facil »: la page des Services FACiLes (https://facil.services/), où FACiL (Québec) liste les
// services libres qu'il héberge: un bloc `div.un-service` par service, avec le nom et le lien, une phrase de
// description, « Est une instance de : <logiciel> » (lien vers le dépôt ou la version) et « Remplace : <services> ».
// La page n'a ni étoiles ni catégories: le score est estimé (score_estime, voir ajouter.ts) et la catégorie vient de
// CATEGORIE_PAR_LOGICIEL (à réviser à la main); les services remplacés sont convertis en URL par ALTERNATIVES.
//
// Usage: node extract-facil.ts [--fichier=page.html] [outils.json] [url]
//   Lit la page (par défaut téléchargée; facil.services refuse les clients sans en-tête de navigateur, d'où
//   --fichier pour une copie locale), synchronise les outils de la source « facil » dans outils.json (comme update
//   le fait pour Praxis: nouveau, modification, retrait, comeback; les autres sources ne sont pas touchées) et met
//   sources.json à jour. Les outils nouveaux sont ensuite enrichis par `node update.ts`.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseHTML } from "linkedom";
import { classer, type OutilClasse } from "./classify.ts";
import { lancer } from "./cli.ts";
import { couleursActives, creerCouleurs } from "./couleurs.ts";
import type { Outil } from "./extract.ts";
import { ecrireFichier, lireFichier, lireSiExiste } from "./fichiers.ts";
import { sourcesAvec, type Source } from "./sources.ts";
import { horodatage } from "./temps.ts";
import { lignesResume, mettreAJour } from "./update.ts";

export const ID_FACIL = "facil";
export const URL_FACIL = "https://facil.services/";
export const SOURCE_FACIL: Readonly<Source> = {
  id: ID_FACIL,
  nom: "Services FACiLes (FACiL, pour l'appropriation collective de l'informatique libre)",
  url: URL_FACIL,
  extracteur: "facil",
  pdc: "https://facil.services/pdc/",
  donnees: "https://facil.services/donnees/",
};

/** Catégorie (categories.json) selon le logiciel dont le service est une instance; clé en minuscules. À réviser à la main. */
export const CATEGORIE_PAR_LOGICIEL: Readonly<Record<string, string>> = {
  "agenda-libre-ruby": "gestion-d-evenements-et-billetterie",
  "collabora online": "bureautique-et-collaboration",
  peertube: "creation-et-gestion-de-contenus-numeriques",
  gitlab: "gestion-de-projets-et-des-taches",
  "jitsi meet": "communication-et-collaboration-d-equipe",
  snappymail: "messagerie-electronique",
  framadate: "gestion-de-projets-et-des-taches",
  cryptpad: "bureautique-et-collaboration",
  mattermost: "communication-et-collaboration-d-equipe",
  mobilizon: "gestion-d-evenements-et-billetterie",
  privatebin: "securite-et-gestion-des-acces",
  liberaforms: "gestion-de-la-relation-des-membres-et-crm",
  discourse: "communautes-reseaux-et-partage-des-connaissances",
  mastodon: "communautes-reseaux-et-partage-des-connaissances",
  freshrss: "veille-et-gestion-de-l-information",
  lstu: "navigation-web",
  nextcloud: "stockage-infonuagique-et-sauvegarde",
  diaspora: "communautes-reseaux-et-partage-des-connaissances",
  bilboplanet: "veille-et-gestion-de-l-information",
  searxng: "navigation-web",
  lufi: "stockage-infonuagique-et-sauvegarde",
  mediawiki: "communautes-reseaux-et-partage-des-connaissances",
};

/** URL des services que la page dit remplacer (alternative_a); clé en minuscules, telle qu'écrite sur la page. */
export const ALTERNATIVES: Readonly<Record<string, string | string[]>> = {
  meetup: "https://www.meetup.com/",
  eventbrite: "https://www.eventbrite.ca/",
  "google docs": "https://docs.google.com/",
  "office 365": "https://www.microsoft.com/microsoft-365",
  youtube: "https://www.youtube.com/",
  github: "https://github.com/",
  bitbucket: "https://bitbucket.org/",
  skype: "https://www.skype.com/",
  whatsapp: "https://www.whatsapp.com/",
  hangouts: "https://meet.google.com/",
  messenger: "https://www.messenger.com/",
  facetime: "https://apps.apple.com/app/facetime/id1110145091",
  gmail: "https://mail.google.com/",
  outlook: "https://outlook.live.com/",
  doodle: "https://doodle.com/",
  slack: "https://slack.com/",
  "ms teams": "https://www.microsoft.com/microsoft-teams",
  discord: "https://discord.com/",
  "événements facebook": "https://www.facebook.com/events/",
  pastebin: "https://pastebin.com/",
  "google forms": "https://forms.google.com/",
  "groupes facebook ou google": ["https://www.facebook.com/groups/", "https://groups.google.com/"],
  twitter: "https://x.com/",
  facebook: "https://www.facebook.com/",
  "google news": "https://news.google.com/",
  instagram: "https://www.instagram.com/",
  reddit: "https://www.reddit.com/",
  "bit.ly": "https://bitly.com/",
  "goo.gl": "https://goo.gl/",
  "google drive": "https://drive.google.com/",
  "microsoft onedrive": "https://onedrive.live.com/",
  dropbox: "https://www.dropbox.com/",
  "google+": "https://plus.google.com/",
  feedly: "https://feedly.com/",
  inoreader: "https://www.inoreader.com/",
  google: "https://www.google.com/",
  bing: "https://www.bing.com/",
  wetransfer: "https://wetransfer.com/",
  sharepoint: "https://www.microsoft.com/sharepoint",
  confluence: "https://www.atlassian.com/software/confluence",
};

export interface ExtractionFacil {
  outils: OutilClasse[];
  source: Source;
  /** Ce que la page dit et que l'extracteur ne sait pas convertir: à ajouter aux tables ci-dessus. */
  avertissements: string[];
}

const espaces = (s: string) => s.replace(/\s+/g, " ").trim();

/** Les outils de la page des Services FACiLes. Lève une erreur si un service n'a pas de catégorie connue. */
export function extraireFacil(html: string): ExtractionFacil {
  const { document } = parseHTML(html);
  const blocs = [...document.querySelectorAll("div.un-service")];
  if (!blocs.length) throw new Error("page FACiL: aucun service trouvé (div.un-service)");
  const avertissements: string[] = [];
  const sansCategorie: string[] = [];
  const outils: OutilClasse[] = [];
  for (const bloc of blocs) {
    const paragraphes = [...bloc.querySelectorAll("p")];
    const titre = paragraphes[0]?.querySelector("span a") ?? paragraphes[0]?.querySelector("a");
    const nom = espaces(titre?.textContent ?? "");
    const lien = titre?.getAttribute("href") ?? "";
    if (!nom || !lien) throw new Error("page FACiL: un service sans nom ou sans lien");
    const description = espaces(paragraphes[1]?.textContent ?? "");
    const details = paragraphes[2];
    const instance = details?.querySelector("a");
    const texteDetails = espaces(details?.textContent ?? "");
    const logiciel = espaces(instance?.textContent ?? "");
    const remplace = /Remplace\s*:\s*(.*?)\s*(?:Rapporter|$)/.exec(texteDetails)?.[1] ?? "";
    const alternatives: string[] = [];
    for (const nomService of remplace.split(",").map(espaces).filter(Boolean)) {
      const url = ALTERNATIVES[nomService.toLowerCase()];
      if (url) alternatives.push(...(Array.isArray(url) ? url : [url]));
      else avertissements.push(`${nom}: service remplacé inconnu « ${nomService} » (à ajouter à ALTERNATIVES dans extract-facil.ts)`);
    }
    const categorie = CATEGORIE_PAR_LOGICIEL[logiciel.toLowerCase()];
    if (!categorie) {
      sansCategorie.push(`${nom} (instance de « ${logiciel || "?"} »)`);
      continue;
    }
    const classement = classer(description);
    outils.push({
      categorie, nom, score: classement.criteres.length, score_estime: true, lien, description,
      derniere_modification: "", changement: null, source_repertoire_id: ID_FACIL,
      ...(instance && logiciel && { instance_de: { nom: logiciel, url: instance.getAttribute("href") ?? "" } }),
      ...(alternatives.length && { alternative_a: [...new Set(alternatives)] }),
      ...classement,
    });
  }
  if (sansCategorie.length) throw new Error(`page FACiL: logiciel sans catégorie dans CATEGORIE_PAR_LOGICIEL (extract-facil.ts): ${sansCategorie.join(", ")}`);
  const noms = outils.map((o) => o.nom);
  if (new Set(noms).size !== noms.length) throw new Error("page FACiL: deux services portent le même nom");
  return { outils, source: { ...SOURCE_FACIL }, avertissements };
}

/** Télécharge la page avec un en-tête de navigateur (facil.services refuse les autres clients). */
export async function telechargerFacil(url: string = URL_FACIL, telecharger: typeof fetch = fetch): Promise<string> {
  const reponse = await telecharger(url, { headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) outils-souverainete-numerique", accept: "text/html" }, signal: AbortSignal.timeout(30_000) });
  if (!reponse.ok) throw new Error(`Téléchargement impossible (${url}): HTTP ${reponse.status}`);
  return reponse.text();
}

export interface SynchronisationFacil {
  resume: ReturnType<typeof mettreAJour>["resume"];
  ecrit: boolean;
  sourcesEcrites: boolean;
  avertissements: string[];
}

/** Synchronise les outils de la source « facil » dans `fichier` (outils.json) et la source dans sources.json. */
export function synchroniserFacil(fichier: string, html: string, maintenant: string = horodatage()): SynchronisationFacil {
  const lu = lireSiExiste<OutilClasse>(fichier, "outils");
  if (!lu) throw new Error(`${fichier} absent: lancer « node update.ts » d'abord (import initial de Praxis)`);
  const { outils: page, source, avertissements } = extraireFacil(html);
  const { outils, resume, relies } = mettreAJour(lu.donnees, page as Outil[], maintenant, ID_FACIL);
  const total = Object.values(resume).reduce((n, noms) => n + noms.length, 0);
  const ecrit = total > 0 || relies > 0;
  if (ecrit) ecrireFichier(fichier, "outils", outils, lu, maintenant);
  const cheminSources = join(dirname(fichier), "sources.json");
  const sourcesLues = lireSiExiste<Source>(cheminSources, "sources");
  const sources = sourcesAvec(sourcesLues?.donnees ?? [], source);
  const sourcesEcrites = JSON.stringify(sources) !== JSON.stringify(sourcesLues?.donnees ?? []);
  if (sourcesEcrites) ecrireFichier(cheminSources, "sources", sources, sourcesLues, maintenant);
  return { resume, ecrit, sourcesEcrites, avertissements };
}

if (import.meta.main) {
  await lancer(async () => {
    const args = process.argv.slice(2);
    const fichierHtml = args.find((a) => a.startsWith("--fichier="))?.slice("--fichier=".length);
    const inconnue = args.find((a) => a.startsWith("--") && !a.startsWith("--fichier=") && a !== "--sans-couleur");
    if (inconnue) throw new Error(`Option inconnue: ${inconnue.split("=")[0]}`);
    const positionnels = args.filter((a) => !a.startsWith("--"));
    const url = positionnels.find((a) => /^https?:\/\//.test(a)) ?? URL_FACIL;
    const fichier = positionnels.find((a) => !/^https?:\/\//.test(a)) ?? "outils.json";
    const sortie = creerCouleurs(couleursActives(process.stdout, process.env, args.includes("--sans-couleur")));
    if (fichierHtml && !existsSync(fichierHtml)) throw new Error(`${fichierHtml}: fichier introuvable`);
    const html = fichierHtml ? readFileSync(fichierHtml, "utf8") : await telechargerFacil(url);
    const maintenant = horodatage();
    const r = synchroniserFacil(fichier, html, maintenant);
    console.log(sortie.attenue(`Source facil (${fichierHtml ?? url}), lue le ${maintenant}`));
    for (const ligne of lignesResume(r.resume, maintenant, sortie)) console.log(ligne);
    for (const a of r.avertissements) console.error(sortie.jaune(`Avertissement: ${a}`));
    if (r.ecrit) console.log(`${sortie.vert(fichier)} mis à jour`);
    if (r.sourcesEcrites) console.log(`${sortie.vert(join(dirname(fichier), "sources.json"))} mis à jour`);
    if (r.resume.nouveau.length) console.log(sortie.attenue(`Lancer « node update.ts » pour enrichir les ${r.resume.nouveau.length} outil(s) nouveau(x).`));
  });
}
