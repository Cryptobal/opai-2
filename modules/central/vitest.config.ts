import { defineConfig } from "vitest/config";

export default defineConfig({ test: { name: "central", include: ["**/*.test.ts"] } });
