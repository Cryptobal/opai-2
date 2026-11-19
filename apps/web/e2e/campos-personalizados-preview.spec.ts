import { expect, test } from "@playwright/test";

import { ocultarIndicadorDev } from "./indicador-dev";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-27 · CAR-536: Configuración › Campos personalizados. Corre en `preview-e2e` con el usuario de la
// empresa ficticia `qa-e2e` (nunca Gard) y no escribe nada: abre la hoja «Nuevo campo», elige
// «Desplegable», agrega dos opciones con etiqueta y valor, las reordena y cancela.
test.describe("@preview campos personalizados", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");
  test.beforeEach(({ page }) => ocultarIndicadorDev(page));

  test("lista las fichas y abre la hoja de un campo nuevo con opciones", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/configuracion/campos-personalizados");
    for (const entidad of ["Cuentas", "Contactos", "Instalaciones", "Personas"]) {
      await expect(page.getByRole("heading", { name: entidad, exact: true })).toBeVisible({
        timeout: 20_000,
      });
    }
    await capturar(page, info, "campos-personalizados");

    await page.getByRole("button", { name: "Nuevo campo" }).first().click();
    const hoja = page.getByRole("dialog");
    await expect(hoja.getByText("Nuevo campo", { exact: true })).toBeVisible({ timeout: 15_000 });
    await hoja.getByLabel("Nombre").fill("Rubro");
    // El selector del DS es combobox en escritorio y botón que abre una hoja en táctil (iPad).
    await hoja
      .getByRole("combobox", { name: "Tipo" })
      .or(hoja.getByRole("button", { name: "Tipo" }))
      .click();
    await page.getByRole("option", { name: "Desplegable (una opción)" }).click();
    await hoja.getByRole("button", { name: "Agregar opción" }).click();
    await hoja.getByLabel("Etiqueta de la opción 1").fill("Minería");
    await hoja.getByLabel("Valor interno de la opción 1").fill("mineria");
    await hoja.getByRole("button", { name: "Agregar opción" }).click();
    await hoja.getByLabel("Etiqueta de la opción 2").fill("Retail");
    await hoja.getByRole("button", { name: "Subir" }).nth(1).click();
    await expect(hoja.getByLabel("Etiqueta de la opción 1")).toHaveValue("Retail");
    await expect(hoja.getByText("Valor por defecto")).toBeVisible();
    await capturar(page, info, "campos-personalizados-nuevo");
    await hoja.getByRole("button", { name: "Cancelar" }).click();
    await expect(hoja).toBeHidden();
    expect(errores).toEqual([]);
  });
});
