import { existsSync, readdirSync } from "node:fs";
import { configDefaults, defineConfig } from "vitest/config";

// Unitarios sin conexión. `pnpm test:db` ejecuta por separado todas las suites de Postgres.
export default defineConfig({
  test: {
    maxWorkers: 2,
    projects: [
      "apps/*/vitest.config.ts",
      ...readdirSync(new URL("./packages", import.meta.url))
        .filter((nombre) => !["db", "auth", "capabilities"].includes(nombre))
        .filter((nombre) =>
          existsSync(new URL(`./packages/${nombre}/vitest.config.ts`, import.meta.url)),
        )
        .map((nombre) => `packages/${nombre}/vitest.config.ts`),
      {
        extends: false,
        root: "./packages/db",
        test: { name: "db-unitarios", include: ["test/globales.test.ts", "test/metricas.test.ts"] },
      },
      {
        extends: false,
        root: "./packages/capabilities",
        test: {
          name: "capabilities",
          include: ["test/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "**/*-db.test.ts"],
          fileParallelism: false,
        },
      },
      {
        extends: false,
        root: "./packages/auth",
        test: {
          name: "auth",
          include: ["test/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "**/*-db.test.ts"],
        },
      },
      "modules/*/vitest.config.ts",
    ],
  },
});
