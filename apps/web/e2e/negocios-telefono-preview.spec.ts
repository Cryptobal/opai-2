import { expect, test } from "@playwright/test";

import { abrirMenuNegocios } from "./negocios-ayuda";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-371: en el teléfono, Negocios deja «Nuevo negocio» como única acción a la vista y el resto
// (seguimiento, reportes, transferir, exportar) en el menú «⋯». Desde 1024 px siguen como botones.
test.describe("@preview comercial: acciones de negocios por tamaño", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("las acciones secundarias van al menú ⋯ solo en el teléfono", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/negocios");
    await expect(page.getByRole("heading", { name: "Negocios" }).first()).toBeVisible({ timeout: 60_000 });
    const reportes = page.getByRole("link", { name: "Reportes", exact: true });
    const menu = page.getByRole("button", { name: "Más acciones de negocios" });
    if (info.project.name === "telefono") {
      await expect(reportes).toBeHidden();
      // Sin la animación de entrada (150 ms) la captura muestra el menú ya opaco.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await abrirMenuNegocios(page);
      await expect(page.getByRole("menuitem", { name: "Pendientes de seguimiento" })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Reportes" })).toBeVisible();
      await capturar(page, info, "comercial-negocios-menu-mas");
      await page.keyboard.press("Escape");
    } else {
      await expect(reportes).toBeVisible();
      await expect(menu).toBeHidden();
    }
    await capturar(page, info, "comercial-negocios-acciones");
  });
});
