import { expect, test, type Locator, type Page } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

async function abrirMenuAccionesFicha(detalle: Locator) {
  await detalle
    .getByRole("button", { name: /^(Acciones de|Más acciones)/ })
    .filter({ visible: true })
    .click();
}

/** «Fijar» en cabecera desde 1024 px; en el menú ⋯ bajo ese ancho (CAR-65). */
async function esperarFijarVisible(page: Page, detalle: Locator, enCabecera: boolean) {
  if (enCabecera) {
    await expect(detalle.getByRole("button", { name: /^(Fijar|Desfijar)$/ })).toBeVisible();
    return;
  }
  await abrirMenuAccionesFicha(detalle);
  await expect(page.getByRole("menuitem", { name: /^(Fijar|Desfijar)$/ })).toBeVisible();
  await page.keyboard.press("Escape");
}

// CAR-546: cabecera estándar y «Nueva» primaria con ficha abierta (revierte CAR-360).
test.describe("@preview CAR-546 cabecera de ficha", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("cuentas: Nueva primario, Editar y Fijar en la ficha", async ({ page }, info) => {
    test.setTimeout(120_000);
    const split = info.project.name !== "telefono";
    const enCabecera = info.project.name !== "telefono";
    await entrar(page);
    await page.goto("/cuentas");
    const nueva = page.getByRole("link", { name: "Nueva", exact: true });
    await expect(nueva).toBeVisible({ timeout: 30_000 });
    await expect(nueva).toHaveClass(/ds-primario/);
    const fila = page.locator('a[href^="/cuentas/"]').filter({ visible: true }).first();
    test.skip(!(await fila.isVisible().catch(() => false)), "qa-e2e sin cuentas");
    await fila.click();
    await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}/, { timeout: 60_000 });
    if (split) {
      await expect(page.getByRole("link", { name: "Nueva cuenta", exact: true })).toHaveCount(0);
      await expect(nueva).toHaveClass(/ds-primario/);
    }
    const detalle = page.locator("[data-detalle]");
    await expect(detalle.getByRole("link", { name: "Editar", exact: true }).first()).toBeVisible();
    await esperarFijarVisible(page, detalle, enCabecera);
    if (split) {
      await detalle.getByRole("tab", { name: "Contactos" }).click();
      await page.waitForURL(/\/contactos/, { timeout: 30_000 });
      await esperarFijarVisible(page, detalle, enCabecera);
    }
    await capturar(page, info, "car546-cuenta-ficha");
  });

  test("personas: Editar visible y sin duplicado en el menú", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/personas");
    const fila = page.locator('a[href^="/personas/"]').filter({ visible: true }).first();
    test.skip(!(await fila.isVisible().catch(() => false)), "qa-e2e sin personas");
    await fila.click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}/, { timeout: 60_000 });
    const detalle = page.locator("[data-detalle]");
    await expect(detalle.getByRole("link", { name: "Editar", exact: true }).first()).toBeVisible();
    await abrirMenuAccionesFicha(detalle);
    await expect(page.getByRole("menu").getByRole("menuitem", { name: /^Editar/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await capturar(page, info, "car546-persona-ficha");
  });
});