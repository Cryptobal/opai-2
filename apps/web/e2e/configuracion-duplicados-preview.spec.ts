import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { entrar } from "./sesion";

test.describe("@preview CAR-581: marca y correos de notificación", () => {
  test("marca con documento y usuarios con correos de notificación", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/marca");
    await expect(page.getByLabel("Tipografía del PDF")).toBeVisible();
    await capturar(page, info, "car581-marca");
    await page.goto("/configuracion/usuarios");
    const formulario = page.locator("form").filter({
      has: page.getByRole("heading", { name: "Correos de notificación", exact: true }),
      visible: true,
    });
    await expect(formulario).toHaveCount(1);
    await expect(formulario.getByRole("heading", { name: "Correos de notificación", exact: true })).toBeVisible();
    await expect(formulario.getByLabel(/^Correo de notificación por defecto(?:\s|$)/)).toBeVisible();
    await capturar(page, info, "car581-usuarios-correos");
  });
});
