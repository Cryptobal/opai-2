import { expect, type Page, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-336 (diseño nuevo, ADR-109): desde 1024 px la lista de Cuentas usa todo el ancho mientras no hay
// ficha, y al abrir una cuenta la ficha toma cerca del 58 %. Con el usuario de qa-e2e; el diseño se
// elige por la cookie de este navegador (no cambia la preferencia guardada) y se restaura al final.
const conDiseno = async (page: Page, valor: string) =>
  page
    .context()
    .addCookies([{ name: "opai_marco", value: valor, url: new URL(page.url()).origin }]);
const ancho = async (page: Page, columna: string) =>
  (await page.locator(`[data-split] > [data-columna="${columna}"]`).first().boundingBox())?.width ??
  0;

test.describe("@preview listas con ficha a la derecha en el diseño nuevo", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la lista usa todo el ancho sin ficha y la ficha toma el 58 % al abrirla", async ({
    page,
  }, info) => {
    test.setTimeout(180_000);
    await entrar(page);
    try {
      await conDiseno(page, "nuevo");
      await page.goto("/cuentas");
      await expect(page.locator('[data-split] > [data-columna="lista"]').first()).toBeVisible({
        timeout: 60_000,
      });
      await capturar(page, info, "nuevo-cuentas-lista");
      if ((page.viewportSize()?.width ?? 0) < 1024) return;
      const contenedor = (await page.locator("[data-split]").first().boundingBox())?.width ?? 0;
      expect(await ancho(page, "lista")).toBeGreaterThan(contenedor * 0.95);
      const fila = page.locator('[data-columna="lista"] a[href^="/cuentas/"]').first();
      if ((await fila.count()) === 0) return;
      await fila.click();
      await expect(page).toHaveURL(/\/cuentas\/[0-9a-f-]+/, { timeout: 60_000 });
      await expect(page.locator('[data-split] > [data-columna="detalle"]').first()).toBeVisible();
      const lista = await ancho(page, "lista");
      const detalle = await ancho(page, "detalle");
      expect(detalle / (lista + detalle)).toBeGreaterThan(0.5);
      await capturar(page, info, "nuevo-cuentas-ficha");
    } finally {
      await conDiseno(page, "");
    }
  });
});
