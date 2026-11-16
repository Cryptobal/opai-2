import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-544: lista con filtros/vistas y paso «Documento y envío» con tarjetas PDF/propuesta.
// `preview-e2e` entra como el owner de `qa-e2e`. Depende de `packages/db/scripts/qa-e2e/cotizacion-ficha.sql`
// aplicado en Neon `main` (cotización ficticia `CPQ-2026-901`, tras `factura-aceptada.sql`).
const CODIGO_COTIZACION_QA = "CPQ-2026-901";

test.describe("@preview CPQ: lista y documento", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("filtros, vistas y tarjetas de documento", async ({ page }, info) => {
    test.setTimeout(150_000);
    await entrar(page);
    await page.goto("/cotizaciones?estado=enviada");
    await expect(page.getByRole("button", { name: "Vistas guardadas" }).filter({ visible: true })).toBeVisible({
      timeout: 60_000,
    });
    // Con `estado` en la URL el chip activo es «Estado: Enviada» (no el disparador «Filtrar por estado»).
    await expect(page.getByRole("button", { name: "Quitar filtro Estado" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel("Enviada desde")).toBeVisible();
    await expect(page.getByLabel("Enviada hasta")).toBeVisible();
    // Otros filtros sin valor siguen como menú punteado (misma fila en los 3 viewports).
    await expect(page.getByRole("button", { name: "Filtrar por cuenta" })).toBeVisible();
    await capturar(page, info, "cotizaciones-lista-filtros");

    await page.goto("/cotizaciones");
    const cotizacion = page.getByRole("link").filter({ hasText: CODIGO_COTIZACION_QA });
    await expect(cotizacion).toBeVisible({ timeout: 60_000 });
    await cotizacion.click();
    await page.getByRole("button", { name: /Documento y envío/i }).click();
    await expect(page.getByRole("button", { name: "Ver cotización (PDF)" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: /propuesta técnica/i })).toBeVisible();
    await capturar(page, info, "cotizaciones-documento-tarjetas");
  });
});