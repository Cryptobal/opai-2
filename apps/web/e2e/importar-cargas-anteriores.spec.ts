import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-283 (pendiente de QA) · «Cargas anteriores» de Importar datos cabe en iPad: la tabla no se corta a la
// derecha. Solo lee: no importa ni revierte nada en la empresa de prueba (`qa-e2e` en `preview-e2e`).
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview configuración: cargas anteriores de Importar datos", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la tabla de cargas cabe sin desplazarse a la derecha", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/importar");
    const seccion = page.getByRole("heading", { name: "Cargas anteriores" });
    await expect(seccion).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const tabla = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Carga" }) });
    if ((await tabla.count()) > 0 && (page.viewportSize()?.width ?? 0) >= 1024) {
      // El marco de la tabla (overflow-x-auto) no debe necesitar desplazamiento en iPad ni en escritorio.
      const desborde = await tabla.evaluate((t) => {
        const marco = t.parentElement;
        return marco ? marco.scrollWidth - marco.clientWidth : 0;
      });
      expect(desborde).toBeLessThanOrEqual(1);
    }
    await seccion.scrollIntoViewIfNeeded();
    await capturar(page, info, "importar-cargas-anteriores");
  });
});
