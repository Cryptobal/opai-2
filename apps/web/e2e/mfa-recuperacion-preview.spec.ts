import { expect, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_EMAIL, E2E_PASSWORD, entrar } from "./sesion";

// CAR-54 / CAR-454 (Sesión Núcleo): recuperar el segundo factor. Solo mira las pantallas; no regenera códigos
// ni restablece a nadie. En `preview-e2e` usa la empresa ficticia `qa-e2e`, no el usuario sembrado en gard.
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

  test("la ficha propia del owner no muestra «Restablecer segundo factor» (CAR-454)", async (
    { page },
    info,
  ) => {
    await entrar(page);
    await page.goto("/configuracion/usuarios");
    const porCorreo = page.getByRole("link", { name: new RegExp(E2E_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
    const propio = (await porCorreo.count()) > 0 ? porCorreo : page.getByRole("link", { name: /QA E2E/i });
    await propio.first().click();
    await page.waitForURL(/\?editar=/, { timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Restablecer segundo factor" })).toHaveCount(0);
    await capturarHoja(page, info, "mfa-sin-restablecer-propio");
  });

  test("en otro usuario el owner ve «Restablecer segundo factor» con su advertencia", async (
    { page },
    info,
  ) => {
    await entrar(page);
    await page.goto("/configuracion/usuarios");
    const total = await page.locator('tbody a[href*="?editar="]').count();
    for (let i = 0; i < total; i++) {
      await page.goto("/configuracion/usuarios");
      await page.locator('tbody a[href*="?editar="]').nth(i).click();
      await page.waitForURL(/\?editar=/, { timeout: 60_000 });
      const boton = page.getByRole("button", { name: "Restablecer segundo factor" });
      if (!(await boton.isVisible({ timeout: 5_000 }).catch(() => false))) {
        continue;
      }
      await boton.click();
      const dialogo = page.getByRole("dialog", { name: /^¿Restablecer el segundo factor de / });
      await expect(dialogo.getByText(/Esta acción es irreversible/)).toBeVisible();
      await capturarHoja(page, info, "mfa-restablecer-dialogo");
      await dialogo.getByRole("button", { name: "Cancelar" }).click();
      await expect(dialogo).toBeHidden();
      return;
    }
    test.skip(true, "No hay otro usuario con segundo factor activo en esta empresa");
  });
});