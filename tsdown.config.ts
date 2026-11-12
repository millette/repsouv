// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Empaquette generer-schemas.ts avec le plugin mion RunTypes (rolldown): le plugin remplace les appels
// createJsonSchemaFn<T>() par le code généré à partir des types. Sortie: dist/generer-schemas.mjs.
import { defineConfig } from "tsdown";
import runtypes from "@mionjs/devtools/runtypes/rolldown";

export default defineConfig({
  entry: ["generer-schemas.ts"],
  outDir: "dist",
  format: "esm",
  platform: "node",
  dts: false,
  clean: true,
  plugins: [runtypes({ tsconfig: "tsconfig.schemas.json" })],
});
