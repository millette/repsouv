// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Confirmation des critères un par un, avec citation vérifiable (piste 1 de l'analyse de classification, voir
// implementation.md). Pour chaque outil enrichi, on donne à une IA la page de l'outil et les trois
// critères (sans le score ni les critères du répertoire), et on lui demande, pour chacun, « confirmé », « infirmé » ou
// « indéterminé », avec une citation copiée mot pour mot des textes fournis. Une citation introuvable rejette la réponse.
// Les jetons et le coût en dollars de chaque appel sont comptés et inscrits dans le fichier de sortie.
//
// Usage: nub confirmer.ts --fournisseur=openai|claude [--modele=M] [--limite=N] [--budget=USD] [--sortie=F] [--regle=A] [--liste=noms.json] [--dry-run] [outils.json]
//   - openai : API OpenAI (Responses), clé OPENAI_API_KEY (.env); modèle par défaut: celui de l'enrichissement.
//   - claude : CLI `claude -p` (aucune clé ANTHROPIC_API_KEY requise: utilise la session Claude Code), isolée du projet
//              (--strict-mcp-config, --setting-sources "", aucun outil). Le coût est celui que rapporte la CLI (prix catalogue).
//   - --budget : arrêt avant l'appel suivant quand le coût cumulé l'atteint (15 $ par défaut).
//   - --regle=A ajoute aux consignes une précision de lecture d'un critère (voir REGLES); --liste=F limite aux outils nommés dans F (tableau JSON).
//   - La sortie est reprise: les outils déjà confirmés dans le fichier de sortie ne sont pas redemandés (ni repayés).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { lancer } from "./cli.ts";
import type { OutilClasse } from "./classify.ts";
import { MODELE_PAR_DEFAUT, lireContenu, obtenirPage, type Contenu } from "./enrichir.ts";
import type { Critere } from "./extract.ts";
import { lireFichier } from "./fichiers.ts";
import { CONTROLE, DEPENDANCE, DONNEES, type CritereId } from "./ids.ts";

export const IDS_CRITERES: readonly CritereId[] = [DONNEES, CONTROLE, DEPENDANCE];
export type Statut = "confirme" | "infirme" | "indetermine";
const STATUTS: readonly Statut[] = ["confirme", "infirme", "indetermine"];
export interface Verdict {
  statut: Statut;
  /** Citation copiée mot pour mot d'un des textes fournis; null seulement quand le statut est « indetermine ». */
  preuve: string | null;
}
export type Confirmation = Record<CritereId, Verdict>;

export const LONGUEUR_MAX_PREUVE = 300;

/** Jetons d'un appel; `entree` comprend les jetons en cache (lus ou écrits). */
export interface Usage {
  entree: number;
  sortie: number;
  cache_lecture: number;
  cache_ecriture: number;
}
export interface Appel {
  contenu: unknown;
  usage: Usage;
  cout_usd: number;
}
export interface Requete {
  nom: string;
  schema: unknown;
  instructions: string;
  messages: string[];
  maxTokens: number;
}
export interface Fournisseur {
  nom: string;
  modele: string;
  appeler(requete: Requete): Promise<Appel>;
}

/** Prix en dollars par million de jetons (pages de tarifs OpenAI et Anthropic, consultées le 2026-11-12). */
export interface Prix {
  entree: number;
  cache_lecture: number;
  sortie: number;
}
export const PRIX: Readonly<Record<string, Prix>> = {
  "gpt-6-astra": { entree: 10, cache_lecture: 1, sortie: 50 },
  "gpt-6.1-sol": { entree: 2, cache_lecture: 0.1, sortie: 10 },
  "gpt-6.1-terra": { entree: 1, cache_lecture: 0.05, sortie: 5 },
  "gpt-6-luna": { entree: 0.1, cache_lecture: 0.01, sortie: 0.5 },
  "claude-fable-5-2": { entree: 8, cache_lecture: 0.2, sortie: 40 },
  "claude-opus-5-5": { entree: 4, cache_lecture: 0.2, sortie: 20 },
  "claude-sonnet-5-5": { entree: 2, cache_lecture: 0.1, sortie: 10 },
  "claude-haiku-5-5": { entree: 0.1, cache_lecture: 0.01, sortie: 0.5 },
};

