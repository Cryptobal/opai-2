import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Generar documento (CAR-127, PR 4a): desde la pestaña Documentos de una persona se abre la vista previa;
// con plantillas elige la primera y se ve el documento, sin ellas se ve el estado vacío. Solo lee.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview personas: generar documento", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("abre la vista previa del documento de una persona", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/personas");
    const primera = page
      .locator('a[href^="/personas/"]:not([href*="vencimientos"])')
      .filter({ visible: true })
      .first();
    await expect(primera, "qa-e2e tiene al menos una persona ficticia").toBeVisible();
    await primera.click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
    const id = page.url().match(/\/personas\/([0-9a-f-]{36})/)?.[1] ?? "";
    await page.goto(`/personas/${id}/documentos`);
    await page.goto(`/personas/${id}/generar-documento`);
    await expect(page.getByText("Generar documento").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const vacio = page.getByText("Aún no hay plantillas laborales");
    if (await vacio.isVisible()) return void (await capturar(page, info, "generar-documento-vacio"));
    await page.getByLabel("Plantilla").click();
    await page.getByRole("option").first().click();
    await expect(page.locator("article.bg-paper")).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "generar-documento-vista");
  });
});
