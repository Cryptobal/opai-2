import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Configuración del Portal Cliente · secciones del resumen (CAR-502) en `preview-e2e`: la tarjeta lista cobertura,
// rondas, novedades y el texto de las novedades; el texto parte apagado y depende de «Novedades por gravedad». No
// guarda nada. Sin el módulo en `qa-e2e`, se anota como omitido. A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview portal cliente secciones", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la tarjeta de secciones muestra el texto de las novedades", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/configuracion/modulo/portal_cliente");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const tarjeta = page.getByText("Secciones del resumen del mes");
    if (!(await tarjeta.count())) {
      info.annotations.push({
        type: "omitido",
        description: "qa-e2e sin cuentas en el Portal Cliente",
      });
      expect(errores).toEqual([]);
      return;
    }
    await expect(page.getByRole("switch", { name: "Cobertura de turnos" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "Texto de las novedades" })).toBeVisible();
    await tarjeta.scrollIntoViewIfNeeded();
    await capturar(page, info, "portal-cliente-secciones");
    expect(errores).toEqual([]);
  });
});
