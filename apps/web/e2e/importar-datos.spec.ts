import { expect, test } from "@playwright/test";

import { E2E_PASSWORD as password, entrar } from "./sesion";

// Importar datos (CAR-279): simulación con errores por fila, importación real y reversión del lote.
// Capturas a 375, 1024 y 1280 en e2e/__screenshots__/.
test.describe("configuración: importar datos", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("simula, importa y revierte una planilla de cuentas", async ({ page }, info) => {
    const marca = `${info.project.name}-${Date.now()}`;
    const csv = `Nombre;RUT;Comuna\nImportada Uno ${marca};;Maipú\nImportada Dos ${marca};;Ñuñoa\nCon RUT malo ${marca};11.111.111-2;\n`;
    await entrar(page);
    await page.goto("/configuracion/importar");
    await expect(page.getByRole("heading", { name: "Importar datos", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Descargar plantilla Excel" })).toBeVisible();
    await page.screenshot({ path: `e2e/__screenshots__/importar-inicio-${info.project.name}.png`, fullPage: true });

    await page.locator('input[type="file"]').setInputFiles({ name: "cuentas.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
    await expect(page.getByText("Simulación: todavía no se guardó nada")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/RUT inválido/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Importar 2 registros" })).toBeEnabled();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await page.screenshot({ path: `e2e/__screenshots__/importar-simulacion-${info.project.name}.png`, fullPage: true });

    await page.getByRole("button", { name: "Importar 2 registros" }).click();
    await expect(page.getByText(/Importación lista: 2 creados/)).toBeVisible({ timeout: 30_000 });
    const fila = page.getByRole("row").filter({ hasText: "cuentas.csv" }).filter({ hasText: "Importado" }).first();
    await expect(fila).toContainText("2 creados");
    await page.screenshot({ path: `e2e/__screenshots__/importar-cargas-${info.project.name}.png`, fullPage: true });

    await fila.getByRole("button", { name: "Revertir" }).click();
    await expect(page.getByText("Se borrarían 2 registros y se restaurarían 0.")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Revertir lote" }).click();
    await expect(page.getByText("Lote revertido")).toBeVisible({ timeout: 30_000 });
  });
});
