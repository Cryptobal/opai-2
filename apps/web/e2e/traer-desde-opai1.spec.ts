import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-279 y CAR-321: la integración «OPAI 1 (traer datos)» solo existe para las empresas que Plataforma
// habilita. La empresa de prueba (`qa-e2e` en `preview-e2e`) no lo está: no ve la tarjeta, su página dice que no existe.
// No guarda llaves ni importa nada.
test.describe("@preview comercial: traer desde OPAI 1 solo en empresas habilitadas", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("una empresa no habilitada no ve la integración ni el botón de traer directo", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/integraciones");
    await expect(page.getByText("Banco (Web4Leads)").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("OPAI 1 (traer datos)")).toHaveCount(0);
    await capturar(page, info, "opai1-integraciones-oculta");

    await page.goto("/configuracion/integraciones/opai1");
    await expect(page.getByText("No encontramos lo que buscas").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Llave de solo lectura de OPAI 1")).toHaveCount(0);
  });
});
