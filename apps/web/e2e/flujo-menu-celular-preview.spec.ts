import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-570: en la vista de tarjetas el menú ⋯ de la cabecera se ve y abre. CAR-537: si hay aviso de
// cobros, la X lo cierra y no vuelve al recargar. No escribe en qa-e2e.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview flujo de caja en celular", () => {
  test("el menú de la cabecera abre y el aviso se puede cerrar", async ({ page }, info) => {
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
    test.skip((page.viewportSize()?.width ?? 0) >= 1280, "El menú ⋯ se prueba en teléfono e iPad.");
    await entrar(page);
    await page.goto("/finanzas/flujo?vista=movil");
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({ timeout: 60_000 });
    const menu = page.getByRole("button", { name: "Acciones del flujo" });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole("menuitem", { name: "Resumen por mes" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Vista de planilla" })).toBeVisible();
    await page.keyboard.press("Escape");
    await capturar(page, info, "flujo-menu-celular");

    const cerrar = page.getByRole("button", { name: "Cerrar avisos" });
    if ((await cerrar.count()) === 0) return;
    await cerrar.click();
    await expect(cerrar).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Cerrar avisos" })).toHaveCount(0);
  });
});
