import { expect, test, type Page } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

/** CAR-548: en vista dividida el documento no scrollea; las columnas sí. */
test.describe("@preview vista dividida: scroll por columna", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  async function comprobarScrollDividido(page: Page) {
    // Next puede conservar la ruta anterior oculta: medir solo la ficha visible, no el índice.
    const split = page.locator('[data-split]:not([data-sin-detalle])').filter({ visible: true });
    await expect(split).toHaveCount(1, { timeout: 60_000 });
    const lista = split.locator(':scope > [data-columna="lista"]');
    const detalle = split.locator(':scope > [data-columna="detalle"]');
    await expect(lista).toBeVisible();
    await expect(detalle).toBeVisible();
    // Esperar el layout de la ficha sin relajar el umbral de 2 px.
    await expect(async () => {
      const medidas = await split.evaluate((el) => ({
        docAlto: document.documentElement.scrollHeight,
        ventana: window.innerHeight,
        lista: getComputedStyle(el.querySelector(':scope > [data-columna="lista"]')!).overflowY,
        detalle: getComputedStyle(el.querySelector(':scope > [data-columna="detalle"]')!).overflowY,
      }));
      expect(medidas.docAlto).toBeLessThanOrEqual(medidas.ventana + 2);
      expect(medidas.lista).toBe("auto");
      expect(medidas.detalle).toBe("auto");
    }).toPass({ timeout: 15_000 });
    for (const nombre of ["lista", "detalle"] as const) {
      const columna = split.locator(`:scope > [data-columna="${nombre}"]`);
      const desplazamiento = await columna.evaluate((el) => {
        if (el.scrollHeight <= el.clientHeight) return null;
        const otra = el.parentElement?.querySelector(
          `:scope > [data-columna]:not([data-columna="${el.getAttribute("data-columna")}"])`,
        );
        const antes = { propio: el.scrollTop, otra: otra?.scrollTop, documento: window.scrollY };
        el.scrollTop = antes.propio === 0 ? 1 : 0;
        const resultado = {
          seMovio: el.scrollTop !== antes.propio,
          otraFija: otra?.scrollTop === antes.otra,
          documentoFijo: window.scrollY === antes.documento,
        };
        el.scrollTop = antes.propio;
        return resultado;
      });
      // Si hay contenido desbordado, el scroll debe mover solo esa columna.
      if (desplazamiento) {
        expect(desplazamiento).toEqual({ seMovio: true, otraFija: true, documentoFijo: true });
      }
    }
  }

  test("cuentas a 1280: columnas con scroll, página fija", async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 860 });
    await entrar(page);
    await page.goto("/cuentas");
    const fila = page.locator('a[href^="/cuentas/"]').filter({ visible: true }).first();
    // No confundir la carga pendiente con una empresa sin cuentas ni ocultar la prueba.
    await expect(fila, "qa-e2e necesita al menos una cuenta para comprobar el scroll").toBeVisible({
      timeout: 30_000,
    });
    await fila.click();
    await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}/, { timeout: 60_000 });
    await comprobarScrollDividido(page);
    await capturar(page, info, "cuentas-scroll-dividido");
  });

  test("cuentas a 1024: columnas con scroll, página fija", async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1024, height: 768 });
    await entrar(page);
    await page.goto("/cuentas");
    const fila = page.locator('a[href^="/cuentas/"]').filter({ visible: true }).first();
    // No confundir la carga pendiente con una empresa sin cuentas ni ocultar la prueba.
    await expect(fila, "qa-e2e necesita al menos una cuenta para comprobar el scroll").toBeVisible({
      timeout: 30_000,
    });
    await fila.click();
    await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}/, { timeout: 60_000 });
    await comprobarScrollDividido(page);
    await capturar(page, info, "cuentas-scroll-1024");
  });
});
