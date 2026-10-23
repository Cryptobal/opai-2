import { defineConfig } from "vitest/config";

// Un solo `pnpm test` corre todos los proyectos. Cada workspace define el suyo en vitest.config.ts.
export default defineConfig({
  test: {
    projects: [
      "apps/*/vitest.config.ts",
      "packages/*/vitest.config.ts",
      "modules/*/vitest.config.ts",
    ],
  },
});
