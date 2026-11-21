import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

test.describe("@preview personas: búsqueda y paginación en lista", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");
  test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

  test("buscar, paginar y volver", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/personas?limite=20");
    await expect(page.getByRole("heading", { name: /Personas/i }).first()).toBeVisible({ timeout: 60_000 });
    const buscar = page.getByPlaceholder("Buscar por nombre o RUT");
    await buscar.fill("QA");
    await buscar.press("Enter");
    await expect(page.getByText(/resultados?/)).toBeVisible({ timeout: 60_000 });

    const siguiente = page.getByRole("link", { name: "Siguiente" });
    const cargarMas = page.getByRole("link", { name: "Cargar más" });
    if ((await siguiente.count()) > 0 && (await siguiente.isVisible())) {
      await siguiente.click();
      await expect(page).toHaveURL(/cursor=/);
    } else if ((await cargarMas.count()) > 0 && (await cargarMas.isVisible())) {
      await cargarMas.click();
      await expect(page).toHaveURL(/cursor=/);
    }

    const fila = page.locator('a[href^="/personas/"]').first();
    if ((await fila.count()) > 0) {
      await fila.click();
      await page.getByRole("link", { name: /Atrás|Personas/i }).first().click();
      await expect(page).toHaveURL(/\/personas/);
    }
    await capturar(page, info, "personas-lista-paginacion");
  });
});