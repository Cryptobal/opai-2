import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { name: "acceso", include: ["**/*.test.ts"], passWithNoTests: true },
});
