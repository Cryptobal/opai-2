import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-751: configuración de cadenas y horario de la Central.
test.describe("@preview central: cadenas de escalamiento", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("empresa: Configuración › Módulos › Central › Cadenas", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/central?seccion=cadenas");
    await expect(page.getByText("Cadena de la empresa").filter({ visible: true }).first()).toBeVisible({
      timeout: 60_000,
    });
    await capturar(page, info, "central-config-cadenas");
  });
});