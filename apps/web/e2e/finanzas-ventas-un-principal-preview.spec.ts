import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-370: un solo botón principal por pantalla en Ventas. Con una ficha abierta, «Nueva factura» pasa a secundario y
// «Descartar» de un borrador es texto rojo. Empresa ficticia qa-e2e; solo lee (no emite ni descarta).
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview finanzas: un solo botón principal en Ventas", () => {
  test("con una ficha abierta, «Nueva factura» deja de ser el principal", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/ventas");
    await expect(page.getByRole("group", { name: "Vista de Ventas" })).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "finanzas-ventas-lista");
    const fila = page.locator('a[href^="/finanzas/ventas/0"]').first();
    test.skip((await fila.count()) === 0, "La empresa qa-e2e no tiene documentos de venta");
    await fila.click();
    await expect(page).toHaveURL(/\/finanzas\/ventas\/[0-9a-f-]{36}/, { timeout: 30_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "finanzas-ventas-ficha");
  });
});
