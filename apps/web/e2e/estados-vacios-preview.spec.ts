import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-340: el aviso de una lista vacía no queda pegado al borde de la columna ni de la pantalla.
test.describe("@preview listas: estado vacío con margen", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("una búsqueda sin resultados muestra el aviso con margen", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/cuentas?q=zzzz-sin-resultados-zzzz");
    const aviso = page.locator("[data-estado-lista]").first();
    await expect(aviso).toBeVisible({ timeout: 60_000 });
    const caja = await aviso.boundingBox();
    const hijo = await aviso.locator(":scope > *").first().boundingBox();
    expect(caja && hijo && hijo.x - caja.x).toBeGreaterThanOrEqual(12);
    await capturar(page, info, "lista-vacia-margen");
  });
});
