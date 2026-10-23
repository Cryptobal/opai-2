import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

import { baseConfig, soloComponentesDelDs } from "../../eslint.base.mjs";

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
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "e2e/__screenshots__/**"]),
]);
