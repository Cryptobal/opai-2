import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-743: Configuración › Inventario (prendas y categorías) en preview-e2e.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview configuracion inventario", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("prendas y categorías", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/configuracion/inventario");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "config-inventario-prendas");

    await page.getByRole("link", { name: /Categorías/ }).click();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "config-inventario-categorias");

    if (await page.getByRole("link", { name: "Nueva prenda" }).isVisible().catch(() => false)) {
      await page.goto("/configuracion/inventario?tab=prendas&nuevo=1");
      await expect(page.getByRole("dialog")).toBeVisible();
      await capturar(page, info, "config-inventario-prenda-nueva");
    }

    expect(errores).toEqual([]);
  });
});