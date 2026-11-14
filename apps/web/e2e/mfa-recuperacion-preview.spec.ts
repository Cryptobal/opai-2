import { expect, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-54 (Sesión Núcleo): recuperar el segundo factor. Solo mira las pantallas; no regenera códigos
// ni restablece a nadie (la cuenta de QA usa su app autenticadora en las demás pruebas).
test.describe("@preview recuperar el segundo factor", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("Mi cuenta ofrece regenerar los códigos de respaldo", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/mi-cuenta");
    await expect(page.getByRole("heading", { name: "App autenticadora" })).toBeVisible({
      timeout: 60_000,
    });
    const boton = page.getByRole("button", { name: "Regenerar códigos de respaldo" });
    await expect(boton).toBeVisible();
    await boton.click();
    await expect(page.getByLabel("Tu contraseña", { exact: true })).toBeVisible();
    await capturar(page, info, "mfa-regenerar-codigos");
    await page.getByRole("button", { name: "Cancelar" }).click();
  });

  test("el owner ve «Restablecer segundo factor» con su advertencia", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/usuarios");
    await page.locator('a[href*="?editar="]').first().click();
    await page.waitForURL(/\?editar=/, { timeout: 60_000 });
    await page.getByRole("button", { name: "Restablecer segundo factor" }).click();
    const dialogo = page.getByRole("dialog", { name: /^¿Restablecer el segundo factor de / });
    await expect(dialogo.getByText(/Esta acción es irreversible/)).toBeVisible();
    await capturarHoja(page, info, "mfa-restablecer-dialogo");
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
  });
});
