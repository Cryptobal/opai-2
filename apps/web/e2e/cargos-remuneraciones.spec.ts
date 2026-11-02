import { expect, type Page, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test.setTimeout(180_000);

test.describe("Cargos y Remuneraciones (pantallas)", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Cargos: lista y ficha a 375, 1024 y 1280", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/cargos");
    await expect(page.getByRole("region", { name: "Lista de cargos" })).toBeVisible();
    const ancho = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(ancho).toBeLessThanOrEqual(1);
    await captura(page, "maestros-consistencia-cargos", info.project.name);
    const fila = page.locator('a[href^="/cargos/"][href*="-"]').first();
    if (await fila.count()) {
      await fila.click();
      await page.waitForURL(/\/cargos\/[0-9a-f-]{36}/);
      await expect(page.getByRole("region", { name: "Detalle" })).toBeVisible();
      await expect(page.getByText("Los sueldos se definen en instalación")).toBeVisible();
    }
  });

  test("Remuneraciones: título, Beta y lista con ficha", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/remuneraciones");
    await expect(page.getByText("Beta").first()).toBeVisible();
    await expect(page.getByRole("group", { name: "Secciones de Remuneraciones" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Lista de períodos" })).toBeVisible();
    await captura(page, "nomina-periodos-vista", info.project.name);
    const fila = page.locator('a[href^="/remuneraciones/"][href*="-"]').first();
    if (await fila.count()) {
      await fila.click();
      await page.waitForURL(/\/remuneraciones\/[0-9a-f-]{36}/);
      await expect(page.getByRole("region", { name: "Detalle" })).toBeVisible();
      const pasar = page.getByRole("button", { name: "Pasar a revisión" }).first();
      if (await pasar.isVisible()) {
        if (await page.getByText("0 novedades vigentes").first().isVisible()) {
          await expect(pasar).toBeDisabled();
          await expect(page.getByText("Registra al menos una novedad")).toBeVisible();
        }
      }
    }
  });

  test("redirección desde /nomina", async ({ page }) => {
    await entrar(page);
    await page.goto("/nomina/novedades");
    await expect(page).toHaveURL(/\/remuneraciones\/novedades/);
  });
});
