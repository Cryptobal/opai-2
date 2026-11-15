import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de persona › Laboral › «Previsión» completa (CAR-276) en `preview-e2e`, a 375, 1024 y 1280 px.
// Entra con el usuario de la empresa ficticia `qa-e2e` y abre su persona ficticia; nunca Gard. Solo mira:
// abre la hoja de edición sin guardar.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview ficha de persona · previsión", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Previsión agrupada como el diseño y hoja con selectores de catálogo", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/personas");
    const primera = page.locator('a[href^="/personas/"]:not([href*="vencimientos"])').filter({ visible: true }).first();
    await expect(primera, "qa-e2e tiene al menos una persona ficticia").toBeVisible();
    await primera.click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
    const ficha = new URL(page.url()).pathname.match(/^\/personas\/[0-9a-f-]{36}/)?.[0] ?? "";
    await page.goto(`${ficha}/laboral`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    for (const grupo of ["Sistema previsional", "Cotiza", "APV, cargas y discapacidad"]) {
      await expect(page.getByText(grupo, { exact: true }).first()).toBeVisible();
    }
    await page.getByText("Sistema previsional", { exact: true }).first().scrollIntoViewIfNeeded();
    await capturar(page, info, "ficha-persona-prevision");
    await page.goto(`${ficha}/laboral?editar-prevision=1`);
    const hoja = page.getByRole("dialog").filter({ hasText: "Tramo de asignación familiar" });
    await expect(hoja).toBeVisible();
    await expect(hoja.getByText("Discapacidad o pensión de invalidez")).toBeVisible();
    await capturar(page, info, "ficha-persona-prevision-hoja");
    expect(errores).toEqual([]);
  });
});
