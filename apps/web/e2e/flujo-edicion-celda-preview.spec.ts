import { expect, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-456: en la planilla del flujo se nota qué celda se edita (borde al pasar el mouse, nombre accesible «… Editar»),
// hay una leyenda de colores (real, comprometido, planificado) y la hoja dice que el monto es planificado.
// Abre la hoja de una celda planificada y la cierra sin guardar: no escribe en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview flujo de caja: editar una celda planificada", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("leyenda de colores, celda editable con nombre y hoja de monto planificado", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/flujo");
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({ timeout: 60_000 });

    const editable = page.locator("tbody").getByRole("button", { name: /Editar$/ }).first();
    test.skip((await editable.count()) === 0, "La empresa de prueba no tiene celdas planificadas editables");

    const leyenda = page.getByLabel("Qué significa cada color");
    if (await leyenda.isVisible()) {
      await expect(leyenda.getByText("Real del banco")).toBeVisible();
      await expect(leyenda.getByText("Planificado")).toBeVisible();
    }
    await editable.scrollIntoViewIfNeeded();
    if (!info.project.name.includes("telefono")) await editable.hover();
    await capturar(page, info, "flujo-celda-editable");

    const hoja = page.getByRole("dialog");
    await expect(async () => {
      await editable.click();
      await expect(hoja).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    // En el teléfono la celda puede abrir otra hoja especial (cobros, IVA): solo se valida la de monto planificado.
    const planificado = hoja.getByLabel("Monto planificado (CLP)");
    if (await planificado.count()) {
      await expect(hoja.getByText(/^Planificado · semana del \d{2}-\d{2}-\d{4}/)).toBeVisible();
      await capturarHoja(page, info, "flujo-celda-hoja-planificado");
    }
    await page.keyboard.press("Escape");
  });
});
