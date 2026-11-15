import { expect, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-456: «Reprogramar» vive en la fila que mueve (aparece al pasar el mouse o con foco) y abre la hoja
// con esa fila elegida. Abre y cierra la hoja sin aplicar: no escribe en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview flujo de caja: reprogramar desde la fila", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la acción está en la fila y abre la hoja con esa fila", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/flujo");
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({ timeout: 60_000 });
    const accion = page.locator("tbody").getByRole("button", { name: /^Reprogramar / }).first();
    test.skip((await accion.count()) === 0, "La empresa de prueba no tiene filas con plan en el flujo");

    const nombre = (await accion.getAttribute("aria-label"))?.replace(/^Reprogramar /, "") ?? "";
    expect(nombre).not.toBe("");
    const fila = page.locator("tbody tr").filter({ has: accion });
    if (!info.project.name.includes("telefono")) await fila.hover();
    await expect(accion).toBeVisible();
    await capturar(page, info, "flujo-fila-reprogramar");

    await accion.click();
    const hoja = page.getByRole("dialog", { name: "Reprogramar" });
    await expect(hoja).toBeVisible();
    await expect(hoja.getByText(nombre).first()).toBeVisible();
    await capturarHoja(page, info, "flujo-fila-reprogramar-hoja");
    await page.keyboard.press("Escape");
    await expect(hoja).toBeHidden();
  });
});
