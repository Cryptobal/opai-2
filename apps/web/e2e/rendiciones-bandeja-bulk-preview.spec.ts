import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview rendiciones bandeja bulk", () => {
  test("selección y barra de acciones en por revisar", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/rendiciones/bandeja");
    await expect(page.getByRole("heading", { name: "Bandeja del aprobador" })).toBeVisible({ timeout: 60_000 });
    const chk = page.getByRole("checkbox").first();
    if (await chk.isVisible()) {
      await chk.click();
      await expect(page.getByText(/\d+ seleccionadas/)).toBeVisible();
    }
    await capturar(page, info, "rendiciones-bandeja-seleccion");
  });
});