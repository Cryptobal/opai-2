import { expect, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Gastos recurrentes del flujo de caja (CAR-382): lista y hoja de nuevo gasto. El primer test no guarda nada;
// el de CAR-413 crea un gasto ficticio en `qa-e2e` (base de la vista previa) si no hay ninguno, y no confirma el cambio.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview finanzas: gastos recurrentes", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra la lista y la hoja de nuevo gasto con sus unidades", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/flujo/recurrentes");
    await expect(page.getByRole("heading", { name: "Gastos recurrentes", exact: true }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "flujo-recurrentes-lista");

    const nuevo = page.getByRole("link", { name: "Nuevo gasto recurrente" });
    if ((await nuevo.count()) === 0) {
      // Sin filas de egreso en la empresa de prueba: la captura muestra el estado vacío con su acción.
      test.info().annotations.push({ type: "aviso", description: "qa-e2e sin filas de egreso: no se probó la hoja" });
      await expect(page.getByText("Primero crea una fila de egresos")).toBeVisible();
      return;
    }
    await nuevo.first().click();
    await expect(page.getByRole("dialog").getByText("Nuevo gasto recurrente")).toBeVisible();
    await page.getByLabel("Concepto").fill("Arriendo de prueba");
    await page.getByLabel("Monto por cuota ($)").fill("80.000");
    await capturarHoja(page, info, "flujo-recurrentes-nuevo");
  });

  // CAR-413: cambiar la frecuencia desde una fecha, solo hasta la vista previa (no confirma).
  test("revisa un cambio de frecuencia desde una fecha sin guardarlo", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/flujo/recurrentes");
    await expect(page.getByRole("heading", { name: "Gastos recurrentes", exact: true }).first()).toBeVisible({ timeout: 60_000 });
    const nuevo = page.getByRole("link", { name: "Nuevo gasto recurrente" });
    test.skip((await nuevo.count()) === 0, "qa-e2e sin filas de egreso");
    const fila = page.locator('a[href*="?editar="]:visible').first();
    if ((await fila.count()) === 0) {
      // Sin gastos en la empresa de prueba: crea uno ficticio para poder probar el cambio.
      await expect(async () => {
        await nuevo.first().click();
        await expect(page.getByRole("dialog").getByText("Nuevo gasto recurrente")).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 60_000 });
      await page.getByLabel("Concepto").fill(`Gasto e2e ${info.project.name}`);
      await page.getByLabel("Monto por cuota ($)").fill("50.000");
      await page.getByRole("dialog").getByRole("button", { name: "Crear" }).click();
      await expect(fila).toBeVisible({ timeout: 30_000 });
    }
    const editar = page.getByRole("dialog").filter({ has: page.getByText("Editar gasto recurrente") });
    await expect(async () => {
      await fila.click();
      await expect(editar).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await editar.getByRole("button", { name: "Cambiar desde una fecha" }).click();
    // La hoja de edición puede seguir animando su salida: se elige la que tiene «Rige desde».
    const hoja = page.getByRole("dialog").filter({ has: page.getByText("Rige desde") });
    await expect(hoja).toBeVisible();
    // Elige una frecuencia distinta de la actual (el combo es Radix, no un select nativo).
    await hoja.getByLabel("Frecuencia").click();
    await page.getByRole("option", { selected: false }).first().click();
    await capturarHoja(page, info, "flujo-recurrentes-cambio");
    await hoja.getByRole("button", { name: "Revisar cambio" }).click();
    await expect(hoja.getByText("Revisa el cambio").or(hoja.getByRole("alert")).first()).toBeVisible();
    await capturarHoja(page, info, "flujo-recurrentes-cambio-revisar");
  });
});
