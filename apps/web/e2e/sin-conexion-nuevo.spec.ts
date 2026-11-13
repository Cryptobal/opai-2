import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-335 D4d: en el diseño nuevo, al perder la red aparece la banda «Sin conexión» y se va al volver.
test.describe("@preview diseño nuevo: sin conexión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la banda aparece sin red y se va al reconectar", async ({ page, context }, info) => {
    await entrar(page);
    const url = new URL(page.url()).origin;
    await context.addCookies([{ name: "opai_marco", value: "nuevo", url }]);
    await page.goto("/cuentas");
    await expect(page.locator('div[data-marco="nuevo"]')).toBeVisible({ timeout: 60_000 });
    const banda = page.getByText(/^Sin conexión\./);
    await expect(banda).toHaveCount(0);
    await context.setOffline(true);
    await expect(banda).toBeVisible();
    await capturar(page, info, "nuevo-sin-conexion");
    await context.setOffline(false);
    await expect(banda).toHaveCount(0);
  });
});
