import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// La lista del grupo Módulos (CAR-744) compila en frío en la vista previa; anclamos en la navegación.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview CAR-744: módulos contratados en Configuración", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el grupo Módulos lista contratados agrupados y Tickets abre Tipos de ticket", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/configuracion/grupo/modulos");
    await expect(page).toHaveURL(/\/configuracion\/grupo\/modulos$/, { timeout: 60_000 });
    const lista = page.getByRole("navigation", { name: "Entradas de Módulos", exact: true });
    await expect(lista.getByRole("link", { name: /Catálogo de módulos/ })).toBeVisible({
      timeout: 60_000,
    });
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      await expect(
        page.getByRole("heading", { name: "Módulos", exact: true }).filter({ visible: true }),
      ).toBeVisible();
    }
    const tickets = lista.getByRole("link", { name: /^Tickets\b/ });
    if ((await tickets.count()) > 0) {
      await expect(tickets.first()).toBeVisible();
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