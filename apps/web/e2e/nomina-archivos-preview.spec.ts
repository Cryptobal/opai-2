import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-99: Archivos y declaraciones del período (diseño 06). Valida LRE y Previred contra las liquidaciones
// de la empresa de prueba qa-e2e y captura cada tarjeta; descargar solo se habilita sin errores.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview nómina: archivos y declaraciones", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("valida LRE y Previred y muestra el resultado de cada uno", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/remuneraciones");
    const periodo = page.locator('a[href^="/remuneraciones/0"]:visible').first();
    test.skip((await periodo.count()) === 0, "qa-e2e sin períodos de remuneraciones");
    const href = await periodo.getAttribute("href");
    await page.goto(`${href}/archivos`);
    await expect(page.getByText("OPAI prepara y valida los archivos")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Formato por verificar").first()).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "nomina-archivos");
    for (const [i, titulo] of ["Libro de Remuneraciones Electrónico (LRE)", "Previred · cotizaciones"].entries()) {
      const tarjeta = page.locator("div").filter({ has: page.getByText(titulo, { exact: true }) }).filter({ has: page.getByRole("button", { name: /^Validar/ }) }).last();
      await tarjeta.getByRole("button", { name: /^Validar/ }).click();
      await expect(tarjeta.getByText(/^Validación · /)).toBeVisible({ timeout: 30_000 });
      await capturar(page, info, `nomina-archivos-${i === 0 ? "lre" : "previred"}`);
    }
  });
});
