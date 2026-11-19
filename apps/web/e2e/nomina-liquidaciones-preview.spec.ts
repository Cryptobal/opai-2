import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Brief 27 (CAR-99): liquidaciones del período (diseño 03). Entra al primer período de la empresa de prueba
// y muestra la pantalla; la vista previa del cálculo no guarda nada.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview nómina: liquidaciones", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra las liquidaciones del período y la vista previa del cálculo", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/remuneraciones");
    const periodo = page.locator('a[href^="/remuneraciones/0"]:visible').first();
    test.skip((await periodo.count()) === 0, "qa-e2e sin períodos de remuneraciones");
    const href = await periodo.getAttribute("href");
    await page.goto(`${href}/liquidaciones`);
    await expect(page.getByText("Total líquido").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "nomina-liquidaciones");
    const calcular = page.getByRole("button", { name: "Calcular liquidaciones" });
    if ((await calcular.count()) > 0) {
      await calcular.click();
      await expect(page.getByText(/Se calcularían|Faltan valores legales/).first()).toBeVisible({ timeout: 30_000 });
      await capturar(page, info, "nomina-liquidaciones-previa");
    }
  });
});
