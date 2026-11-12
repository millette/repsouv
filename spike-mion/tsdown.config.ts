// Même empaquetage que construire-mion.ts (esbuild), avec tsdown (rolldown) et le plugin RunTypes rolldown.
import { defineConfig } from "tsdown";
import runtypes from "@mionjs/devtools/runtypes/rolldown";

export default defineConfig({
  entry: { mion: "mion-entree.ts", mion2: "mion-entree2.ts" },
  outDir: "sortie-tsdown",
  format: "esm",
  platform: "node",
  dts: false,
  clean: true,
  plugins: [runtypes({ tsconfig: "tsconfig.json" })],
});
