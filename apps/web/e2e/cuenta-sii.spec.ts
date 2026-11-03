import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-162 · Cuenta con datos del SII: evidencia de `DatosSII` en /ds/qa a 375, 1024 y 1280 (proyectos
// de playwright.config) y, con sesión, del bloque «Datos tributarios» de una cuenta. No llama al SII:
// sin la API key del tenant, la hoja muestra «no configurada».
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test("DatosSII · estados en /ds/qa", async ({ page }, info) => {
  await page.goto("/ds/qa");
  const m = page.getByTestId("muestra-sii");
  await expect(m.getByText("Lista para facturar al aplicar")).toBeVisible();
  await expect(m.getByText("El SII no responde")).toBeVisible();
  await expect(m.getByText("Contribuyente sin inicio de actividades")).toBeVisible();
  await expect(m.getByText("Consulta al SII no configurada")).toBeVisible();
  await m.getByRole("button", { name: "Mantener lo mío" }).first().click();
  await expect(m.getByText(/cambia 1 campo al aplicar/)).toBeVisible();
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(ancho).toBeLessThanOrEqual(0);
  await m.screenshot({ path: info.outputPath("datos-sii.png") });
});

test.describe("Cuenta · datos tributarios", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test("el resumen muestra «Lista para facturar» o lo que falta", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/cuentas");
    const primera = page.locator('a[href^="/cuentas/"]').first();
    test.skip(!(await primera.count()), "Sin cuentas en este entorno");
    await primera.click();
    await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}/);
    await expect(page.getByText("Datos tributarios")).toBeVisible();
    await expect(page.getByText(/Lista para facturar|para facturar/).first()).toBeVisible();
    await page.screenshot({
      path: info.outputPath("cuenta-datos-tributarios.png"),
      fullPage: true,
    });
  });
});
