// Configuración base de ESLint compartida por todos los workspaces.
// Cada workspace tiene su propio eslint.config.mjs que importa `baseConfig`.
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export const ignores = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/dist/**",
  "**/coverage/**",
  "**/src/generated/**",
  "**/next-env.d.ts",
];

/** Import prohibido fuera de `packages/db`: todo acceso a datos pasa por `@opai/db`. */
export const prismaOnlyInDb = {
  name: "@prisma/client",
  message: "Usa `db.forTenant(tenantId)` de @opai/db. El cliente Prisma crudo solo vive en packages/db.",
};

/** Paquetes que el dominio puro no puede importar. */
export const notInDomain = [
  { name: "next", message: "El dominio es puro: sin Next." },
  { name: "react", message: "El dominio es puro: sin React." },
  { name: "@opai/db", message: "El dominio recibe datos por parámetro, no consulta la base." },
  prismaOnlyInDb,
];

export const baseConfig = tseslint.config(
  { ignores },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      "max-lines": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
      "no-restricted-imports": ["error", { paths: [prismaOnlyInDb] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**"],
    rules: { "max-lines": ["warn", { max: 150, skipBlankLines: true, skipComments: true }] },
  },
  prettier,
);

/** Reglas adicionales para código de dominio puro (packages/domain y modules/*\/domain). */
export const domainConfig = {
  files: ["**/domain/**/*.ts"],
  rules: {
    "no-restricted-imports": ["error", { paths: notInDomain, patterns: ["next/*", "react/*", "@prisma/*"] }],
  },
};
