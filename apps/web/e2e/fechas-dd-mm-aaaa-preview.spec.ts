import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-368 (Sesión Diseño): «Válida hasta» de Nueva cotización usa el campo de fecha del DS
// (dd-mm-aaaa), no el nativo del navegador. Corre en `preview-e2e` con el usuario de `qa-e2e`.
test.describe("@preview fechas dd-mm-aaaa", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("Nueva cotización: «Válida hasta» se escribe como dd-mm-aaaa", async ({ page }, info) => {
    test.setTimeout(150_000);
    await entrar(page);
    await page.goto("/cotizaciones/nueva");
    const campo = page.locator("#cpq-valida");
    await expect(campo).toBeVisible({ timeout: 60_000 });
    await expect(campo).not.toHaveAttribute("type", "date");
    await expect(campo).toHaveAttribute("placeholder", "dd-mm-aaaa");
    await expect(page.getByRole("button", { name: "Abrir calendario" })).toBeVisible();
    await capturar(page, info, "fechas-cotizacion-nueva");
  });
});
