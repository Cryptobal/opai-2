import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

test.describe("@preview personas: acceso al portal del trabajador", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");
  test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

  test("la ficha muestra la sección Acceso", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/personas?estado=activa&limite=5");
    await expect(page.getByRole("heading", { name: /Personas/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    const fila = page.locator('a[href^="/personas/"]').first();
    test.skip((await fila.count()) === 0, "Sin personas activas en qa-e2e");
    await fila.click();
    await expect(page.getByRole("heading", { name: "Acceso" })).toBeVisible({ timeout: 60_000 });
    await page.setViewportSize({ width: 1280, height: 900 });
    await capturar(page, info, "personas-ficha-acceso-1280");
    await page.setViewportSize({ width: 375, height: 812 });
    await capturar(page, info, "personas-ficha-acceso-375");
  });
});