import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-283 · Importar facturas y notas emitidas: aparece en el asistente cuando Finanzas está activo y la simulación
// valida fila por fila. Solo simula: no guarda nada en la empresa de prueba (`qa-e2e` en `preview-e2e`).
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview configuración: importar facturas y notas emitidas", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la simulación explica las filas que no se pueden cargar", async ({ page }, info) => {
    // Encabezados del detalle del Registro de Ventas del SII.
    const csv =
      "Tipo Doc,Folio,Rut cliente,Fecha Docto,Monto Neto,Monto IVA,Monto total\n" +
      "33,880001,11.111.111-1,01-10-2026,1000,190,1190\n" +
      "33,880002,11.111.111-1,02-10-2026,1000,190,1190\n" +
      "33,880002,11.111.111-1,02-10-2026,1000,190,1190\n";
    await entrar(page);
    await page.goto("/configuracion/importar");
    await expect(page.getByRole("heading", { name: "Importar datos", exact: true }).first()).toBeVisible({ timeout: 60_000 });
    const selector = page.getByLabel("Qué quieres importar");
    await hidratado(selector);
    await selector.click();
    await page.getByRole("option", { name: "Facturas y notas emitidas", exact: true }).click();
    await capturar(page, info, "importar-ventas-inicio");

    await page.locator('input[type="file"]').setInputFiles({ name: "ventas.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
    await expect(page.getByText("Simulación: todavía no se guardó nada")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Importa primero las cuentas/).first()).toBeVisible();
    await expect(page.getByText(/ya está en la fila 3/)).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "importar-ventas-simulacion");
  });
});
