import { expect, test, type Locator, type Page } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

const ENLACE_PERSONA = 'a[href^="/personas/"]:not([href*="vencimientos"])';

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

function nuevaLista(page: Page) {
  return page.getByRole("link", { name: "Nueva", exact: true }).filter({ visible: true });
}

// CAR-546: cabecera estándar y «Nueva» primaria con ficha abierta (revierte CAR-360).
test.describe("@preview CAR-546 cabecera de ficha", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("cuentas: Nueva primario, Editar y Fijar en la ficha", async ({ page }, info) => {
    test.setTimeout(120_000);
    const enCabecera = info.project.name !== "telefono";
    await entrar(page);
    await page.goto("/cuentas");
    await expect(nuevaLista(page)).toHaveClass(/ds-primario/);
    const fila = page.locator('a[href^="/cuentas/"]').filter({ visible: true }).first();
    await expect(fila, "qa-e2e sin cuentas").toBeVisible({ timeout: 30_000 });
    await fila.click();
    await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}/, { timeout: 60_000 });
    await expect(page.getByRole("link", { name: "Nueva cuenta", exact: true })).toHaveCount(0);
    // En teléfono el panel lista queda oculto con ficha abierta (`SplitScreen` telefono=detalle).
    if (enCabecera) {
      await expect(nuevaLista(page)).toHaveClass(/ds-primario/);
    }
    const detalle = page.locator("[data-detalle]");
    await expect(detalle.getByRole("link", { name: "Editar", exact: true })).toBeVisible();
    await esperarFijarVisible(page, detalle, enCabecera);
    if (enCabecera) {
      await detalle.getByRole("tab", { name: "Contactos" }).click();
      await page.waitForURL(/\/contactos/, { timeout: 30_000 });
      await esperarFijarVisible(page, detalle, true);
    }
    await capturar(page, info, "car546-cuenta-ficha");
  });

  test("personas: Editar visible y sin duplicado en el menú", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/personas");
    const fila = page.locator(ENLACE_PERSONA).filter({ visible: true }).first();
    await expect(fila, "qa-e2e sin personas").toBeVisible({ timeout: 30_000 });
    await fila.click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}/, { timeout: 60_000 });
    const detalle = page.locator("[data-detalle]");
    await expect(detalle.getByRole("link", { name: "Editar", exact: true })).toBeVisible();
    await detalle.getByRole("button", { name: "Más acciones" }).click();
    await expect(page.getByRole("menu").getByRole("menuitem", { name: /^Editar/ })).toHaveCount(0);
    await capturar(page, info, "car546-persona-ficha");
  });
});