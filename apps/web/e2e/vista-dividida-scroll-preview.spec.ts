import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

/** CAR-548: en vista dividida el documento no scrollea; las columnas sí. */
test.describe("@preview vista dividida: scroll por columna", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  async function comprobarScrollDividido(page: import("@playwright/test").Page) {
    await page.waitForSelector('[data-split][data-columna="lista"]', { timeout: 60_000 });
    const medidas = await page.evaluate(() => {
      const doc = document.documentElement;
      const lista = document.querySelector('[data-columna="lista"]');
      const detalle = document.querySelector('[data-columna="detalle"]');
      return {
        docAlto: doc.scrollHeight,
        ventana: window.innerHeight,
        lista: lista
          ? { scroll: lista.scrollHeight, alto: lista.clientHeight, overflowY: getComputedStyle(lista).overflowY }
          : null,
        detalle: detalle
          ? {
              scroll: detalle.scrollHeight,
              alto: detalle.clientHeight,
              overflowY: getComputedStyle(detalle).overflowY,
            }
          : null,
      };
    });
    expect(medidas.docAlto).toBeLessThanOrEqual(medidas.ventana + 2);
    expect(medidas.lista?.overflowY).toBe("auto");
    expect(medidas.detalle?.overflowY).toBe("auto");
    if (medidas.lista && medidas.lista.scroll > medidas.lista.alto + 8) {
      expect(medidas.lista.scroll).toBeGreaterThan(medidas.lista.alto);
    }
  }

  test("cuentas a 1280: columnas con scroll, página fija", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/cuentas");
    const fila = page.locator('a[href^="/cuentas/"]').filter({ visible: true }).first();
    const hay = await fila.isVisible({ timeout: 30_000 }).catch(() => false);
    test.skip(!hay, "qa-e2e no tiene cuentas");
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
    const hay = await fila.isVisible({ timeout: 30_000 }).catch(() => false);
    test.skip(!hay, "qa-e2e no tiene cuentas");
    await fila.click();
    await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}/, { timeout: 60_000 });
    await comprobarScrollDividido(page);
    await capturar(page, info, "cuentas-scroll-1024");
  });
});