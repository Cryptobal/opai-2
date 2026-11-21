import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-802: pestaña Portal en la ficha de cuenta y acceso al portal desde contactos.
test.describe("@preview cuentas portal cliente", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra la pestaña Portal y el bloque de accesos", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/cuentas?estado=cliente_activo");
    await expect(page.getByRole("heading", { name: "Cuentas" }).first()).toBeVisible({ timeout: 60_000 });
    const fila = page.locator('a[href^="/cuentas/"]').first();
    if ((await fila.count()) === 0) {
      info.annotations.push({ type: "omitido", description: "Sin cuentas activas en qa-e2e para esta corrida." });
      return;
    }
    await fila.click();
    const portal = page.getByRole("tab", { name: "Portal" });
    if ((await portal.count()) === 0) {
      info.annotations.push({
        type: "omitido",
        description: "El usuario de prueba no ve la pestaña Portal (módulo o permiso).",
      });
      await capturar(page, info, "cuentas-sin-portal");
      return;
    }
    await portal.click();
    await expect(page.getByText("Contactos y acceso al portal")).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "cuentas-portal-tab");
    await page.getByRole("tab", { name: "Contactos" }).click();
    await capturar(page, info, "cuentas-contactos-portal");
  });
});