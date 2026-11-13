import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-326: Configuración › Módulos › Comercial ofrece «Importar cotizaciones» (simular primero).
test.describe("@preview comercial: importar cotizaciones", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la sección existe y no deja importar sin simular", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/comercial");
    const pestana = page.getByRole("link", { name: "Importar cotizaciones" }).first();
    await expect(pestana).toBeVisible({ timeout: 60_000 });
    await pestana.click();
    await expect(page.getByRole("heading", { name: "Importar cotizaciones desde OPAI 1" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("button", { name: "Simular" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Importar/ })).toBeDisabled();
    await capturar(page, info, "comercial-importar-cotizaciones");
  });
});
