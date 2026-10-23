import { defineConfig } from "@playwright/test";

// Evidencia visual del DS a 375 y 1024 (Brief 00). No es regresión visual todavía.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: process.env["BASE_URL"] ?? "http://localhost:3000" },
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
  ],
});
