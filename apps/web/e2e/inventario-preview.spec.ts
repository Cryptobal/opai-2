import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Inventario (CAR-235 a CAR-238, CAR-504) en `preview-e2e`: Tipos (con los sugeridos del rubro si no hay ninguno),
// la ficha de un tipo y su hoja; Activos con su hoja de registro y, si hay, la ficha de un activo; Ropa con su ficha y la hoja de ingreso; Entregas con su hoja; a 375,
// 1024 y 1280 px. Entra con el usuario de la empresa ficticia `qa-e2e` (necesita Inventario activo).
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview inventario", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("tipos, activos y sus hojas", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/inventario/tipos");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const sugeridos = page.getByRole("button", { name: "Cargar tipos de mi rubro" });
    if (await sugeridos.isVisible()) {
      await capturar(page, info, "inventario-tipos-vacio");
      await sugeridos.click();
      await expect(page.getByText(/Se agregaron|Ya tenías/)).toBeVisible();
    }
    const tipo = page.locator('a[href^="/inventario/tipos/"]').filter({ visible: true }).first();
    if (!(await tipo.count())) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin Inventario activo o sin permiso" });
      await capturar(page, info, "inventario-tipos");
      expect(errores).toEqual([]);
      return;
    }
    await capturar(page, info, "inventario-tipos");
    await tipo.click();
    await page.waitForURL(/\/inventario\/tipos\/[0-9a-f-]{36}/);
    await expect(page.getByText(/Campos propios|Tallas/).first()).toBeVisible();
    await capturar(page, info, "inventario-tipo");
    await page.goto(`${page.url().split("?")[0]}?editar=1`);
    await expect(page.getByRole("dialog")).toBeVisible();
    await capturar(page, info, "inventario-tipo-editar");
    // CAR-504: un tipo nuevo de ropa elige la prenda del uniforme.
    await page.goto("/inventario/tipos?nuevo=1");
    await page.locator("#it-categoria").click();
    await page.getByRole("option", { name: "Ropa" }).click();
    await expect(page.getByText("Prenda del uniforme")).toBeVisible();
    await capturar(page, info, "inventario-tipo-ropa-nuevo");

    await page.goto("/inventario");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "inventario-activos");
    await page.goto("/inventario?nuevo=1");
    await expect(page.getByRole("dialog")).toBeVisible();
    await capturar(page, info, "inventario-activo-nuevo");
    await page.keyboard.press("Escape");
    const activo = page.locator('a[href^="/inventario/activos/"]').filter({ visible: true }).first();
    if (await activo.count()) {
      await activo.click();
      await page.waitForURL(/\/inventario\/activos\/[0-9a-f-]{36}/);
      await expect(page.getByText("Datos", { exact: true })).toBeVisible();
      await capturar(page, info, "inventario-activo");
    }

    await page.goto("/inventario/ropa");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "inventario-ropa");
    const prenda = page.locator('a[href^="/inventario/ropa/"]').filter({ visible: true }).first();
    if (await prenda.count()) {
      await prenda.click();
      await page.waitForURL(/\/inventario\/ropa\/[0-9a-f-]{36}/);
      await expect(page.getByText("Existencias", { exact: true })).toBeVisible();
      await capturar(page, info, "inventario-prenda");
      await page.goto(`${page.url().split("?")[0]}?ingreso=1`);
      await expect(page.getByRole("dialog")).toBeVisible();
      await capturar(page, info, "inventario-prenda-ingreso");
    }

    await page.goto("/inventario/entregas");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "inventario-entregas");
    await page.goto("/inventario/entregas?nueva=1");
    await expect(page.getByRole("dialog")).toBeVisible();
    await capturar(page, info, "inventario-entrega-nueva");
    expect(errores).toEqual([]);
  });
});
