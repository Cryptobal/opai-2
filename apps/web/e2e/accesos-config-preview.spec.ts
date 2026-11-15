import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-479: configuración de acceso de la empresa y su herencia en la pestaña Accesos de la instalación.
test.describe("@preview acceso: configuración de formulario y reglas", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("empresa: Configuración › Módulos › Control de acceso", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/acceso?seccion=formulario");
    await expect(
      page.getByRole("button", { name: "Guardar configuración" }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "accesos-config-empresa");
  });

  test("instalación: segmento Configuración hereda de la empresa", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/instalaciones");
    const fila = page.locator('a[href^="/instalaciones/0"]').filter({ visible: true }).first();
    await expect(fila).toBeVisible({ timeout: 60_000 });
    const href = await fila.getAttribute("href");
    await page.goto(`${href}/accesos?sub=config`);
    await expect(
      page.getByText("Usa la configuración de la empresa").filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: "Guardar puntos" }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar bienvenida" }).filter({ visible: true }).first(),
    ).toBeVisible();
    await capturar(page, info, "accesos-config-instalacion");
  });
});
