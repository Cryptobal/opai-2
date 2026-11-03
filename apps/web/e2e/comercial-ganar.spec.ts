import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-162 · Ganar con efectos: evidencia de «Qué va a pasar» a 375, 1024 y 1280 (proyectos de
// playwright.config). La muestra de /ds/qa no necesita sesión ni datos; la hoja real se captura
// solo si hay un negocio abierto con inicio de servicio (no gana: solo abre la vista previa).
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test("Ganar · muestra de efectos en /ds/qa", async ({ page }, info) => {
  await page.goto("/ds/qa");
  const m = page.getByTestId("muestra-ganar");
  await expect(m.getByText("La cuenta pasa a Cliente activo")).toBeVisible();
  await expect(m.getByText("Se activan 2 instalaciones: Bodega Sur, Planta Norte")).toBeVisible();
  await expect(m.getByText("La cotización CPQ-2026-127 v2 queda aceptada")).toBeVisible();
  await expect(m.getByText("Se ofrecerán 4 puestos a RRHH")).toBeVisible();
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(ancho).toBeLessThanOrEqual(0);
  await m.screenshot({ path: info.outputPath("ganar-efectos.png") });
});

test.describe("Ganar · hoja real", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test("abre la hoja con la vista previa de efectos", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/negocios?vista=lista");
    const lista = page.getByRole("region", { name: "Lista de negocios" });
    await expect(lista).toBeVisible();
    const primero = lista.locator('a[href^="/negocios/"]').first();
    test.skip(!(await primero.count()), "Sin negocios en este entorno");
    await primero.click();
    await page.waitForURL(/\/negocios\/[0-9a-f-]{36}/);
    await page.goto(`${new URL(page.url()).pathname}?ganar=1`);
    const hoja = page.getByRole("dialog", { name: "Ganar negocio" });
    test.skip(!(await hoja.isVisible().catch(() => false)), "El negocio no está abierto");
    await page.screenshot({ path: info.outputPath("ganar-hoja.png"), fullPage: true });
  });
});
