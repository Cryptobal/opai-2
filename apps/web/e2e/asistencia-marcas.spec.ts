import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.describe("@preview asistencia: marcas ERP", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("lista y detalle a 375 y 1280", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/asistencia/marcas");
    await expect(page.getByRole("heading", { name: "Marcas" })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    await capturar(page, info, "marcas-375");
    await page.setViewportSize({ width: 1280, height: 800 });
    await capturar(page, info, "marcas-1280");
  });
});