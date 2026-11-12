// Complément: que fait le décodeur d'une propriété inconnue, et checkUnknowns la détecte-t-il?
import * as mion from "./mion.mjs";
const json = { id: "m9", cree: "2026-11-12T10:00:00.000Z", extra: 1, contenu: { kind: "texte", texte: "x" } };
const decode = mion.decoderJson(JSON.stringify(json));
console.log("décodé:", decode, "| cree est une Date:", (decode as { cree: unknown }).cree instanceof Date);
console.log("estMessage(décodé):", mion.estMessage(decode));
console.log("estMessageStrict(décodé):", mion.estMessageStrict(decode));
console.log("estMessageStrict(objet avec extra, cree en Date):", mion.estMessageStrict({ ...json, cree: new Date(json.cree) }));
