// Cas non couverts: récursion, union avec Date, Map, union objet/Date, et portable: true.
// Pour chaque type: schémas (RunTypes, RunTypes portable, ts-json-schema-generator), ce que l'encodeur
// RunTypes écrit réellement, puis des échantillons JSON « naturels » validés par Ajv avec chaque schéma.
import { readFileSync } from "node:fs";
import { Ajv } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import formats from "ajv-formats";
import * as mion from "./mion2.mjs";

const addFormats = formats.default;
const ISO = "2026-11-12T10:00:00.000Z";
const tjs = (t: string) => JSON.parse(readFileSync(`schemas/tjs2-${t}.schema.json`, "utf8"));

interface Cas {
  nom: string;
  m: { schema: (o?: unknown) => Record<string, unknown>; valide: (v: unknown) => boolean; encoder: (v: never) => unknown; decoder: (s: string) => unknown };
  valeur: unknown; // valeur en mémoire encodée par RunTypes
  echantillons: [string, unknown][]; // [nom, JSON]
}
const cas: Cas[] = [
  { nom: "Noeud", m: mion.noeud as never, valeur: { nom: "a", enfants: [{ nom: "b", enfants: [] }] },
    echantillons: [
      ["récursif valide", { nom: "a", enfants: [{ nom: "b", enfants: [{ nom: "c", enfants: [] }] }] }],
      ["profond invalide (nom: 1)", { nom: "a", enfants: [{ nom: "b", enfants: [{ nom: 1, enfants: [] }] }] }],
    ] },
  { nom: "UnionDate", m: mion.unionDate as never, valeur: { quand: new Date(ISO) },
    echantillons: [
      ["chaîne ISO", { quand: ISO }],
      ["chaîne quelconque", { quand: "hier" }],
      ["nombre", { quand: 5 }],
    ] },
  { nom: "Compteurs", m: mion.compteurs as never, valeur: { valeurs: new Map([["a", 1]]) },
    echantillons: [
      ["Map en objet {a:1}", { valeurs: { a: 1 } }],
      ["Map en paires [[a,1]]", { valeurs: [["a", 1]] }],
      ["valeur invalide {a:'x'}", { valeurs: { a: "x" } }],
    ] },
  { nom: "Melange", m: mion.melange as never, valeur: { contenu: new Date(ISO) },
    echantillons: [
      ["objet naturel", { contenu: { kind: "a", x: 1 } }],
      ["date naturelle (chaîne)", { contenu: ISO }],
      ["objet encodé [0, obj]", { contenu: [0, { kind: "a", x: 1 }] }],
      ["date encodée [1, chaîne]", { contenu: [1, ISO] }],
    ] },
];

const nouvelAjv2020 = () => { const a = addFormats(new Ajv2020({ strict: false })); return a; };
const nouvelAjv7 = () => addFormats(new Ajv({ strict: false }));
const verdict = (f: (j: unknown) => boolean, j: unknown) => { try { return f(j) ? "oui" : "non"; } catch (e) { return `ERR`; } };
const court = (o: unknown) => JSON.stringify(o);

for (const c of cas) {
  console.log(`\n================ ${c.nom} ================`);
  const defaut = c.m.schema();
  const portable = c.m.schema({ libraryOptions: { portable: true } });
  const t = tjs(c.nom);
  console.log("schéma RunTypes   :", court(defaut));
  console.log("schéma portable   :", court(portable), court(portable) === court(defaut) ? "(identique)" : "(différent)");
  console.log("schéma TJS        :", court({ ...t, $schema: undefined }));
  const json = c.m.encoder(c.valeur as never);
  console.log("encodeur RunTypes :", typeof json === "string" ? json : court(json));

  const vMion = nouvelAjv2020().compile(defaut);
  const vPort = nouvelAjv2020().compile(portable);
  let vTjs: ((j: unknown) => boolean) | null = null;
  try { vTjs = nouvelAjv7().compile(t) as never; } catch { /* schéma TJS inutilisable */ }

  // Cohérence interne: la sortie de l'encodeur valide-t-elle contre le schéma de RunTypes?
  const sortie = typeof json === "string" ? JSON.parse(json) : json;
  console.log(`sortie de l'encodeur vs schéma RunTypes (Ajv): ${verdict(vMion as never, sortie)} | vs portable: ${verdict(vPort as never, sortie)} | vs TJS: ${vTjs ? verdict(vTjs, sortie) : "ERR"}`);
  // Aller-retour: décoder puis valider.
  let ar = "ERR";
  try { ar = c.m.valide(c.m.decoder(typeof json === "string" ? json : JSON.stringify(json))) ? "oui" : "non"; } catch { /* */ }
  console.log(`aller-retour (décodeur puis validateur): ${ar}`);

  console.log("échantillon | Ajv+RunTypes | Ajv+portable | Ajv+TJS | décodeur+validateur RT");
  for (const [nom, j] of c.echantillons) {
    console.log([nom, verdict(vMion as never, j), verdict(vPort as never, j), vTjs ? verdict(vTjs, j) : "ERR", verdict((x) => c.m.valide(c.m.decoder(JSON.stringify(x))), j)].join(" | "));
  }
}
