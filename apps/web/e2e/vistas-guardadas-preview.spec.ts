import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-335 D4c: guardar los filtros de Cuentas como vista, aplicarla desde «Vistas» y quitarla.
test.describe("@preview listas: vistas guardadas", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("guardar, aplicar y quitar una vista de Cuentas", async ({ page }, info) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "Se prueba una vez por tamaño grande");
    const nombre = `Prueba ${Date.now()}`;
    await entrar(page);
    await page.goto("/cuentas?estado=cliente_activo");
    const vistas = page.getByRole("button", { name: "Vistas guardadas" }).filter({ visible: true });
    await expect(vistas).toBeVisible({ timeout: 60_000 });
    await vistas.hover();
    await vistas.click();
    await page.getByRole("menuitem", { name: "Guardar esta vista…" }).click();
    const dialogo = page.getByRole("dialog", { name: "Guardar esta vista" });
    await dialogo.getByLabel("Nombre").fill(nombre);
    await dialogo.getByRole("button", { name: "Guardar vista" }).click();
    await expect(page.getByText(`Vista «${nombre}» guardada`)).toBeVisible();
    await page.goto("/cuentas");
    await vistas.hover();
    await vistas.click();
    await expect(page.getByRole("menuitem", { name: nombre, exact: true })).toBeVisible();
    await capturar(page, info, "cuentas-vistas-menu");
    await page.getByRole("menuitem", { name: nombre, exact: true }).click();
    await expect(page).toHaveURL(/\/cuentas\?estado=cliente_activo$/);
    await vistas.click();
    await page.getByRole("menuitem", { name: `Quitar «${nombre}»` }).click();
    await expect(page.getByText(`Vista «${nombre}» quitada`)).toBeVisible();
  });
});
