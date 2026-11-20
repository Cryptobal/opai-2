import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.describe("@preview asistencia: contingencias", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  for (const ancho of [375, 1280] as const) {
    test(`lista ERP ${ancho}px`, async ({ page }, info) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      await entrar(page);
      await page.goto("/asistencia/contingencias");
      await expect(page.getByRole("heading", { name: "Contingencias" })).toBeVisible({ timeout: 60_000 });
      await capturar(page, info, `contingencias-erp-${ancho}`);
    });
  }
});