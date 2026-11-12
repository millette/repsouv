// Empaquette mion-entree.ts avec le plugin RunTypes (esbuild): sans cette étape, createXxx<T>() ne fonctionne pas.
import { build } from "esbuild";
import runtypes from "@mionjs/devtools/runtypes/esbuild";

await build({
  entryPoints: ["mion-entree.ts"],
  outfile: "mion.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node24",
  plugins: [runtypes({ tsconfig: "tsconfig.json" })],
  logLevel: "info",
});
