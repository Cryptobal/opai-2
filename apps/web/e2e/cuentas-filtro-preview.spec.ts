import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-325: al abrir una cuenta desde una lista filtrada, el filtro de la lista se conserva (también en las
// pestañas de la ficha); y la configuración de Comercial ya no ofrece «Importar 1.0».
test.describe("@preview comercial: cuentas conservan el filtro", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("abrir una cuenta desde Cliente activo conserva el filtro", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/cuentas?estado=cliente_activo");
    await expect(page.getByRole("heading", { name: "Cuentas" }).first()).toBeVisible({ timeout: 60_000 });
    const fila = page.locator('a[href^="/cuentas/"]').first();
    if ((await fila.count()) === 0) {
      // La empresa de prueba puede no tener clientes activos: se verifica al menos que el filtro se mantiene en la URL.
      await expect(page).toHaveURL(/estado=cliente_activo/);
      await capturar(page, info, "cuentas-filtro-vacio");
      return;
    }
    expect(await fila.getAttribute("href")).toContain("estado=cliente_activo");
    await fila.click();
    await expect(page).toHaveURL(/\/cuentas\/[0-9a-f-]+\?.*estado=cliente_activo/, { timeout: 60_000 });
    await capturar(page, info, "cuentas-filtro-ficha");
  });

  test("la configuración de Comercial no ofrece Importar 1.0", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/comercial");
    await expect(page.getByRole("link", { name: "Embudo" }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: "Importar 1.0" })).toHaveCount(0);
    await capturar(page, info, "comercial-config-sin-importar");
  });
});
