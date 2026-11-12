// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Les catégories du répertoire (categories.json): un identifiant (slug du nom), le nom et l'icône tels que la page les
// affiche, et une description en français, générée une seule fois par l'API OpenAI (update.ts) à partir des outils de la
// catégorie. Dans outils.json, chaque outil porte l'identifiant de sa catégorie (champ `categorie`).
import { appelerOpenAI, obtenirValide, problemesMarkdown, type Compteur } from "./enrichir.ts";
import { ecrireFichier, lireFichier, lireSiExiste } from "./fichiers.ts";
import { additionner, coutPour, USAGE_VIDE, type Usage } from "./prix.ts";

export interface Categorie {
  /** Slug du nom (voir slug); référencé par outils[].categorie. */
  id: string;
  nom: string;
  icone: string;
  /** Description en français, générée par IA; absente tant qu'elle n'a pas été produite. */
  description?: string;
}

/** « Gestion d’événements et billetterie » → « gestion-d-evenements-et-billetterie ». */
export function slug(nom: string): string {
  const s = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!s) throw new Error(`identifiant de catégorie vide pour « ${nom} »`);
  return s;
}

/** Les catégories de la page, dans l'ordre d'apparition, sans doublon; les descriptions déjà connues sont conservées. */
export function categoriesDepuis(observees: { nom: string; icone: string }[], existantes: Categorie[]): Categorie[] {
  const vues = new Map<string, Categorie>();
  for (const { nom, icone } of observees) {
    const id = slug(nom);
    const deja = vues.get(id);
    if (deja && deja.nom !== nom) throw new Error(`deux catégories ont le même identifiant « ${id} »: « ${deja.nom} » et « ${nom} »`);
    if (deja) continue;
    const description = existantes.find((c) => c.id === id)?.description;
    vues.set(id, { id, nom, icone, ...(description !== undefined && { description }) });
  }
  return [...vues.values()];
}

export const chargerCategories = (fichier: string): Categorie[] => lireFichier<Categorie>(fichier, "categories").donnees;
/** Écrit categories.json en conservant meta (created_at, updated_at seulement si le contenu change). */
export const sauverCategories = (fichier: string, categories: Categorie[]) => ecrireFichier(fichier, "categories", categories, lireSiExiste<Categorie>(fichier, "categories"));

export const nomCategorie = (categories: readonly Categorie[] | undefined, id: string): string => categories?.find((c) => c.id === id)?.nom ?? id;
export const aDecrire = (c: Categorie) => c.description === undefined;

// ---------- description par IA ----------

const LONGUEUR_MIN = 40;
const LONGUEUR_MAX = 400;

export interface RequeteDescription {
  nom: string;
  schema: unknown;
  instructions: string;
  messages: string[];
  maxTokens: number;
}

export const SCHEMA_DESCRIPTION = { type: "object", properties: { description: { type: "string" } }, required: ["description"], additionalProperties: false };

export function instructionsCategorie(): string {
  return `Tu rédiges, en français, la description d'une catégorie d'un répertoire d'outils numériques destiné aux OSBL des arts et de la culture du Canada français. Tu reçois le nom et l'icône de la catégorie et la liste de ses outils (nom et description courte).

Écris une à trois phrases de texte continu (de ${LONGUEUR_MIN} à ${LONGUEUR_MAX} caractères) qui disent à quels besoins répondent les outils de cette catégorie, de façon factuelle et neutre, sans nommer les outils ni en vanter aucun. Pas de liste, pas de titre, pas de gras, pas de HTML, pas de tiret cadratin, pas d'émoji.`;
}

export function requeteCategorie(categorie: Categorie, outils: { nom: string; description: string }[], rappel?: string): RequeteDescription {
  const messages = [JSON.stringify({ id: categorie.id, nom: categorie.nom, icone: categorie.icone, outils: outils.map((o) => ({ nom: o.nom, description: o.description })) })];
  if (rappel) messages.push(`Ta tentative précédente a été rejetée: ${rappel}. Corrige ce problème.`);
  return { nom: "description_categorie", schema: SCHEMA_DESCRIPTION, instructions: instructionsCategorie(), messages, maxTokens: 1000 };
}

