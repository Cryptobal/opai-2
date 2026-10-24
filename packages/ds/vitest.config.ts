import { defineConfig } from "vitest/config";

/**
 * Lógica pura del DS (geometría del mapa, fechas) y marcado del servidor de algunos controles. La
 * interacción de los componentes (clic, teclado, foco) se verifica en /ds con Playwright.
 */
export default defineConfig({ test: { name: "ds", include: ["src/**/*.test.ts"] } });
