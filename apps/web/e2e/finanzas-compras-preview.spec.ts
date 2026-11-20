import { expect, test } from "@playwright/test";

import { COMPRAS_QA } from "../../../packages/testing/src/compras-qa";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-256: libro de compras con maestro-detalle. Usa la empresa ficticia qa-e2e; solo lee.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview finanzas: compras maestro-detalle", () => {
  test("la lista queda a la izquierda y el documento se abre a la derecha", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto(`/finanzas/compras?q=${COMPRAS_QA.folioPagada}`);
    await expect(page.getByRole("link", { name: "Libro" }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "finanzas-compras-lista");
    const fila = page
      .locator(`a[href="/finanzas/compras/${COMPRAS_QA.pagada}"]`)
      .filter({ visible: true })
      .first();
    await expect(fila, "Falta setup sintético verificado de compras").toBeVisible({
      timeout: 60_000,
    });
    await fila.click();
    await expect(page).toHaveURL(/\/finanzas\/compras\/[0-9a-f-]{36}/);
    await expect(page.getByText("RUT proveedor")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "finanzas-compras-detalle");
  });

  test("el libro muestra el estado de pago que sale de la conciliación (CAR-239)", async ({
    page,
  }, info) => {
    await entrar(page);
    // Requiere la fixture sintética verificada; nunca ejecutar el antiguo seed contra el despliegue.
    await page.goto(`/finanzas/compras?q=${COMPRAS_QA.folioPagada}`);
    const pagada = page
      .locator(`a[href="/finanzas/compras/${COMPRAS_QA.pagada}"]`)
      .filter({ visible: true })
      .first();
    await expect(pagada, "Falta setup sintético verificado de compras").toBeVisible({
      timeout: 60_000,
    });
    await expect(pagada.getByText("Pagada")).toBeVisible({ timeout: 60_000 });
    await pagada.click();
    await expect(page.getByText("Saldo por pagar")).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "finanzas-compras-pagada");
    await page.goto(`/finanzas/compras?q=${COMPRAS_QA.folioPendiente}`);
    const vencida = page
      .locator(`a[href="/finanzas/compras/${COMPRAS_QA.pendiente}"]`)
      .filter({ visible: true })
      .first();
    await expect(vencida.getByText("Pago vencido")).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "finanzas-compras-por-pagar");
  });

  test("pagos a proveedores agrupa el saldo por proveedor (CAR-239)", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/compras/pagos");
    await expect(page.getByRole("heading", { name: "Pagos a proveedores" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "finanzas-compras-pagos-proveedores");
  });
});
