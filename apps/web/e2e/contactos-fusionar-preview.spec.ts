import { expect, test } from "@playwright/test";

import { ocultarIndicadorDev } from "./indicador-dev";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-27 · fusionar contactos: abre la hoja por URL en el primer contacto de la empresa ficticia
// `qa-e2e` (nunca Gard), ve el paso «Elegir» y cancela. No fusiona nada.
test.describe("@preview comercial: fusionar contactos", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test.beforeEach(({ page }) => ocultarIndicadorDev(page));

  test("la hoja Fusionar contactos abre en el paso Elegir y se cancela sin cambios", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/contactos");
    const fila = page.locator('a[href^="/contactos/"]').first();
    await fila.waitFor({ timeout: 60_000 }).catch(() => undefined);
    test.skip((await fila.count()) === 0, "qa-e2e no tiene contactos");
    const href = (await fila.getAttribute("href")) ?? "";
    await page.goto(`${href.split("?")[0]}?fusionar=1`);
    const hoja = page.getByRole("dialog");
    await expect(hoja.getByText("Fusionar contactos", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(hoja.getByRole("button", { name: "Comparar" })).toBeDisabled();
    await capturar(page, info, "contactos-fusionar-elegir");
    await hoja.getByRole("button", { name: "Cancelar" }).click();
    await expect(hoja).toBeHidden();
    expect(errores).toEqual([]);
  });
});
