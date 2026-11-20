import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

test.describe("@preview finanzas: compras búsqueda y paginación", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");
  test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

  test("buscar, paginar y volver", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/finanzas/compras?limite=20");
    await expect(page.getByRole("heading", { name: /Libro de compras/i }).first()).toBeVisible({ timeout: 60_000 });
    const buscar = page.getByPlaceholder("Buscar folio o proveedor");
    await buscar.fill("1");
    await buscar.press("Enter");

    const siguiente = page.getByRole("link", { name: "Siguiente" });
    const cargarMas = page.getByRole("link", { name: "Cargar más" });
    if ((await siguiente.count()) > 0 && (await siguiente.isVisible())) {
      await siguiente.click();
      await expect(page).toHaveURL(/cursor=/);
    } else if ((await cargarMas.count()) > 0 && (await cargarMas.isVisible())) {
      await cargarMas.click();
      await expect(page).toHaveURL(/cursor=/);
    }

    const fila = page.locator('a[href^="/finanzas/compras/"]').first();
    if ((await fila.count()) > 0) {
      await fila.click();
      await page.getByRole("link", { name: /Atrás|Compras|Libro/i }).first().click();
      await expect(page).toHaveURL(/\/finanzas\/compras/);
    }
    await capturar(page, info, "finanzas-compras-paginacion");
  });
});