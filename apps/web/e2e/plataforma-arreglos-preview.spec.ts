import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-323 (bloque C): las tarjetas de Módulos del ERP ya no muestran la versión técnica («0.1.0»); y,
// si la cuenta de prueba tiene rol de plataforma, Ajustes saca el ingreso mínimo de Límites y Valores
// legales muestra tablas, no JSON.
test.describe("@preview plataforma: arreglos del diagnóstico", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Módulos del ERP sin versión técnica", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulos");
    await expect(page.getByText(/^Depende de Núcleo/).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/Versión \d+\.\d+\.\d+/)).toHaveCount(0);
    await capturar(page, info, "erp-modulos-sin-version");
  });

  test("Ajustes y Valores legales legibles (si la cuenta es de plataforma)", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/platform/ajustes");
    const titulo = page.getByRole("heading", { name: "Ajustes de plataforma" }).first();
    const visible = await titulo.isVisible({ timeout: 30_000 }).catch(() => false);
    test.skip(!visible, "La cuenta de prueba no tiene rol de plataforma");
    await expect(page.getByLabel("Ingreso mínimo mensual (CLP)")).toHaveCount(0);
    await capturar(page, info, "plataforma-ajustes");
    await page.goto("/platform/indicadores");
    await expect(page.locator("pre")).toHaveCount(0);
    await capturar(page, info, "plataforma-valores-legales");
  });
});
