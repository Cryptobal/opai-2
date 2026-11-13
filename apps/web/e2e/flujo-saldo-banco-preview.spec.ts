import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-391: el flujo parte del saldo del banco. Configuración ya no pide saldo inicial ni semana desde, y el flujo
// muestra la planilla o el aviso de que falta el saldo del banco. Solo lee: no escribe nada en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview flujo de caja: saldo del banco", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("configuración sin saldo de partida y flujo desde el banco", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/finanzas?seccion=flujo-caja");
    await expect(page.getByRole("heading", { name: "Aviso de saldo bajo" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/no se ingresa a mano/)).toBeVisible();
    await expect(page.getByText("Saldo inicial (CLP)")).toHaveCount(0);
    await expect(page.getByText(/Semana desde/)).toHaveCount(0);
    await capturar(page, info, "flujo-config-sin-saldo-inicial");

    await page.goto("/finanzas/flujo");
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "flujo-saldo-banco");
  });
});
