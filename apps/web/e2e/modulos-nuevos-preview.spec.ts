import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-529: el interruptor vive en Plataforma. qa-e2e no tiene rol de plataforma (CAR-323).
test.describe("@preview módulos nuevos por empresa", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la ficha ofrece activar los módulos nuevos", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/platform");
    const qa = page.getByRole("link", { name: /qa-e2e/i }).first();
    const visible = await qa.isVisible({ timeout: 30_000 }).catch(() => false);
    test.skip(!visible, "qa-e2e no opera Plataforma");
    await qa.click();
    await page.getByRole("link", { name: "Módulos" }).click();
    await expect(page.getByText("Activar módulos nuevos automáticamente")).toBeVisible();
    await capturar(page, info, "modulos-nuevos");
  });
});
