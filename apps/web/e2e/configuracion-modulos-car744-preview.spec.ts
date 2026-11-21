import { expect, type Page, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// La lista del grupo Módulos (CAR-744) compila en frío en la vista previa: entramos por la portada.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const urlGrupoModulos = /\/configuracion\/grupo\/modulos$/;

async function abrirGrupoModulos(page: Page) {
  await page.goto("/configuracion");
  const tarjeta = page.locator('main a[href="/configuracion/grupo/modulos"]').filter({ visible: true });
  await expect(tarjeta, "qa-e2e debería ver la tarjeta Módulos en Configuración").toBeVisible({
    timeout: 90_000,
  });
  const destino = urlGrupoModulos;
  await expect(async () => {
    await tarjeta.click({ timeout: 5_000 });
    await expect(page).toHaveURL(destino, { timeout: 10_000 });
  }).toPass({ timeout: 90_000 });
  await expect(page.getByText("No tienes acceso a ningún ajuste de este grupo")).toHaveCount(0);
  await expect(page.locator('[data-columna="lista"]')).toBeVisible({ timeout: 90_000 });
}

test.describe("@preview CAR-744: módulos contratados en Configuración", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el grupo Módulos lista contratados agrupados y Tickets abre Tipos de ticket", async ({
    page,
  }, info) => {
    await entrar(page);
    await abrirGrupoModulos(page);
    const catalogo = page.locator('a[href="/configuracion/modulos"]').filter({ visible: true });
    await expect(catalogo.first()).toBeVisible({ timeout: 90_000 });
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      await expect(
        page.getByRole("heading", { name: "Módulos", exact: true }).filter({ visible: true }),
      ).toBeVisible();
    }
    const tickets = page.locator('a[href="/configuracion/modulo/tickets"]').filter({ visible: true });
    if ((await tickets.count()) > 0) {
      await tickets.first().click();
      await page.waitForURL(/\/configuracion\/modulo\/tickets(\?.*)?$/);
      const secciones = page.getByRole("navigation", { name: "Secciones" });
      await expect(
        secciones.getByRole("link", { name: "Tipos de ticket", exact: true }),
      ).toBeVisible();
    }
    await capturar(page, info, "configuracion-modulos-car744");
  });

  test("la tarjeta de Configuración se llama Calendario y estructura", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/grupo/operacion");
    await expect(page).toHaveURL(/\/configuracion\/grupo\/operacion$/, { timeout: 60_000 });
    await expect(
      page.getByRole("heading", { name: "Calendario y estructura", exact: true }).filter({
        visible: true,
      }),
    ).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "configuracion-grupo-operacion-renombrado");
  });
});