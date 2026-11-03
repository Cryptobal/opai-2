import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { E2E_PASSWORD, entrar } from "./sesion";

// Brief 25 · Remuneraciones PR 1: pantallas Períodos (01), Novedades (05), Calendario (10) y Conceptos
// en Configuración › Módulos › Remuneraciones (09). Evidencia a 375, 1024 y 1280.

test.setTimeout(180_000);

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

async function conPeriodo(page: Page) {
  await page.goto("/remuneraciones");
  await expect(page.getByRole("group", { name: "Secciones de Remuneraciones" })).toBeVisible();
  await expect(
    page.getByText("Aún no hay períodos").or(page.getByRole("region", { name: "Lista de períodos" })),
  ).toBeVisible();
  if (await page.getByText("Aún no hay períodos").isVisible()) {
    const abrir = page.getByRole("button", { name: "Abrir período" }).first();
    await hidratado(abrir);
    await abrir.click();
    await page.getByRole("dialog").getByRole("button", { name: "Abrir", exact: true }).click();
    await expect(page.getByText("Abierto").first()).toBeVisible({ timeout: 30_000 });
  }
}

test.describe("Remuneraciones", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("períodos: abre un mes y muestra su estado", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    await conPeriodo(page);
    await expect(page.getByText("Abierto").first()).toBeVisible({ timeout: 30_000 });
    await captura(page, "nomina-periodos", info.project.name);
  });

  test("novedades: anticipos y préstamos enlazados desde el período", async ({ page }, info) => {
    await entrar(page);
    await conPeriodo(page);
    await page.goto("/remuneraciones/novedades");
    await expect(page.getByRole("group", { name: "Vista" })).toBeVisible();
    await page.getByRole("link", { name: "Anticipos" }).click();
    await expect(page.getByText("Anticipo quincenal").first()).toBeVisible();
    await page.getByRole("link", { name: "Préstamos" }).click();
    await expect(page.getByText("Cada cuota se descuenta en su mes").first()).toBeVisible();
    await captura(page, "nomina-novedades", info.project.name);
  });

  test("calendario: marca formatos y plazos por verificar", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/remuneraciones/calendario");
    const generar = page.getByRole("button", { name: /Generar calendario|Completar calendario/ }).first();
    await expect(generar).toBeVisible();
    await hidratado(generar);
    await generar.click();
    await expect(page.getByText("Formato por verificar").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Plazo por verificar").first()).toBeVisible();
    await captura(page, "nomina-calendario", info.project.name);
  });

  test("configuración: la pestaña Conceptos vive en Configuración › Módulos › Remuneraciones", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/nomina");
    await expect(page.getByText("Conceptos de haberes y descuentos").first()).toBeVisible();
    await expect(page.getByText("por verificar").first()).toBeVisible();
    await captura(page, "nomina-configuracion", info.project.name);
  });
});
