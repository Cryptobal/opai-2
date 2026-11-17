import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de persona › Laboral › tarjeta Inventario (CAR-503). Solo corre capturas si qa-e2e tiene el módulo.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview ficha de persona · inventario", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Laboral muestra Inventario cuando el módulo está activo", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/personas");
    const primera = page.locator('a[href^="/personas/"]:not([href*="vencimientos"])').filter({ visible: true }).first();
    await expect(primera).toBeVisible();
    await primera.click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
    const ficha = new URL(page.url()).pathname.match(/^\/personas\/[0-9a-f-]{36}/)?.[0] ?? "";
    await page.goto(`${ficha}/laboral`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const tarjeta = page.getByText("Inventario", { exact: true }).first();
    const visible = await tarjeta.isVisible().catch(() => false);
    test.skip(!visible, "qa-e2e sin módulo Inventario activo");
    await tarjeta.scrollIntoViewIfNeeded();
    await capturar(page, info, "ficha-persona-inventario");
    expect(errores).toEqual([]);
  });
});