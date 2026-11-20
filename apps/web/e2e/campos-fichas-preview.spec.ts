import { expect, type Page, test } from "@playwright/test";

import { ocultarIndicadorDev } from "./indicador-dev";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-536: los campos personalizados en las fichas de instalación y persona, en `preview-e2e` con el
// usuario de la empresa ficticia `qa-e2e` (nunca Gard). Si la ficha aún no tiene el campo de prueba,
// lo crea una sola vez en Configuración (solo la definición, en qa-e2e); después abre la ficha, ve la
// tarjeta y la hoja «Editar campos» y cancela sin guardar valores.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const CAMPO = "QA turno preferido";

async function asegurarCampo(page: Page, ficha: "Instalaciones" | "Personas"): Promise<void> {
  await page.goto("/configuracion/campos-personalizados");
  const seccion = page.locator("section").filter({ has: page.getByRole("heading", { name: ficha, exact: true }) });
  await expect(seccion).toBeVisible({ timeout: 20_000 });
  if ((await seccion.getByText(CAMPO, { exact: true }).count()) > 0) return;
  await seccion.getByRole("button", { name: "Nuevo campo" }).click();
  const hoja = page.getByRole("dialog");
  await hoja.getByLabel("Nombre").fill(CAMPO);
  await hoja.getByRole("combobox", { name: "Tipo" }).or(hoja.getByRole("button", { name: "Tipo" })).click();
  await page.getByRole("option", { name: "Botones de opción (una opción)" }).click();
  for (const [i, etiqueta] of ["Día", "Noche"].entries()) {
    await hoja.getByRole("button", { name: "Agregar opción" }).click();
    await hoja.getByLabel(`Etiqueta de la opción ${i + 1}`).fill(etiqueta);
  }
  await hoja.getByRole("button", { name: "Guardar" }).click();
  await expect(hoja).toBeHidden();
}

async function abrirPrimera(page: Page, ruta: "/instalaciones" | "/personas"): Promise<void> {
  await page.goto(ruta);
  const enlace = page
    .locator(`a[href^="${ruta}/"]:not([href*="nueva"]):not([href*="vencimientos"])`)
    .filter({ visible: true })
    .first();
  await expect(enlace, `qa-e2e tiene al menos una ficha en ${ruta}`).toBeVisible({ timeout: 20_000 });
  await enlace.click();
  await page.waitForURL(new RegExp(`${ruta}/[0-9a-f-]{36}`));
}

test.describe("@preview campos personalizados en fichas", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");
  test.beforeEach(({ page }) => ocultarIndicadorDev(page));

  for (const [ficha, ruta, nombre] of [
    ["Instalaciones", "/instalaciones", "instalacion"],
    ["Personas", "/personas", "persona"],
  ] as const) {
    test(`la ficha de ${nombre} muestra y edita los campos de la empresa`, async ({ page }, info) => {
      const errores: string[] = [];
      page.on("pageerror", (e) => errores.push(e.name));
      await entrar(page);
      await asegurarCampo(page, ficha);
      await abrirPrimera(page, ruta);
      const tarjeta = page.locator("section").filter({ hasText: CAMPO }).last();
      await expect(tarjeta).toBeVisible({ timeout: 20_000 });
      await capturar(page, info, `campos-ficha-${nombre}`);
      await tarjeta.getByRole("button", { name: "Editar" }).click();
      const hoja = page.getByRole("dialog");
      await expect(hoja.getByRole("radio", { name: "Noche" })).toBeVisible();
      await capturar(page, info, `campos-ficha-${nombre}-editar`);
      await hoja.getByRole("button", { name: "Cancelar" }).click();
      await expect(hoja).toBeHidden();
      expect(errores).toEqual([]);
    });
  }
});
