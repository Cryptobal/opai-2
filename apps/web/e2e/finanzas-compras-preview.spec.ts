import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-256: libro de compras con maestro-detalle. Usa la empresa ficticia qa-e2e; solo lee.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview finanzas: compras maestro-detalle", () => {
  test("la lista queda a la izquierda y el documento se abre a la derecha", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/compras");
    await expect(page.getByRole("link", { name: "Libro" }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "finanzas-compras-lista");
    const fila = page.locator('a[href^="/finanzas/compras/0"], a[href^="/finanzas/compras/1"]').filter({ visible: true }).first();
    if ((await fila.count()) === 0) return; // Sin documentos en qa-e2e: basta la lista vacía.
    await fila.click();
    await expect(page).toHaveURL(/\/finanzas\/compras\/[0-9a-f-]{36}/);
    await expect(page.getByText("RUT proveedor")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "finanzas-compras-detalle");
  });

  test("el libro muestra el estado de pago que sale de la conciliación (CAR-239)", async ({ page }, info) => {
    await entrar(page);
    // Siembra `compras-estado-pago.sql`: el folio 990102 está pagado por una conciliación y el 990101 sigue por pagar y vencido.
    await page.goto("/finanzas/compras?q=990102");
    const pagada = page.locator('a[href^="/finanzas/compras/"]').filter({ hasText: "990102" }).filter({ visible: true }).first();
    test.skip((await pagada.count()) === 0, "Falta la siembra compras-estado-pago.sql en qa-e2e");
    await expect(pagada.getByText("Pagada")).toBeVisible({ timeout: 60_000 });
    await pagada.click();
    await expect(page.getByText("Saldo por pagar")).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "finanzas-compras-pagada");
    await page.goto("/finanzas/compras?q=990101");
    const vencida = page.locator('a[href^="/finanzas/compras/"]').filter({ hasText: "990101" }).filter({ visible: true }).first();
    await expect(vencida.getByText("Pago vencido")).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "finanzas-compras-por-pagar");
  });
});

