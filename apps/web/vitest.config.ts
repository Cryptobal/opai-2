import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // 15 s: la primera prueba de cada archivo carga el registro completo de capacidades y, con la CPU
  // compartida de CI, pasaba los 5 s por defecto (mcp-scopes, 17-nov-2026).
  test: { name: "web", include: ["test/**/*.test.ts"], environment: "node", testTimeout: 15_000 },
});