/** Coût d'un appel OpenAI: entrées non mises en cache, entrées en cache et sorties (les jetons de raisonnement sont facturés comme sorties). */
export function coutOpenAI(usage: Usage, prix: Prix): number {
  return ((usage.entree - usage.cache_lecture) * prix.entree + usage.cache_lecture * prix.cache_lecture + usage.sortie * prix.sortie) / 1e6;
}

// ---------- validation ----------

/** Minuscules, espaces réduits, apostrophes et guillemets droits: la comparaison d'une citation ignore la typographie. */
export function normaliserTexte(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[’‘ʼ]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

/** Valide une réponse brute; `sources` sont les textes dans lesquels chaque citation doit se trouver. Lève une erreur dont le message dit pourquoi. */
export function validerConfirmation(brut: unknown, sources: string[]): Confirmation {
  const criteres = (brut as { criteres?: unknown } | null)?.criteres;
  if (typeof criteres !== "object" || criteres === null || Array.isArray(criteres)) throw new Error("objet « criteres » attendu");
  const inconnu = Object.keys(criteres).find((k) => !IDS_CRITERES.includes(k as CritereId));
  if (inconnu) throw new Error(`critère inconnu: ${inconnu}`);
  const normalisees = sources.map(normaliserTexte);
  const confirmation = {} as Confirmation;
  for (const id of IDS_CRITERES) {
    const v = (criteres as Record<string, { statut?: unknown; preuve?: unknown } | undefined>)[id];
    if (!v) throw new Error(`critère manquant: ${id}`);
    if (!STATUTS.includes(v.statut as Statut)) throw new Error(`statut invalide pour ${id} (confirme, infirme ou indetermine attendu)`);
    const statut = v.statut as Statut;
    if (statut === "indetermine") {
      if (v.preuve !== null) throw new Error(`preuve interdite pour ${id}: un verdict indetermine n'a pas de citation (preuve: null)`);
      confirmation[id] = { statut, preuve: null };
      continue;
    }
    if (typeof v.preuve !== "string" || v.preuve.trim() === "") throw new Error(`preuve obligatoire pour ${id}: une citation exacte des textes fournis`);
    if (v.preuve.length > LONGUEUR_MAX_PREUVE) throw new Error(`preuve trop longue pour ${id} (${v.preuve.length} caractères, ${LONGUEUR_MAX_PREUVE} au plus)`);
    const cherchee = normaliserTexte(v.preuve);
    if (!normalisees.some((t) => t.includes(cherchee))) throw new Error(`preuve introuvable dans les textes fournis pour ${id}`);
    confirmation[id] = { statut, preuve: v.preuve };
  }
  return confirmation;
}

/** Les critères confirmés, dans l'ordre de `IDS_CRITERES`. */
export const ensembleConfirme = (c: Confirmation): CritereId[] => IDS_CRITERES.filter((id) => c[id].statut === "confirme");

/** Accord entre paires d'ensembles: nombre d'ensembles identiques et Jaccard moyen (deux ensembles vides: 1). */
export function accordEnsembles(paires: [string[], string[]][]): { exact: number; total: number; jaccard: number } {
  let exact = 0;
  let somme = 0;
  for (const [a, b] of paires) {
    const union = new Set([...a, ...b]).size;
    const commun = a.filter((x) => b.includes(x)).length;
    if (a.length === b.length && commun === a.length) exact++;
    somme += union === 0 ? 1 : commun / union;
  }
  return { exact, total: paires.length, jaccard: paires.length ? somme / paires.length : 0 };
}

// ---------- requête ----------

export function schemaConfirmation() {
  const verdict = {
    type: "object",
    properties: { statut: { type: "string", enum: [...STATUTS] }, preuve: { type: ["string", "null"] } },
    required: ["statut", "preuve"],
    additionalProperties: false,
  };
  return {
    type: "object",
    properties: { criteres: { type: "object", properties: Object.fromEntries(IDS_CRITERES.map((id) => [id, verdict])), required: [...IDS_CRITERES], additionalProperties: false } },
    required: ["criteres"],
    additionalProperties: false,
  };
}

/**
 * Précisions de lecture d'un critère, ajoutées aux consignes après sa définition (criteres.json, texte des auteurs du répertoire,
 * n'est jamais modifié). Règle A: la nationalité mentionnée suffit pour « controle » (essai de l'analyse de classification).
 */
export const REGLES: Readonly<Record<string, Partial<Record<CritereId, string>>>> = {
  A: {
    controle:
      "« confirme » si les textes indiquent que l'outil est canadien ou québécois (conçu, édité ou exploité par une entreprise ou un organisme du Canada ou du Québec): la nationalité mentionnée suffit comme preuve, sans exiger de détail sur la propriété. « infirme » si les textes indiquent une origine étrangère (par exemple « d'origine internationale » ou « non canadien ») ou une filiale d'une organisation étrangère, même si l'outil est offert au Canada. « indetermine » si les textes ne mentionnent aucune nationalité.",
  },
};

export function instructions(criteres: Critere[] = [], precisions: Partial<Record<CritereId, string>> = {}): string {
  const definitions = IDS_CRITERES.map((id) => {
    const c = criteres.find((x) => x.id === id);
    return `- ${id}${c ? ` (${c.titre}): ${c.description}` : ""}`;
  }).join("\n");
  const complements = IDS_CRITERES.filter((id) => precisions[id]).map((id) => `Précision pour ${id}: ${precisions[id]}`).join("\n");
  return `Tu vérifies, pour un outil numérique, si chacun des trois critères de souveraineté numérique est satisfait, d'après les seuls textes fournis (description du répertoire, titre, méta-description et extrait de la page de l'outil).

Les trois critères:
${definitions}
${complements ? `\n${complements}\n` : ""}
Pour chaque critère, réponds par un statut:
- "confirme": les textes établissent que le critère est satisfait;
- "infirme": les textes établissent qu'il ne l'est pas;
- "indetermine": les textes ne permettent pas de conclure (ne devine pas, n'utilise pas ce que tu sais de l'outil).

Pour "confirme" et "infirme", « preuve » est une citation copiée mot pour mot (au plus ${LONGUEUR_MAX_PREUVE} caractères) d'un des textes fournis. Pour "indetermine", « preuve » vaut null. Une citation qui ne se trouve pas dans les textes fournis rend la réponse invalide.`;
}

/** Les textes de l'outil dans lesquels une citation doit se trouver. */
export const textesSource = (outil: OutilClasse, contenu: Contenu): string[] => [outil.description, contenu.titre, contenu.meta_description, contenu.extrait];

export function requeteOutil(outil: OutilClasse, contenu: Contenu, criteres: Critere[] | undefined, rappel?: string, precisions?: Partial<Record<CritereId, string>>): Requete {
  const messages = [
    JSON.stringify({
      nom: outil.nom,
      categorie: outil.categorie,
      lien: outil.lien,
      description: outil.description,
      page: { titre: contenu.titre, meta_description: contenu.meta_description, extrait: contenu.extrait },
    }),
  ];
  if (rappel) messages.push(`Ta tentative précédente a été rejetée: ${rappel}. Corrige ce problème.`);
  return { nom: "confirmation_criteres", schema: schemaConfirmation(), instructions: instructions(criteres, precisions), messages, maxTokens: 4000 };
}

// ---------- boucle ----------

export interface Resultat {
  nom: string;
  lien: string;
  tentatives: number;
  confirmation?: Confirmation;
  echec?: string;
  usage?: Usage;
  cout_usd?: number;
}
export interface Totaux extends Usage {
  appels: number;
  cout_usd: number;
  echecs: number;
}
export interface OptionsConfirmation {
  fournisseur: Fournisseur;
  lirePage: (url: string) => Promise<Contenu | null>;
  criteres?: Critere[];
  /** Précisions de lecture de certains critères (voir REGLES). */
  precisions?: Partial<Record<CritereId, string>>;
  limite?: number;
  budgetUsd?: number;
  journal?: (message: string) => void;
  /** Appelée après chaque outil (pour écrire la sortie au fur et à mesure). */
  apres?: (resultat: Resultat, totaux: Totaux) => void;
}

const sommeUsage = (a: Usage, b: Usage): Usage => ({
  entree: a.entree + b.entree,
  sortie: a.sortie + b.sortie,
  cache_lecture: a.cache_lecture + b.cache_lecture,
  cache_ecriture: a.cache_ecriture + b.cache_ecriture,
});
const vide: Usage = { entree: 0, sortie: 0, cache_lecture: 0, cache_ecriture: 0 };


/** Totaux d'une liste de résultats (par exemple tout le contenu d'un fichier de sortie repris en plusieurs exécutions). */
export function totauxDe(resultats: Resultat[]): Totaux {
  const t: Totaux = { appels: 0, ...vide, cout_usd: 0, echecs: 0 };
  for (const r of resultats) {
    t.appels += r.tentatives;
    if (r.usage) Object.assign(t, sommeUsage(t, r.usage));
    t.cout_usd += r.cout_usd ?? 0;
    if (r.echec) t.echecs++;
  }
  t.cout_usd = Math.round(t.cout_usd * 1e9) / 1e9;
  return t;
}
export async function confirmerOutils(
  outils: OutilClasse[],
  options: OptionsConfirmation,
): Promise<{ resultats: Resultat[]; totaux: Totaux; arret: "budget" | null }> {
  const { fournisseur, lirePage, criteres, precisions, budgetUsd, journal } = options;
  const resultats: Resultat[] = [];
  const totaux: Totaux = { appels: 0, ...vide, cout_usd: 0, echecs: 0 };
  const budgetAtteint = () => budgetUsd !== undefined && totaux.cout_usd >= budgetUsd;
  let arret: "budget" | null = null;

  for (const outil of options.limite === undefined ? outils : outils.slice(0, options.limite)) {
    if (budgetAtteint()) {
      arret = "budget";
      journal?.(`Budget atteint (${totaux.cout_usd.toFixed(4)} $): arrêt avant ${outil.nom}`);
      break;
    }
    const resultat: Resultat = { nom: outil.nom, lien: outil.lien, tentatives: 0 };
    const { contenu, probleme } = await obtenirPage(outil.lien, lirePage);
    if (!contenu || probleme) {
      resultat.echec = probleme ?? "page inaccessible";
    } else {
      let rappel: string | undefined;
      let usage = vide;
      let cout = 0;
      for (let essai = 1; essai <= 2; essai++) {
        if (essai === 2 && budgetAtteint()) {
          resultat.echec = `budget atteint avant la deuxième tentative (${rappel})`;
          break;
        }
        resultat.tentatives = essai;
        try {
          const appel = await fournisseur.appeler(requeteOutil(outil, contenu, criteres, rappel, precisions));
          usage = sommeUsage(usage, appel.usage);
          cout += appel.cout_usd;
          totaux.appels++;
          totaux.cout_usd += appel.cout_usd;
          Object.assign(totaux, sommeUsage(totaux, appel.usage));
          resultat.confirmation = validerConfirmation(appel.contenu, textesSource(outil, contenu));
          delete resultat.echec;
          break;
        } catch (e) {
          rappel = (e as Error).message;
          resultat.echec = rappel;
        }
      }
      resultat.usage = usage;
      resultat.cout_usd = cout;
    }
    if (resultat.echec) totaux.echecs++;
    resultats.push(resultat);
    journal?.(`${outil.nom}: ${resultat.confirmation ? ensembleConfirme(resultat.confirmation).join("+") || "aucun critère confirmé" : `échec (${resultat.echec})`}${resultat.cout_usd ? ` [${resultat.cout_usd.toFixed(4)} $]` : ""}`);
    options.apres?.(resultat, totaux);
  }
  return { resultats, totaux, arret };
}

/** Les outils dont le nom est dans la liste, dans l'ordre du répertoire; un nom absent du répertoire est une erreur. */
export function selectionnerOutils(outils: OutilClasse[], noms: string[]): OutilClasse[] {
  const connus = new Set(outils.map((o) => o.nom));
  const inconnu = noms.find((n) => !connus.has(n));
  if (inconnu !== undefined) throw new Error(`outil inconnu: ${inconnu}`);
  const voulus = new Set(noms);
  return outils.filter((o) => voulus.has(o.nom));
}

// ---------- fournisseurs ----------

export function fournisseurOpenAI(cle: string, modele: string): Fournisseur {
  const prix = PRIX[modele];
  return {
    nom: "openai",
    modele,
    async appeler(requete) {
      const reponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${cle}`, "content-type": "application/json" },
        signal: AbortSignal.timeout(180_000),
        body: JSON.stringify({
          model: modele,
          input: [{ role: "developer", content: requete.instructions }, ...requete.messages.map((content) => ({ role: "user", content }))],
          text: { format: { type: "json_schema", name: requete.nom, strict: true, schema: requete.schema } },
          max_output_tokens: requete.maxTokens,
        }),
      });
      const corps = (await reponse.json().catch(() => ({}))) as Record<string, any>;
      if (!reponse.ok) throw new Error(`OpenAI HTTP ${reponse.status}: ${corps.error?.message ?? "erreur inconnue"}`);
      const u = corps.usage ?? {};
      const usage: Usage = { entree: u.input_tokens ?? 0, sortie: u.output_tokens ?? 0, cache_lecture: u.input_tokens_details?.cached_tokens ?? 0, cache_ecriture: 0 };
      // Les jetons sont facturés même si la réponse est inutilisable: on les rapporte dans l'erreur pour qu'ils restent comptés.
      const message = (corps.output ?? []).filter((o: any) => o.type === "message").flatMap((o: any) => o.content ?? []);
      const texte = message.find((c: any) => c.type === "output_text")?.text;
      if (corps.status === "incomplete" || typeof texte !== "string") throw new Error(`réponse inutilisable (${corps.incomplete_details?.reason ?? "sans texte"})`);
      return { contenu: JSON.parse(texte), usage, cout_usd: prix ? coutOpenAI(usage, prix) : NaN };
    },
  };
}

/** Lit la sortie JSON de `claude -p --output-format json`: contenu structuré, jetons et coût (prix catalogue) rapportés par la CLI. */
export function lireSortieClaude(texte: string): Appel {
  const s = JSON.parse(texte) as Record<string, any>;
  if (s.is_error) throw new Error(`claude: ${(s.errors ?? [s.result ?? "erreur inconnue"]).join("; ")}`);
  const contenu = s.structured_output ?? JSON.parse(String(s.result));
  const usage: Usage = { entree: 0, sortie: 0, cache_lecture: 0, cache_ecriture: 0 };
  for (const m of Object.values(s.modelUsage ?? {}) as Record<string, number>[]) {
    usage.entree += (m.inputTokens ?? 0) + (m.cacheReadInputTokens ?? 0) + (m.cacheCreationInputTokens ?? 0);
    usage.sortie += m.outputTokens ?? 0;
    usage.cache_lecture += m.cacheReadInputTokens ?? 0;
    usage.cache_ecriture += m.cacheCreationInputTokens ?? 0;
  }
  return { contenu, usage, cout_usd: Number(s.total_cost_usd) };
}

export function fournisseurClaude(modele: string): Fournisseur {
  return {
    nom: "claude",
    modele,
    appeler(requete) {
      return new Promise((resolve, reject) => {
        const enfant = spawn(
          "claude",
          ["-p", "--output-format", "json", "--json-schema", JSON.stringify(requete.schema), "--model", modele, "--tools", "", "--no-session-persistence",
            "--disable-slash-commands", "--strict-mcp-config", "--setting-sources", "", "--system-prompt", requete.instructions, "--max-budget-usd", "1"],
          { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"], timeout: 240_000 },
        );
        let sortie = "";
        let erreur = "";
        enfant.stdout.on("data", (d) => (sortie += d));
        enfant.stderr.on("data", (d) => (erreur += d));
        enfant.on("error", reject);
        enfant.on("close", (code) => {
          try {
            resolve(lireSortieClaude(sortie));
          } catch (e) {
            reject(new Error(`claude (code ${code}): ${(e as Error).message}${erreur ? ` ${erreur.trim().slice(0, 200)}` : ""}`));
          }
        });
        enfant.stdin.end(requete.messages.join("\n\n"));
      });
    },
  };
}

// ---------- ligne de commande ----------

const DOSSIER = "confirmations";

if (import.meta.main) {
  await lancer(async () => {
    const args = process.argv.slice(2);
    const option = (nom: string) => args.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
    const connues = ["--dry-run", "--fournisseur", "--modele", "--limite", "--budget", "--sortie", "--regle", "--liste"];
    const inconnue = args.find((a) => a.startsWith("--") && !connues.some((o) => a === o || a.startsWith(`${o}=`)));
    if (inconnue) throw new Error(`Option inconnue: ${inconnue}`);
    const nomFournisseur = option("fournisseur");
    if (nomFournisseur !== "openai" && nomFournisseur !== "claude") throw new Error("--fournisseur=openai ou --fournisseur=claude requis");
    const modele = option("modele") ?? (nomFournisseur === "openai" ? process.env.OPENAI_MODEL || MODELE_PAR_DEFAUT : "claude-fable-5-2");
    const limite = option("limite") ? Number(option("limite")) : undefined;
    const budgetUsd = Number(option("budget") ?? 15);
    const regle = option("regle");
    if (regle !== undefined && !REGLES[regle]) throw new Error(`--regle inconnue: ${regle} (connues: ${Object.keys(REGLES).join(", ")})`);
    const fichierListe = option("liste");
    const fichierOutils = args.find((a) => !a.startsWith("--")) ?? "outils.json";
    const sortie = option("sortie") ?? join(DOSSIER, `confirmations-${nomFournisseur}.json`);
    const criteres = lireFichier<Critere>(join(dirname(fichierOutils), "criteres.json"), "criteres").donnees;

    const deja: Resultat[] = existsSync(sortie) ? (JSON.parse(readFileSync(sortie, "utf8")).resultats as Resultat[]).filter((r) => r.confirmation) : [];
    const faits = new Set(deja.map((r) => r.nom));
    let candidats = lireFichier<OutilClasse>(fichierOutils, "outils").donnees.filter((o) => o.evaluation_enrichie && !o.removed && o.page_lue !== false);
    if (fichierListe) candidats = selectionnerOutils(candidats, JSON.parse(readFileSync(fichierListe, "utf8")) as string[]);
    const outils = candidats.filter((o) => !faits.has(o.nom));
    console.error(`${nomFournisseur} ${modele}: ${outils.length} outil(s) à confirmer (${deja.length} déjà faits), budget ${budgetUsd} $`);
    if (args.includes("--dry-run")) return;
    if (PRIX[modele] === undefined) console.error(`Avertissement: pas de prix connu pour ${modele}${nomFournisseur === "openai" ? ": le coût sera NaN" : ""}`);

    let fournisseur: Fournisseur;
    if (nomFournisseur === "openai") {
      const cle = process.env.OPENAI_API_KEY;
      if (!cle) throw new Error("OPENAI_API_KEY absente (voir .env.example)");
      fournisseur = fournisseurOpenAI(cle, modele);
    } else {
      fournisseur = fournisseurClaude(modele);
    }

    const cache = join(DOSSIER, ".cache", "pages.json");
    const pages: Record<string, Contenu> = existsSync(cache) ? JSON.parse(readFileSync(cache, "utf8")) : {};
    mkdirSync(dirname(cache), { recursive: true });
    mkdirSync(dirname(sortie), { recursive: true });
    const lirePage = async (url: string) => {
      if (!pages[url]) {
        pages[url] = await lireContenu(url);
        writeFileSync(cache, JSON.stringify(pages));
      }
      return pages[url]!;
    };
    const ecrire = (resultats: Resultat[], totaux: Totaux, arret: string | null) =>
      writeFileSync(sortie, `${JSON.stringify({ meta: { fournisseur: nomFournisseur, modele, regle: regle ?? null, prix: PRIX[modele] ?? null, date: new Date().toISOString(), arret }, totaux, resultats }, null, 2)}\n`);

    const nouveaux: Resultat[] = [];
    const resume = await confirmerOutils(outils, {
      fournisseur, lirePage, criteres, ...(regle ? { precisions: REGLES[regle]! } : {}), ...(limite === undefined ? {} : { limite }), budgetUsd,
      journal: (m) => console.error(m),
      apres: (r, t) => { nouveaux.push(r); ecrire([...deja, ...nouveaux], totauxDe([...deja, ...nouveaux]), null); void t; },
    });
    ecrire([...deja, ...resume.resultats], totauxDe([...deja, ...resume.resultats]), resume.arret);
    const t = resume.totaux;
    console.log(`${nomFournisseur} ${modele}: ${resume.resultats.length} outil(s), ${t.appels} appel(s), ${t.entree} jetons en entrée (dont ${t.cache_lecture} lus du cache), ${t.sortie} en sortie, ${t.cout_usd.toFixed(4)} $, ${t.echecs} échec(s)${resume.arret ? ` (arrêt: ${resume.arret})` : ""}`);
    console.log(`Sortie: ${sortie}`);
  });
}
