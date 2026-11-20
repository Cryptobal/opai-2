import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.describe("@preview asistencia: reportes DT", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("listado y vista previa a 375 y 1280", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/asistencia/reportes-dt");
    await expect(page.getByRole("heading", { name: "Reportes DT" })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    await capturar(page, info, "reportes-dt-375");
    await page.setViewportSize({ width: 1280, height: 800 });
    await capturar(page, info, "reportes-dt-1280");
  });
});