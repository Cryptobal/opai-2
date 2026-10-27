import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

import { baseConfig, prismaOnlyInDb, soloComponentesDelDs } from "../../eslint.base.mjs";
import permitidos from "./paridad-permitidos.json" with { type: "json" };

/** Los segmentos de Next (`[slug]`, `(auth)`) no son comodines: se escapan para que coincidan literalmente. */
const literal = (ruta) => ruta.replace(/[[\]()]/g, "\\$&");

export default defineConfig([
  ...baseConfig,
  ...nextVitals,
  ...nextTs,
  // Pantallas de la app: solo componentes del DS (ADR-017), en error desde el Brief 02.
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...soloComponentesDelDs.rules["no-restricted-syntax"].slice(1),
      ],
    },
  },
  // Paridad UI↔MCP (ADR-004, ADR-034 §4): las pantallas no leen la base; todo pasa por capacidades.
  {
    files: ["app/**/*.ts", "app/**/*.tsx", "lib/**/*.ts", "lib/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [prismaOnlyInDb],
          patterns: [
            {
              group: ["@opai/db", "@opai/db/*"],
              message:
                "Una pantalla no lee la base: invoca una capacidad (ADR-004). Si es infraestructura, agrégala a apps/web/paridad-permitidos.json con su motivo.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [...permitidos.infraestructuraConDb, ...permitidos.infraestructuraLibConDb].map((a) =>
      literal(a.archivo),
    ),
    rules: { "no-restricted-imports": "off" },
  },
  // Service worker propio (PWA, ADR-044): entorno de service worker, script clásico.
  {
    files: ["public/sw.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.serviceworker } },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "e2e/__screenshots__/**"]),
]);
