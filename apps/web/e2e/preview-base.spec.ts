import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Base de `preview-e2e` (CAR-285): comprueba que la vista previa del PR levanta, que el usuario de
// pruebas entra y que el marco carga sin errores, a 375, 1024 y 1280 px. Cada sesión agrega sus propias
// pruebas `@preview` para las pantallas que toca.
test.describe("@preview base", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("entra y muestra Inicio y Configuración sin errores", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "preview-inicio");
    await page.goto("/configuracion");
    await expect(page.getByRole("heading", { name: "Configuración" }).first()).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "preview-configuracion");
    expect(errores).toEqual([]);
  });
});
