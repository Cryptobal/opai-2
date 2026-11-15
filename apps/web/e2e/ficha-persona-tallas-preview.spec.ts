import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de persona › Laboral › «Uniforme y tallas»: una fila por prenda del uniforme de la empresa (CAR-408) en
// `preview-e2e`, a 375, 1024 y 1280 px. Empresa ficticia `qa-e2e`; nunca Gard. Solo mira: abre «Editar tallas» sin
// guardar.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview ficha de persona · tallas por prenda", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("las tallas siguen las prendas del uniforme y se editan en su hoja", async ({
    page,
  }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/personas");
    const primera = page
      .locator('a[href^="/personas/"]:not([href*="vencimientos"])')
      .filter({ visible: true })
      .first();
    await expect(primera, "qa-e2e tiene al menos una persona ficticia").toBeVisible();
    await primera.click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
    const ficha = new URL(page.url()).pathname.match(/^\/personas\/[0-9a-f-]{36}/)?.[0] ?? "";
    await page.goto(`${ficha}/laboral`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await expect(page.getByText("Uniforme y tallas").first()).toBeVisible();
    await page.getByText("Uniforme y tallas").first().scrollIntoViewIfNeeded();
    await capturar(page, info, "ficha-persona-tallas");
    await page.goto(`${ficha}/laboral?editar-tallas=1`);
    const hoja = page.getByRole("dialog").filter({ hasText: "Editar tallas" });
    await expect(hoja).toBeVisible();
    await expect(hoja.getByRole("textbox").first()).toBeVisible();
    await capturar(page, info, "ficha-persona-tallas-hoja");
    expect(errores).toEqual([]);
  });
});
