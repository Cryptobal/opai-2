import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Usa `packages/db/scripts/qa-e2e/nomina-finiquito-cumplimiento-dt.sql` en la vista previa o en main.

test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

const VINCULO_FINIQUITO = "00000000-0000-7000-8000-0000000e2399";

test.describe("@preview nómina: ficha finiquito", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra cálculo y documentos en la ficha", async ({ page }, info) => {
    await entrar(page);
    await page.goto(`/remuneraciones/cumplimiento-dt/finiquitos/${VINCULO_FINIQUITO}`);
    await expect(page.getByText("Cálculo del finiquito")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Carta y comprobantes")).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "nomina-finiquito-ficha");
  });
});