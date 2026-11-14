import { expect, test } from "@playwright/test";

import { captura, erroresDeConsola } from "./hilo-apoyo";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-335 D6e: el portal del trabajador con el diseño nuevo (usuario de la empresa ficticia qa-e2e).
// La piel nueva llega desde el servidor y, en el teléfono, la barra de abajo conserva las pestañas
// del portal (Inicio, Mis datos…) en vez de Inicio, Agente, Menú y Yo.
test.describe("@preview portal trabajador con el diseño nuevo", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("piel nueva y pestañas propias del portal", async ({ page }, info) => {
    test.setTimeout(180_000);
    const errores = erroresDeConsola(page);
    await entrar(page);
    const documento = await page.goto("/trabajador");
    expect(await documento?.text()).toContain('data-marco="nuevo"');
    const marco = page.locator('div[data-marco="nuevo"]');
    await expect(marco).toBeVisible({ timeout: 60_000 });
    await expect(marco).toHaveAttribute("data-pestanas", "portal");
    await expect(page.locator('nav[data-shell="inferior-nuevo"]')).toHaveCount(0);
    if ((page.viewportSize()?.width ?? 0) < 768) {
      const barra = page.locator('nav[aria-label="Principal"].fixed');
      await expect(barra).toBeVisible();
      await expect(barra.getByRole("link", { name: "Inicio" })).toBeVisible();
    }
    await expect(page.getByText("No pudimos cargar esta información")).toHaveCount(0);
    await captura(page, "trabajador-diseno-nuevo", info);
    expect(errores).toEqual([]);
  });
});
