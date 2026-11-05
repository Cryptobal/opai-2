import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defineConfig } from "@playwright/test";

// Credenciales de prueba (usuario plataforma de la rama dev) desde el .env.local de la raíz.
const envRaiz = new URL("../../.env.local", import.meta.url);
if (existsSync(envRaiz)) process.loadEnvFile(envRaiz);

// Evidencia visual a 375 y 1024 (y revisión a 1280). No es regresión visual todavía.
export default defineConfig({
  testDir: "./e2e",
  // Las capturas y adjuntos se escriben sin parar mientras corre la prueba; dentro de `apps/web` `next dev` los ve
  // como cambios, recompila y deja el servidor sin responder por decenas de segundos. En CI van fuera del árbol.
  outputDir: process.env["CI"] ? join(tmpdir(), "opai-e2e-resultados") : "test-results",
  globalSetup: "./e2e/calentar.ts",
  timeout: 90_000,
  // `next dev` compila cada ruta en su primera visita y en el runner eso pasa de los 5 s por defecto.
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env["BASE_URL"] ?? "http://localhost:3000",
    // La traza se escribe sin parar en `test-results`, dentro del árbol que vigila `next dev`: cada escritura
    // lo hace recompilar y recargar páginas aún sin hidratar (bucle en `/login`). Se activa solo a pedido.
    trace: process.env["E2E_TRACE"] ? "retain-on-failure" : "off",
    screenshot: "only-on-failure",
  },
  ...(process.env["BASE_URL"]
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:3000/api/health",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
  projects: [
    {
      name: "telefono",
      use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
    { name: "ipad", use: { viewport: { width: 1024, height: 768 } } },
    { name: "desktop", use: { viewport: { width: 1280, height: 860 } } },
  ],
});
