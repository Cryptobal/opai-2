import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Importar contratos vigentes (CAR-282, PR 2): la lista trae «Contratos vigentes» y la simulación explica cada
// error por fila (persona, cargo e instalación inexistentes). Solo simula: no escribe nada en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview configuración: importar contratos", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("simula una planilla de contratos y explica los errores por fila", async ({ page }, info) => {
    const csv =
      "RUT;Cargo;Instalación;Tipo;Inicio;Horas semanales;Distribución\n" +
      "11.111.111-1;Cargo que no existe;Instalación que no existe;indefinido;01-03-2024;44;4x4 de 12 horas\n" +
      "12.345.678-5;Guardia;Bodega;indefinido;01-03-2024;44;4x4 de 12 horas\n";
    await entrar(page);
    await page.goto("/configuracion/importar");
    await expect(page.getByRole("heading", { name: "Importar datos", exact: true }).first()).toBeVisible();
    await page.getByLabel("Qué quieres importar").click();
    await page.getByRole("option", { name: "Contratos vigentes", exact: true }).click();
    await capturar(page, info, "importar-contratos-inicio");

    await page.locator('input[type="file"]').setInputFiles({ name: "contratos.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
    await expect(page.getByText("Simulación: todavía no se guardó nada")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/No hay una persona con ese RUT/).first()).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "importar-contratos-simulacion");
  });
});
