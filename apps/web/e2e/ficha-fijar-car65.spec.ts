import { expect, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// «Fijar» de las fichas (CAR-65): desde 1024 px es un botón de la cabecera; bajo 1024 pasa al menú ⋯ para
// que el grupo fijo de búsqueda, campana y usuario no se mueva ni se pise con las acciones (CAR-12).

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("«Fijar» de las fichas", () => {
  test.beforeEach(({ browserName: _navegador }, info) => {
    test.skip(info.project.name !== "ipad", "Recorre los anchos con el proyecto iPad.");
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  });

  test("va en el menú ⋯ bajo 1024 px y en la cabecera desde 1024 (CAR-65)", async ({ page }) => {
    await entrar(page);
    for (const lista of ["/cuentas", "/instalaciones", "/cargos"]) {
      await page.goto(lista);
      const href = await page
        .locator(`a[href^="${lista}/"][href*="-"]`)
        .first()
        .getAttribute("href");
      await page.setViewportSize({ width: 768, height: 1000 });
      await page.goto(href ?? lista);
      await expect(page.locator("header h1:visible")).toHaveCount(1, { timeout: 30_000 });
      const boton = page.locator("header").getByRole("button", { name: /^(Fijar|Desfijar)$/ });
      await expect(boton.filter({ visible: true })).toHaveCount(0);
      await page
        .getByRole("button", { name: /^Acciones de/ })
        .filter({ visible: true })
        .click();
      const fijar = page.getByRole("menuitem", { name: /^(Fijar|Desfijar)$/ });
      await expect(fijar).toBeVisible();
      // Funciona: fija, el menú pasa a ofrecer «Desfijar» y se deshace.
      await fijar.click();
      await page.getByRole("button", { name: /^Acciones de/ }).filter({ visible: true }).click();
      await page.getByRole("menuitem", { name: "Desfijar" }).click();
      await page.getByRole("button", { name: /^Acciones de/ }).filter({ visible: true }).click();
      await expect(page.getByRole("menuitem", { name: "Fijar" })).toBeVisible();
      await page.keyboard.press("Escape");
      // Desde 1024 px vuelve el botón de la cabecera y el menú ya no lo repite.
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(boton.filter({ visible: true })).toHaveCount(1);
      await page
        .getByRole("button", { name: /^Acciones de/ })
        .filter({ visible: true })
        .click();
      await expect(page.getByRole("menuitem", { name: /^(Fijar|Desfijar)$/ })).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
  });
});
