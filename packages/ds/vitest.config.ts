import { defineConfig } from "vitest/config";

/** Lógica pura del DS (geometría del mapa, fechas); los componentes se verifican en /ds con Playwright. */
export default defineConfig({ test: { name: "ds", include: ["src/**/*.test.ts"] } });
