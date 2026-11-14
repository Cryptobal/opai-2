import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-344: el día de pago de sueldos vive en Configuración › Módulos › Remuneraciones y lo usa el flujo
// de caja. Solo mira la pantalla; no guarda nada.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview nómina: día de pago de sueldos", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra los ajustes de pago de sueldos", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/nomina");
    await expect(page.getByText("Día de pago de sueldos").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Los sueldos se pagan el mes siguiente").first()).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "nomina-dia-pago-sueldos");
  });
});
