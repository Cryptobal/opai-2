import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-562: en Configuración la barra usa buscador compacto («Buscar…» y atajo Ctrl K).
test.describe("@preview configuración: buscador compacto", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la cabecera muestra Buscar… con atajo cuando la caja va compacta", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/configuracion");
    await expect(page.getByRole("heading", { name: "Configuración" }).first()).toBeVisible();
    const buscar = page.locator('[data-shell="buscar"] button').first();
    await expect(buscar).toBeVisible();
    await expect(buscar).toHaveAttribute("aria-label", "Buscar, atajo Ctrl K");
    await expect(buscar.getByText("Buscar…", { exact: true })).toBeVisible();
    await capturar(page, info, "configuracion-buscador-compacto");
    expect(errores).toEqual([]);
  });
});