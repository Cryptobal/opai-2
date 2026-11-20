import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.describe("@preview asistencia: correcciones", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  for (const ancho of [375, 1280] as const) {
    test(`lista y asistencia hoy ${ancho}px`, async ({ page }, info) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      await entrar(page);
      await page.goto("/asistencia/correcciones");
      await expect(page.getByRole("heading", { name: "Correcciones" })).toBeVisible({ timeout: 60_000 });
      await capturar(page, info, `correcciones-erp-${ancho}`);
      await page.goto("/asistencia");
      await expect(page.getByRole("heading", { name: "Asistencia de hoy" })).toBeVisible({ timeout: 60_000 });
      await capturar(page, info, `asistencia-hoy-acciones-${ancho}`);
    });
  }
});