import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Desempeño (CAR-307) de punta a punta en la empresa de desarrollo: define el scorecard de un cargo
// desde la pantalla, lo publica y fija su jefatura. Exige el módulo Desempeño activo; sin él, se salta.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("desempeño: scorecard y jefatura de un cargo", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");
  test.describe.configure({ mode: "serial" });

  test("define, publica y deja la jefatura", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Escribe datos: corre una vez");
    await entrar(page);
    await page.goto("/desempeno");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const guardia = page
      .locator('a[href^="/desempeno/cargos/"]')
      .filter({ hasText: "Guardia", visible: true })
      .first();
    const hay = await guardia.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    test.skip(!hay, "La empresa no tiene Desempeño activo o le falta el cargo");
    await guardia.click();
    await page.waitForURL(/\/desempeno\/cargos\/[0-9a-f-]{36}/);

    await page.getByRole("button", { name: /Editar scorecard|Definir scorecard/ }).first().click();
    const hoja = page.getByRole("dialog");
    await expect(hoja.getByText(/Los pesos suman/)).toBeVisible();
    // Deja un solo indicador con peso 100, venga como venga el cargo de corridas anteriores.
    while ((await hoja.getByRole("button", { name: /^Quitar / }).count()) > 1) {
      await hoja.getByRole("button", { name: /^Quitar / }).last().click();
    }
    if (!(await hoja.getByLabel("Peso (%)").count())) {
      await hoja.locator("#sc-agregar").click();
      await page.getByRole("option").first().click();
    }
    await hoja.getByLabel("Peso (%)").fill("100");
    await expect(hoja.getByText("Los pesos suman 100 %.")).toBeVisible();
    await capturar(page, info, "desempeno-editor-listo");
    await hoja.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByText(/^Publicado: rige desde/)).toBeVisible();
    await expect(hoja).toHaveCount(0);

    await page.getByRole("button", { name: "Cambiar jefatura" }).click();
    await page.locator("#jf-cargo").click();
    await page.getByRole("option", { name: "Supervisor", exact: true }).click();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Jefatura guardada")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "desempeno-cargo-publicado");
  });

  test("arma un indicador propio, lo prueba con datos reales y lo publica", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Escribe datos: corre una vez");
    await entrar(page);
    await page.goto("/desempeno/indicadores");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const nuevo = page.getByRole("button", { name: "Nuevo indicador" });
    const hay = await nuevo.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    test.skip(!hay, "La empresa no tiene Desempeño activo o quien entra no lo administra");
    await nuevo.click();
    const hoja = page.getByRole("dialog");
    const nombre = `Negocios ganados ${Date.now()}`;
    await hoja.getByLabel("Nombre").fill(nombre);
    await hoja.locator("#ip-hecho-a").click();
    await page.getByRole("option").first().click();
    await hoja.getByLabel("Meta sugerida").fill("5");
    await hoja.getByRole("button", { name: "Probar con los datos de este mes" }).click();
    await expect(hoja.getByText(/^En \w+ \d{4}/)).toBeVisible();
    await capturar(page, info, "desempeno-indicador-propio");
    await hoja.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByText("Indicador publicado")).toBeVisible();
    await expect(hoja).toHaveCount(0);
    await expect(page.getByText(nombre).filter({ visible: true }).first()).toBeVisible();
  });
});
