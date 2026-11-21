import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

test.describe("@preview documentos: paginación en explorador", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");
  test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

  test("paginar y conservar al abrir vista previa", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/documentos?limite=20");
    await expect(page.getByRole("heading", { name: /Documentos/i }).first()).toBeVisible({
      timeout: 60_000,
    });

    const siguiente = page.getByRole("link", { name: "Siguiente" });
    const cargarMas = page.getByRole("link", { name: "Cargar más" });
    if ((await siguiente.count()) > 0 && (await siguiente.isVisible())) {
      await siguiente.click();
      await expect(page).toHaveURL(/cursor=/);
    } else if ((await cargarMas.count()) > 0 && (await cargarMas.isVisible())) {
      await cargarMas.click();
      await expect(page).toHaveURL(/cursor=/);
    }

    const fila = page.locator('a[href*="?ver="]').first();
    if ((await fila.count()) > 0) {
      await fila.click();
      await page.getByRole("button", { name: /Cerrar|Volver/i }).first().click();
      await expect(page).toHaveURL(/\/documentos/);
    }
    await capturar(page, info, "documentos-lista-paginacion");
  });
});