/** Valide la réponse brute et retourne la description nettoyée; lève une erreur dont le message dit pourquoi. */
export function validerDescriptionCategorie(brut: unknown): string {
  const d = (brut as { description?: unknown } | null)?.description;
  if (typeof d !== "string" || !d.trim()) throw new Error("description absente");
  const texte = d.replace(/\s+/g, " ").trim();
  if (texte.length < LONGUEUR_MIN) throw new Error(`description trop courte (${texte.length} caractères, ${LONGUEUR_MIN} au moins)`);
  if (texte.length > LONGUEUR_MAX) throw new Error(`description trop longue (${texte.length} caractères, ${LONGUEUR_MAX} au plus)`);
  if (/^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>)/m.test(texte) || /\*\*|__/.test(texte)) throw new Error("ni titre, ni liste, ni gras (texte continu seulement)");
  const problemes = problemesMarkdown(texte);
  if (problemes.length) throw new Error(problemes.join("; "));
  return texte;
}

export type GenerateurDescription = (requete: RequeteDescription) => Promise<unknown>;
export const generateurDescriptionOpenAI = (cle: string, modele: string, compteur?: Compteur): GenerateurDescription => (requete) => appelerOpenAI(cle, modele, requete, compteur);

export interface OptionsDescriptions {
  generer: GenerateurDescription;
  /** Appelé après chaque catégorie décrite, pour persister categories.json. */
  apresChaque?: (categories: Categorie[]) => void;
  /** Appelé au début de chaque catégorie (son nom), puis après chaque tentative avec le nombre traité: pour une barre de progression. */
  debut?: (nom: string) => void;
  progression?: (traites: number) => void;
  journal?: (message: string, niveau?: "info" | "succes" | "avertissement" | "erreur") => void;
}

/** Décrit en place les catégories sans description; une réponse invalide est redemandée une fois, puis l'échec est consigné. */
export async function decrireCategories(categories: Categorie[], outils: { categorie: string; nom: string; description: string }[], options: OptionsDescriptions): Promise<{ decrites: string[]; erreurs: { nom: string; message: string }[] }> {
  const journal = options.journal ?? (() => {});
  const resultat = { decrites: [] as string[], erreurs: [] as { nom: string; message: string }[] };
  let traites = 0;
  for (const [i, categorie] of categories.entries()) {
    if (!aDecrire(categorie)) continue;
    options.debut?.(categorie.nom);
    const siens = outils.filter((o) => o.categorie === categorie.id);
    try {
      const description = await obtenirValide(
        (rappel) => options.generer(requeteCategorie(categorie, siens, rappel)),
        validerDescriptionCategorie,
        (raison) => journal(`  ${categorie.nom}: réponse rejetée (${raison}), nouvel essai`, "avertissement"),
      );
      categories[i] = { ...categorie, description };
      resultat.decrites.push(categorie.id);
      journal(`  ${categorie.nom}: ${description}`, "succes");
      options.apresChaque?.(categories);
    } catch (e) {
      resultat.erreurs.push({ nom: categorie.nom, message: (e as Error).message });
      journal(`  ${categorie.nom}: ÉCHEC: ${(e as Error).message}`, "erreur");
    }
    options.progression?.(++traites);
  }
  return resultat;
}

/** Borne haute des jetons et du coût pour décrire les catégories sans description: un appel par catégorie. */
export function estimerCoutDescriptions(categories: Categorie[], outils: { categorie: string; nom: string; description: string }[], modele: string): { categories: number; usage: Usage; cout: number | null } {
  const consignes = Math.ceil(instructionsCategorie().length / 3);
  let usage: Usage = { ...USAGE_VIDE };
  let n = 0;
  for (const c of categories.filter(aDecrire)) {
    n++;
    const fiche = requeteCategorie(c, outils.filter((o) => o.categorie === c.id)).messages[0]!;
    usage = additionner(usage, { entree: consignes + Math.ceil(fiche.length / 3), sortie: 400, cache_lecture: 0, cache_ecriture: 0 });
  }
  return { categories: n, usage, cout: coutPour(usage, modele) };
}
