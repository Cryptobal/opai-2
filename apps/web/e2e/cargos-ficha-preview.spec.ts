import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de cargo (CAR-365) en `preview-e2e`, a 375, 1024 y 1280 px, con la empresa ficticia `qa-e2e`.
// La ficha nunca queda entera en error: a lo más, la tarjeta de estructuras antiguas avisa por su cuenta.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview cargos: ficha del cargo", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("abrir un cargo muestra su ficha y no el error completo", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/cargos");
    // Catálogo de Configuración › Operación (CAR-319): en iPad y escritorio, las migas del grupo.
    const migas = page.getByRole("navigation", { name: "Ruta de configuración" });
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      await expect(migas.getByRole("link", { name: "Operación" })).toBeVisible();
    } else {
      // En teléfono, el «atrás» de la barra superior vuelve a Configuración › Operación.
      await expect(page.locator('a[href="/configuracion/grupo/operacion"]').first()).toBeVisible();
    }
    await capturar(page, info, "cargos-lista");
    const primero = page.locator('a[href^="/cargos/"]').filter({ visible: true }).first();
    await expect(primero, "qa-e2e tiene al menos un cargo").toBeVisible();
    await primero.click();
    await page.waitForURL(/\/cargos\/[0-9a-f-]{36}/);
    await expect(page.getByText("Privacidad", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("No pudimos cargar esta información")).toHaveCount(0);
    await capturar(page, info, "cargos-ficha");
    expect(errores).toEqual([]);
  });
});
