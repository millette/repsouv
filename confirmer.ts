// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Vérification des critères, un par un, avec citation à l'appui (champ criteres_confirmes de outils.json). Appelée par
// update.ts après l'enrichissement, pour chaque outil enrichi qui n'a pas encore de verdict: on donne au modèle (OpenAI,
// le même que l'enrichissement) la page de l'outil et les trois critères, sans le score ni les critères du répertoire,
// et il répond pour chacun « confirmé », « infirmé » ou « indéterminé », avec une citation copiée mot pour mot des textes
// fournis. Une citation introuvable rejette la réponse (redemandée une fois). La règle A précise la lecture de
// « controle »: la nationalité mentionnée suffit. Comme l'enrichissement, la vérification se fait une seule fois par outil
// et les échecs consécutifs sont comptés (echecs_confirmation) jusqu'à l'abandon.
import type { OutilClasse } from "./classify.ts";
import { appelerOpenAI, MAX_ECHECS_PAR_DEFAUT, nouvelEssai, obtenirPage, obtenirValide, type Compteur, type Contenu } from "./enrichir.ts";
import type { Critere, CriteresConfirmes, Outil } from "./extract.ts";
import { CONTROLE, DEPENDANCE, DONNEES, type CritereId } from "./ids.ts";
import { additionner, coutPour, USAGE_VIDE, type Usage } from "./prix.ts";
import { horodatage } from "./temps.ts";
import { pageEnrichissement } from "./logiciel.ts";
import { nomCategorie, type Categorie } from "./categories.ts";

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

