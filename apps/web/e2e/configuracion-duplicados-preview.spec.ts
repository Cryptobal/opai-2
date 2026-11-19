import { expect, type Page, test } from "@playwright/test";

import { entrar } from "./sesion";

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/car581-${nombre}-${proyecto}.png`, fullPage: true });
}

test.describe("@preview CAR-581: marca y correos de notificación", () => {
  test("marca con documento y usuarios con correos de notificación", async ({ page }, info) => {
    const p = info.project.name;
    await entrar(page);
    await page.goto("/configuracion/marca");
    await expect(page.getByLabel("Tipografía del PDF")).toBeVisible();
    await captura(page, "marca", p);
    await page.goto("/configuracion/usuarios");
    await expect(page.getByText("Correos de notificación", { exact: true })).toBeVisible();
    await captura(page, "usuarios-correos", p);
  });
});