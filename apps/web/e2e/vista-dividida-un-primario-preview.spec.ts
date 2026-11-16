import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-360 (Sesión Diseño): con una ficha abierta en la vista dividida, «Nueva» de la lista es secundario y la
// cabecera no repite «Nueva cuenta»: queda a lo más un primario. Corre en `preview-e2e` con `qa-e2e`.
test.describe("@preview vista dividida: a lo más un primario", () => {
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
    expect(await page.locator(".ds-primario").filter({ visible: true }).count()).toBeLessThanOrEqual(1);
    await capturar(page, info, "cuenta-ficha-un-primario");
  });
});
