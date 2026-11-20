import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

test.describe("@preview negocios: búsqueda y paginación en lista", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("buscar, paginar y volver", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/negocios?vista=lista&limite=20");
    await expect(page.getByRole("heading", { name: "Negocios" }).first()).toBeVisible({ timeout: 60_000 });
    const buscar = page.getByPlaceholder("Buscar por título");
    await buscar.fill("QA");
    await buscar.press("Enter");
    await expect(page.getByText(/\d+ resultados?/)).toBeVisible({ timeout: 60_000 });

    const siguiente = page.getByRole("link", { name: "Siguiente" });
    const cargarMas = page.getByRole("link", { name: "Cargar más" });
    if ((await siguiente.count()) > 0 && (await siguiente.isVisible())) {
      await siguiente.click();
      await expect(page).toHaveURL(/cursor=/);
    } else if ((await cargarMas.count()) > 0 && (await cargarMas.isVisible())) {
      await cargarMas.click();
      await expect(page).toHaveURL(/cursor=/);
    }

    const fila = page.locator('a[href^="/negocios/"]').first();
    if ((await fila.count()) > 0) {
      await fila.click();
      await page.getByRole("link", { name: /Atrás|Negocios/i }).first().click();
      await expect(page).toHaveURL(/vista=lista/);
    }
    await capturar(page, info, "negocios-lista-paginacion");
  });
});