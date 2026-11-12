import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

const RUTA_IMPORTAR = "/configuracion/modulo/comercial?seccion=importar-1-0";

// CAR-279: conectar OPAI 1 en Integraciones y traer los datos comerciales sin pegar un archivo.
// Corre también en `preview-e2e` con el usuario de `qa-e2e`; no guarda llaves ni importa nada.
test.describe("@preview comercial: traer desde OPAI 1", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la integración pide dirección y llave, y sin conectar explica qué falta", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/integraciones/opai1");
    await expect(page.getByText("Llave de solo lectura de OPAI 1").first()).toBeVisible();
    await expect(page.getByText(/Dirección del exportador/).first()).toBeVisible();
    await capturar(page, info, "opai1-integracion");

    await page.goto(RUTA_IMPORTAR);
    const simular = page.getByRole("button", { name: "Simular desde OPAI 1" });
    await expect(simular).toBeVisible();
    await expect(page.getByRole("button", { name: "Importar desde OPAI 1" })).toBeDisabled();
    await simular.click();
    await expect(page.getByText(/Falta conectar OPAI 1/).first()).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "opai1-importar");
  });
});
