// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Empaquette generer-schemas.ts avec le plugin mion RunTypes (rolldown): le plugin remplace les appels
// createJsonSchemaFn<T>() par le code généré à partir des types. Sortie: dist/generer-schemas.mjs.
import { defineBuildConfig } from "obuild/config";
import runtypes from "@mionjs/devtools/runtypes/rolldown";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: "generer-schemas.ts",
      outDir: "dist",
      dts: false,
      rolldown: { plugins: [runtypes({ tsconfig: "tsconfig.schemas.json" })] },
    },
  ],
});
