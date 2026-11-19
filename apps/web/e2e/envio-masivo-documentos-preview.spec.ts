import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview documentos: envío masivo", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("abre envío masivo desde plantillas", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/documentos/plantillas");
    await expect(page.getByText("Plantillas").first()).toBeVisible({ timeout: 30_000 });
    const enlace = page.getByRole("link", { name: "Envío masivo" }).first();
  if ((await enlace.count()) === 0) {
      await capturar(page, info, "envio-masivo-sin-plantillas-laborales");
      return;
    }
    await enlace.click();
    await expect(page.getByText("Envío masivo").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Buscar personas" })).toBeVisible();
    await capturar(page, info, "envio-masivo-plantilla");
  });
});