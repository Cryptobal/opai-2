import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Generar documento sobre una cuenta o una instalación (CAR-315 parte 2): desde la pestaña Documentos se abre
// la pantalla; sin plantillas del ámbito se ve el estado vacío. Solo lee: no crea documentos.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

for (const [ruta, etiqueta] of [
  ["cuentas", "cuentas"],
  ["instalaciones", "instalaciones"],
] as const) {
  test.describe(`@preview ${etiqueta}: generar documento`, () => {
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

    test(`abre generar documento desde ${etiqueta}`, async ({ page }, info) => {
      await entrar(page);
      await page.goto(`/${ruta}`);
      const enlaces = page.locator(`a[href^="/${ruta}/"]`);
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      await page.waitForLoadState("networkidle");
      const hrefs = await enlaces.evaluateAll((els) =>
        els.map((e) => e.getAttribute("href") ?? ""),
      );
      const id =
        hrefs.map((h) => h.match(new RegExp(`^/${ruta}/([0-9a-f-]{36})`))?.[1]).find(Boolean) ?? "";
      // La empresa de pruebas puede no tener instalaciones sembradas: sin registro no hay pantalla que mirar.
      test.skip(id === "", `qa-e2e no tiene ${etiqueta} sembradas`);
      await page.goto(`/${ruta}/${id}/generar-documento`);
      const vacio = page.getByText(/Aún no hay plantillas de/);
      await expect(
        page.getByText(/Elige una plantilla|Aún no hay plantillas de/).first(),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      if (await vacio.isVisible())
        return void (await capturar(page, info, `generar-documento-${etiqueta}-vacio`));
      await page.getByLabel("Plantilla").click();
      await page.getByRole("option").first().click();
      await expect(page.locator("article.bg-paper")).toBeVisible({ timeout: 30_000 });
      await capturar(page, info, `generar-documento-${etiqueta}-vista`);
    });
  });
}
