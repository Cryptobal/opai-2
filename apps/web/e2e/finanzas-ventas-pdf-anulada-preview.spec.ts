import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-266: una factura anulada por nota de crédito sigue siendo un documento timbrado, así que su ficha ofrece
// «Descargar PDF». Usa la factura ficticia 990003 de `packages/db/scripts/qa-e2e/factura-aceptada.sql`; no descarga
// ni cambia nada.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la factura ficticia anulada de la empresa qa-e2e");

const ANULADA = "00000000-0000-7000-8000-000000266001";

test.describe("@preview finanzas: PDF de una venta anulada", () => {
  test("la ficha de una factura anulada ofrece Descargar PDF", async ({ page }, info) => {
    await entrar(page);
    await page.goto(`/finanzas/ventas/${ANULADA}`);
    const detalle = page.getByRole("region", { name: "Detalle de la venta" });
    await expect(detalle.getByRole("heading", { name: /folio 990003/ })).toBeVisible({ timeout: 60_000 });
    await expect(detalle.getByRole("button", { name: "Descargar PDF" })).toBeVisible();
    await expect(detalle.getByRole("button", { name: "Enviar al cliente" })).toHaveCount(0);
    await capturar(page, info, "ventas-anulada-pdf");
  });
});
