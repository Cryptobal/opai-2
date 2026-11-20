import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-589: Mis rendiciones en supervisor con ListScreen / DetailScreen (ancho completo, qa-e2e).
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview supervisor: rendiciones lista y ficha", () => {
  test("lista Mis rendiciones y abre una fila si hay datos", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/supervisor/rendiciones");
    await expect(page.getByRole("heading", { name: "Mis rendiciones" })).toBeVisible({ timeout: 60_000 });
    await hidratado(page.locator("main"));
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "supervisor-rendiciones-lista");

    const enlace = page.locator("main").getByRole("link").filter({ hasText: /^REN-/ }).first();
    if ((await enlace.count()) === 0) {
      info.annotations.push({ type: "omitido", description: "qa-e2e: sin rendiciones del supervisor" });
      return;
    }
    await enlace.click();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "supervisor-rendiciones-ficha");
  });
});