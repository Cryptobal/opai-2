import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-546 revierte CAR-360: «Nueva» sigue primaria con ficha abierta; no se repite «Nueva cuenta» en la cabecera.
test.describe("@preview vista dividida: Nueva sigue primaria", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("la ficha de una cuenta no repite el botón de alta", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/cuentas");
    const fila = page.locator('a[href^="/cuentas/"]').filter({ visible: true }).first();
    const hay = await fila.isVisible({ timeout: 30_000 }).catch(() => false);
    test.skip(!hay, "qa-e2e no tiene cuentas para abrir");
    await fila.click();
    await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}/, { timeout: 60_000 });
    await expect(page.getByRole("link", { name: "Nueva cuenta", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Nueva", exact: true })).toHaveClass(/ds-primario/);
    await capturar(page, info, "cuenta-ficha-nueva-primaria");
  });
});
