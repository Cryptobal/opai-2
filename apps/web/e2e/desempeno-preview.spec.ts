import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Desempeño (CAR-307) en `preview-e2e`: la lista de cargos, el scorecard de un cargo con su editor y,
// si el cargo tiene equipo visible, el resultado de una persona; a 375, 1024 y 1280 px. Entra con el
// usuario de la empresa ficticia `qa-e2e` (necesita el módulo Desempeño activo y al menos un cargo).
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview desempeño", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("lista de cargos, scorecard con su editor y resultado de una persona", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/desempeno");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const cargo = page.locator('a[href^="/desempeno/cargos/"]').filter({ visible: true }).first();
    await expect(cargo, "qa-e2e tiene Desempeño activo y al menos un cargo").toBeVisible();
    await capturar(page, info, "desempeno-lista");

    await cargo.click();
    await page.waitForURL(/\/desempeno\/cargos\/[0-9a-f-]{36}/);
    await expect(page.getByText("Equipo", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "desempeno-cargo");

    const editar = page.getByRole("button", { name: /Editar scorecard|Definir scorecard/ }).first();
    await editar.click();
    await expect(page.getByText(/Los pesos suman/)).toBeVisible();
    await capturar(page, info, "desempeno-editor");
    await page.keyboard.press("Escape");

    const persona = page.locator('a[href^="/desempeno/personas/"]').filter({ visible: true }).first();
    if (await persona.count()) {
      await persona.click();
      await page.waitForURL(/\/desempeno\/personas\/[0-9a-f-]{36}/);
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      await capturar(page, info, "desempeno-persona");
    }
    await page.goto("/desempeno/indicadores");
    await expect(page.getByRole("link", { name: "Indicadores propios" })).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "desempeno-indicadores");
    expect(errores).toEqual([]);
  });
});
