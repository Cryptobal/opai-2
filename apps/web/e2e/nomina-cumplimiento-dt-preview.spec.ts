import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview nómina: cumplimiento DT contratos", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra la lista de movimientos Mi DT", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/remuneraciones/cumplimiento-dt/contratos");
    await expect(page.getByText("Plazo de 15 días desde el hecho")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "nomina-cumplimiento-dt");
  });
});