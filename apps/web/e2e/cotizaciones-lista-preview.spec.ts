import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-544: lista con filtros/vistas y paso «Documento y envío» con tarjetas PDF/propuesta.
// `preview-e2e` entra como el owner de la empresa ficticia `qa-e2e` (mismo patrón que el resto de *-preview).
// Cotización de muestra opcional: `packages/db/scripts/qa-e2e/cotizacion-ficha.sql` en Neon `main`.
test.describe("@preview CPQ: lista y documento", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("filtros, vistas y tarjetas de documento", async ({ page }, info) => {
    test.setTimeout(150_000);
    await entrar(page);
    await page.goto("/cotizaciones?estado=enviada");
    await expect(page.getByRole("button", { name: "Vistas guardadas" }).filter({ visible: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Filtrar por estado")).toBeVisible();
    await capturar(page, info, "cotizaciones-lista-filtros");

    await page.goto("/cotizaciones");
    const primera = page.getByRole("link").filter({ hasText: /CPQ-\d{4}-\d+/ }).first();
    const hayCotizacion = await primera
      .isVisible({ timeout: 20_000 })
      .catch(() => false);
    test.skip(!hayCotizacion, "Sin cotizaciones en qa-e2e; aplicar cotizacion-ficha.sql en Neon main");

    await primera.click();
    await page.getByRole("button", { name: /Documento y envío/i }).click();
    await expect(page.getByRole("button", { name: "Ver cotización (PDF)" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: /propuesta técnica/i })).toBeVisible();
    await capturar(page, info, "cotizaciones-documento-tarjetas");
  });
});