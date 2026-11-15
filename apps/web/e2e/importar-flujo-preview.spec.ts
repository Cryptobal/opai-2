import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Importar filas y gastos recurrentes del flujo de caja (CAR-349, bloque 3): la lista trae los dos importadores y la
// simulación explica cada error por fila (fila del flujo inexistente, ingreso que no se importa). Solo simula: no
// escribe nada en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview configuración: importar flujo de caja", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("simula filas y gastos recurrentes y explica los errores por fila", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/importar");
    await expect(page.getByRole("heading", { name: "Importar datos", exact: true }).first()).toBeVisible({ timeout: 60_000 });
    await hidratado(page.getByLabel("Qué quieres importar"));
    await page.getByLabel("Qué quieres importar").click();
    await page.getByRole("option", { name: "Filas del flujo de caja", exact: true }).click();
    const filas = "Nombre de la fila;Sección;Orden\nArriendo QA e2e;egreso;10\nVentas QA e2e;ingreso;1\n";
    await page.locator('input[type="file"]').setInputFiles({ name: "filas.csv", mimeType: "text/csv", buffer: Buffer.from(filas, "utf8") });
    await expect(page.getByText("Simulación: todavía no se guardó nada")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Los ingresos no se importan/).first()).toBeVisible();
    await capturar(page, info, "importar-flujo-filas-simulacion");

    await page.goto("/configuracion/importar");
    await expect(page.getByRole("heading", { name: "Importar datos", exact: true }).first()).toBeVisible({ timeout: 60_000 });
    await hidratado(page.getByLabel("Qué quieres importar"));
    await page.getByLabel("Qué quieres importar").click();
    await page.getByRole("option", { name: "Gastos recurrentes del flujo de caja", exact: true }).click();
    const recurrentes = "Fila del flujo;Concepto;Unidad;Monto;Frecuencia;Día del mes;Desde\nFila que no existe;Arriendo;uf;12,5;mensual;5;01-01-2027\n";
    await page.locator('input[type="file"]').setInputFiles({ name: "recurrentes.csv", mimeType: "text/csv", buffer: Buffer.from(recurrentes, "utf8") });
    await expect(page.getByText("Simulación: todavía no se guardó nada")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Importa primero las filas del flujo de caja/).first()).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "importar-flujo-recurrentes-simulacion");
  });
});
