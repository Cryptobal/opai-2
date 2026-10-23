import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

import { baseConfig, soloComponentesDelDs } from "../../eslint.base.mjs";

export default defineConfig([
  ...baseConfig,
  ...nextVitals,
  ...nextTs,
  // Pantallas de la app: solo componentes del DS (ADR-017). Aviso mientras se migra la fila
  // seleccionable de elegir-empresa a un componente del DS (Brief 02); después, error.
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        ...soloComponentesDelDs.rules["no-restricted-syntax"].slice(1),
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "e2e/__screenshots__/**"]),
]);
