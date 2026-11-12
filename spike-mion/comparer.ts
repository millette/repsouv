// Compare, sur les mêmes échantillons JSON, ce qu'acceptent: Ajv+schéma ts-json-schema-generator,
// Ajv+schéma RunTypes, et les validateurs RunTypes eux-mêmes (sur le JSON brut, puis après décodage).
import { readFileSync } from "node:fs";
import { Ajv } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import formats from "ajv-formats";
const addFormats = formats.default;
import * as mion from "./mion.mjs";

interface Echantillon { nom: string; attendu: boolean; json: unknown }
const echantillons = JSON.parse(readFileSync("echantillons.json", "utf8")) as Echantillon[];
const schemaTjs = JSON.parse(readFileSync("schemas/tjs.schema.json", "utf8"));
const schemaMion = mion.schemaMion();

const ajvTjs = addFormats(new Ajv({ strict: true }));
const validerTjs = ajvTjs.compile(schemaTjs);

// Le schéma RunTypes porte un mot-clé non standard (jsType): Ajv strict le refuse.
let strictMion = "accepté";
try { addFormats(new Ajv2020({ strict: true })).compile(schemaMion); } catch (e) { strictMion = `refusé (${(e as Error).message})`; }
const ajvMion = addFormats(new Ajv2020({ strict: false }));
const validerMion = ajvMion.compile(schemaMion);
// Variante: on déclare jsType comme mot-clé connu au lieu de désactiver le mode strict.
const ajvMion2 = addFormats(new Ajv2020({ strict: true }));
ajvMion2.addKeyword("jsType");
const validerMion2 = ajvMion2.compile(schemaMion);

const rt = {
  brut: (j: unknown) => mion.estMessage(j),
  decode: (j: unknown) => { try { return mion.estMessage(mion.decoderJson(JSON.stringify(j))); } catch { return false; } },
};

const ok = (b: boolean) => (b ? "oui" : "non");
const colonnes = ["nom", "attendu", "Ajv+TJS", "Ajv+Mion", "Ajv+Mion(kw)", "RT brut", "RT décodé"];
const lignes = echantillons.map((e) => [
  e.nom, ok(e.attendu), ok(validerTjs(e.json)), ok(validerMion(e.json)), ok(validerMion2(e.json)), ok(rt.brut(e.json)), ok(rt.decode(e.json)),
]);
console.log(`Ajv strict + schéma RunTypes (mot-clé jsType): ${strictMion}\n`);
console.log(colonnes.join(" | "));
for (const l of lignes) console.log(l.join(" | "));

const ecarts = (i: number) => lignes.filter((l) => l[i] !== l[1]).map((l) => l[0]);
console.log("\nÉcarts par rapport à « attendu »:");
for (const [i, nom] of [[2, "Ajv+TJS"], [3, "Ajv+Mion"], [4, "Ajv+Mion(kw)"], [5, "RT brut"], [6, "RT décodé"]] as const) {
  console.log(`- ${nom}: ${ecarts(i).length === 0 ? "aucun" : ecarts(i).join("; ")}`);
}
const dis = lignes.filter((l) => l[2] !== l[3]).map((l) => l[0]);
console.log(`\nDésaccords Ajv+TJS vs Ajv+Mion: ${dis.length === 0 ? "aucun" : dis.join("; ")}`);
const dis2 = lignes.filter((l) => l[3] !== l[6]).map((l) => l[0]);
console.log(`Désaccords schéma RunTypes (Ajv) vs validateur RunTypes (décodé): ${dis2.length === 0 ? "aucun" : dis2.join("; ")}`);
