import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// Brief 07 · PR 1 — evidencia visual de Negocios y Contactos a 375, 1024 y 1280 px, con el mismo
// shell que /cuentas e /instalaciones. No es regresión visual: son capturas de evidencia (QA), en
// test-results/ (no en el árbol fuente). El login comparte sesion.ts (contraseña y TOTP).
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("Comercial · Negocios y Contactos", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Negocios: lista y ficha", async ({ page }, info) => {
    await entrar(page);
    // Desde el PR 1b el tablero es la vista por defecto; la lista sigue en ?vista=lista.
    await page.goto("/negocios?vista=lista");
    const lista = page.getByRole("region", { name: "Lista de negocios" });
    await expect(lista).toBeVisible();
    await page.screenshot({ path: info.outputPath("negocios-lista.png"), fullPage: true });
    const primero = lista.locator('a[href^="/negocios/"]').first();
    if (await primero.count()) {
      await primero.click();
      await page.waitForURL(/\/negocios\/[0-9a-f-]{36}/);
      await expect(page.getByRole("link", { name: /^Actividad/ }).first()).toBeVisible();
      await page.screenshot({ path: info.outputPath("negocio-ficha.png"), fullPage: true });
    }
  });

  test("Contactos: lista y ficha", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/contactos");
    const lista = page.getByRole("region", { name: "Lista de contactos" });
    await expect(lista).toBeVisible();
    await page.screenshot({ path: info.outputPath("contactos-lista.png"), fullPage: true });
    const primero = lista.locator('a[href^="/contactos/"]').first();
    if (await primero.count()) {
      await primero.click();
      await page.waitForURL(/\/contactos\/[0-9a-f-]{36}/);
      await page.screenshot({ path: info.outputPath("contacto-ficha.png"), fullPage: true });
    }
  });
});
