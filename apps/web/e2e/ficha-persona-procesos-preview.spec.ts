import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de persona › Laboral › «Ingreso y salida» (CAR-355) en `preview-e2e`, a 375, 1024 y 1280 px.
// Entra con el usuario de la empresa ficticia `qa-e2e` y abre su persona ficticia; nunca Gard.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview ficha de persona · ingreso y salida", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Laboral muestra la tarjeta de listas de ingreso y salida", async ({ page }, info) => {
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
    const tarjeta = page.getByText("Ingreso y salida", { exact: true }).first();
    await expect(tarjeta).toBeVisible();
    await tarjeta.scrollIntoViewIfNeeded();
    // Con listas: cada paso con su estado; sin listas: el vacío explica cuándo se abren.
    await expect(
      page.getByText(/Se abren solas al crear o terminar un vínculo|por hacer|Completa/).first(),
    ).toBeVisible();
    await capturar(page, info, "ficha-persona-ingreso-salida");
    expect(errores).toEqual([]);
  });
});
