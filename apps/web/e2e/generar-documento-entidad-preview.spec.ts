import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Generar documento sobre una cuenta o una instalación (CAR-315 parte 2): desde la pestaña Documentos se abre
// la pantalla; sin plantillas del ámbito se ve el estado vacío. Solo lee: no crea documentos.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

for (const [ruta, etiqueta] of [["cuentas", "cuentas"], ["instalaciones", "instalaciones"]] as const) {
  test.describe(`@preview ${etiqueta}: generar documento`, () => {
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

    test(`abre generar documento desde ${etiqueta}`, async ({ page }, info) => {
      await entrar(page);
      await page.goto(`/${ruta}`);
      const primera = page.locator(`a[href^="/${ruta}/"]`).filter({ visible: true }).first();
      await expect(primera, "qa-e2e tiene al menos un registro ficticio").toBeVisible();
      await primera.click();
      await page.waitForURL(new RegExp(`/${ruta}/[0-9a-f-]{36}`));
      const id = page.url().match(new RegExp(`/${ruta}/([0-9a-f-]{36})`))?.[1] ?? "";
      await page.goto(`/${ruta}/${id}/generar-documento`);
      await expect(page.getByText("Generar documento").filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      const vacio = page.getByText(/Aún no hay plantillas de/);
      if (await vacio.isVisible()) return void (await capturar(page, info, `generar-documento-${etiqueta}-vacio`));
      await page.getByLabel("Plantilla").click();
      await page.getByRole("option").first().click();
      await expect(page.locator("article.bg-paper")).toBeVisible({ timeout: 30_000 });
      await capturar(page, info, `generar-documento-${etiqueta}-vista`);
    });
  });
}
