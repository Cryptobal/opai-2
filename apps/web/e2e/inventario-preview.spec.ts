import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Inventario › Tipos (CAR-235) en `preview-e2e`: la lista, los tipos sugeridos del rubro si la empresa no
// tiene ninguno, la ficha de un tipo y su hoja de edición; a 375, 1024 y 1280 px. Entra con el usuario de
// la empresa ficticia `qa-e2e` (necesita el módulo Inventario activo).
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview inventario", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("lista de tipos, ficha y hoja de edición", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/inventario");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const sugeridos = page.getByRole("button", { name: "Cargar tipos de mi rubro" });
    if (await sugeridos.isVisible()) {
      await capturar(page, info, "inventario-vacio");
      await sugeridos.click();
      await expect(page.getByText(/Se agregaron|Ya tenías/)).toBeVisible();
    }
    const tipo = page.locator('a[href^="/inventario/tipos/"]').filter({ visible: true }).first();
    if (!(await tipo.count())) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin Inventario activo o sin permiso" });
      await capturar(page, info, "inventario-lista");
      expect(errores).toEqual([]);
      return;
    }
    await capturar(page, info, "inventario-lista");

    await tipo.click();
    await page.waitForURL(/\/inventario\/tipos\/[0-9a-f-]{36}/);
    await expect(page.getByText(/Campos propios|Tallas/).first()).toBeVisible();
    await capturar(page, info, "inventario-tipo");

    await page.goto(`${page.url().split("?")[0]}?editar=1`);
    await expect(page.getByRole("dialog")).toBeVisible();
    await capturar(page, info, "inventario-tipo-editar");
    expect(errores).toEqual([]);
  });
});