export interface Requete {
  nom: string;
  schema: unknown;
  instructions: string;
  messages: string[];
  maxTokens: number;
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

/** Le champ criteres_confirmes d'un outil à partir d'une confirmation validée. */
export function champConfirmes(c: Confirmation, modele: string, date: string): CriteresConfirmes {
  const champ: CriteresConfirmes = { criteres: [], preuves: {}, infirmes: {}, modele, date };
  for (const id of IDS_CRITERES) {
    if (c[id].statut === "confirme") {
      champ.criteres.push(id);
      champ.preuves[id] = c[id].preuve ?? "";
    } else if (c[id].statut === "infirme") champ.infirmes[id] = c[id].preuve ?? "";
  }
  return champ;
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
 * Règle A, précision de lecture de « controle » ajoutée aux consignes après sa définition (criteres.json, texte des auteurs
 * du répertoire, n'est jamais modifié): la nationalité mentionnée suffit. Sans elle, deux modèles divergeaient sur 21 outils
 * sur 57 (l'un répondait « indéterminé » à la seule nationalité, l'autre « confirmé »).
 */
export const REGLE_A =
  "« confirme » si les textes indiquent que l'outil est canadien ou québécois (conçu, édité ou exploité par une entreprise ou un organisme du Canada ou du Québec): la nationalité mentionnée suffit comme preuve, sans exiger de détail sur la propriété. « infirme » si les textes indiquent une origine étrangère (par exemple « d'origine internationale » ou « non canadien ») ou une filiale d'une organisation étrangère, même si l'outil est offert au Canada. « indetermine » si les textes ne mentionnent aucune nationalité.";

export function instructions(criteres: Critere[] = []): string {
  const definitions = IDS_CRITERES.map((id) => {
    const c = criteres.find((x) => x.id === id);
    return `- ${id}${c ? ` (${c.titre}): ${c.description}` : ""}`;
  }).join("\n");
  return `Tu vérifies, pour un outil numérique, si chacun des trois critères de souveraineté numérique est satisfait, d'après les seuls textes fournis (description du répertoire, titre, méta-description et extrait de la page de l'outil).
Quand « instance_de » est présent, l'outil est un service hébergé par un tiers, instance du logiciel libre nommé, et la page fournie (« page_lue ») est celle de ce logiciel: juge le service d'après ce que les textes disent du logiciel et de son hébergement.

Les trois critères:
${definitions}

Précision pour ${CONTROLE}: ${REGLE_A}

Pour chaque critère, réponds par un statut:
- "confirme": les textes établissent que le critère est satisfait;
- "infirme": les textes établissent qu'il ne l'est pas;
- "indetermine": les textes ne permettent pas de conclure (ne devine pas, n'utilise pas ce que tu sais de l'outil).

Pour "confirme" et "infirme", « preuve » est une citation copiée mot pour mot (au plus ${LONGUEUR_MAX_PREUVE} caractères) d'un des textes fournis. Pour "indetermine", « preuve » vaut null. Une citation qui ne se trouve pas dans les textes fournis rend la réponse invalide.`;
}

/** Les textes de l'outil dans lesquels une citation doit se trouver. */
export const textesSource = (outil: Outil, contenu: Contenu): string[] => [outil.description, contenu.titre, contenu.meta_description, contenu.extrait];

export function requeteOutil(outil: Outil, contenu: Contenu, criteres: Critere[], rappel?: string, categories?: readonly Categorie[]): Requete {
  const messages = [
    JSON.stringify({
      nom: outil.nom,
      categorie: nomCategorie(categories, outil.categorie),
      lien: outil.lien,
      ...(outil.instance_de && { instance_de: outil.instance_de, page_lue: pageEnrichissement(outil) }),
      description: outil.description,
      page: { titre: contenu.titre, meta_description: contenu.meta_description, extrait: contenu.extrait },
    }),
  ];
  if (rappel) messages.push(`Ta tentative précédente a été rejetée: ${rappel}. Corrige ce problème.`);
  return { nom: "confirmation_criteres", schema: schemaConfirmation(), instructions: instructions(criteres), messages, maxTokens: 4000 };
}

// ---------- boucle ----------

/** Un outil enrichi qui n'a pas encore de verdict. */
export const aConfirmer = (o: Outil) => !o.removed && !!o.description_longue && !o.criteres_confirmes;
/** true si l'outil a atteint le nombre maximal d'échecs consécutifs de vérification. */
export const abandonneConfirmation = (o: Outil, maxEchecs: number = MAX_ECHECS_PAR_DEFAUT) => (o.echecs_confirmation ?? 0) >= maxEchecs;

/** Produit une réponse brute (non validée) pour une requête. */
export type Confirmateur = (requete: Requete) => Promise<unknown>;

export const confirmateurOpenAI = (cle: string, modele: string, compteur?: Compteur): Confirmateur => (requete) => appelerOpenAI(cle, modele, requete, compteur);

export interface OptionsConfirmation {
  confirmer: Confirmateur;
  criteres: Critere[];
  /** Nom du modèle inscrit dans criteres_confirmes. */
  modele: string;
  /** Confirmateur du modèle de repli, qui reprend une réponse rejetée, et le nom inscrit dans ce cas. */
  confirmerRepli?: Confirmateur;
  modeleRepli?: string;
  categories?: readonly Categorie[];
  /** Contenu de la page de l'outil; par défaut, téléchargé. */
  lire?: (url: string) => Promise<Contenu | null>;
  maxEchecs?: number;
  horloge?: () => string;
  /** Appelé après chaque outil vérifié, et après chaque échec (compteur), pour persister l'état. */
  apresChaque?: (outils: OutilClasse[]) => void;
  debut?: (nom: string) => void;
  progression?: (traites: number) => void;
  journal?: (message: string, niveau?: "info" | "succes" | "avertissement" | "erreur") => void;
}

export interface ResultatConfirmation {
  confirmes: string[];
  erreurs: { nom: string; message: string }[];
  abandonnes: string[];
}

/** Vérifie les critères des outils à confirmer (voir aConfirmer), en place, un outil à la fois. */
export async function confirmerOutils(outils: OutilClasse[], options: OptionsConfirmation): Promise<ResultatConfirmation> {
  const { confirmer, criteres, modele, maxEchecs = MAX_ECHECS_PAR_DEFAUT, horloge = horodatage } = options;
  const lire = options.lire ?? (await import("./enrichir.ts")).lireContenu;
  const journal = options.journal ?? (() => {});
  const resultat: ResultatConfirmation = { confirmes: [], erreurs: [], abandonnes: [] };
  let traites = 0;
  for (const [i, outil] of outils.entries()) {
    if (!aConfirmer(outil)) continue;
    if (abandonneConfirmation(outil, maxEchecs)) {
      resultat.abandonnes.push(outil.nom);
      continue;
    }
    options.debut?.(outil.nom);
    try {
      const { contenu, probleme } = await obtenirPage(pageEnrichissement(outil), lire);
      if (!contenu || probleme) throw new Error(`${probleme ?? "page inaccessible"}; critères non vérifiés`);
      let parRepli = false;
      const confirmation = await obtenirValide(
        (rappel) => confirmer(requeteOutil(outil, contenu, criteres, rappel, options.categories)),
        (brut) => validerConfirmation(brut, textesSource(outil, contenu)),
        (raison) => journal(`  ${outil.nom}: réponse rejetée (${raison}), ${nouvelEssai(options.confirmerRepli)}`, "avertissement"),
        options.confirmerRepli && ((rappel) => { parRepli = true; return options.confirmerRepli!(requeteOutil(outil, contenu, criteres, rappel, options.categories)); }),
      );
      const { echecs_confirmation: _echecs, ...sansCompteur } = outil;
      outils[i] = { ...sansCompteur, criteres_confirmes: champConfirmes(confirmation, parRepli && options.modeleRepli ? options.modeleRepli : modele, horloge()) };
      resultat.confirmes.push(outil.nom);
      journal(`  ${outil.nom}: ${ensembleConfirme(confirmation).join(", ") || "aucun critère confirmé"}`, "succes");
    } catch (e) {
      const echecs = (outil.echecs_confirmation ?? 0) + 1;
      outils[i] = { ...outil, echecs_confirmation: echecs };
      resultat.erreurs.push({ nom: outil.nom, message: (e as Error).message });
      const suite = echecs >= maxEchecs ? `; abandonné après ${echecs} échec(s) consécutif(s), ne sera plus tenté sans --max-echecs plus élevé` : ` (échec ${echecs} sur ${maxEchecs})`;
      journal(`  ${outil.nom}: ÉCHEC: ${(e as Error).message}${suite}`, "erreur");
    }
    options.apresChaque?.(outils);
    options.progression?.(++traites);
  }
  return resultat;
}

// ---------- estimation du coût ----------

const SORTIE_VERDICT = 500;

/** Borne haute des jetons et du coût pour vérifier `outils`: un appel par outil, avec les consignes et un extrait de page de 6 000 caractères. */
export function estimerCoutConfirmation(outils: Outil[], criteres: Critere[], modele: string, categories?: readonly Categorie[]): { outils: number; usage: Usage; cout: number | null } {
  const extraitMax = "x".repeat(6000);
  const consignes = Math.ceil(instructions(criteres).length / 3);
  let usage: Usage = { ...USAGE_VIDE };
  for (const outil of outils) {
    const fiche = requeteOutil(outil, { titre: outil.nom, meta_description: outil.description, extrait: extraitMax, liens_depot: [] }, criteres, undefined, categories).messages[0]!;
    usage = additionner(usage, { entree: consignes + Math.ceil(fiche.length / 3), sortie: SORTIE_VERDICT, cache_lecture: 0, cache_ecriture: 0, raisonnement: 0 });
  }
  return { outils: outils.length, usage, cout: coutPour(usage, modele) };
}
