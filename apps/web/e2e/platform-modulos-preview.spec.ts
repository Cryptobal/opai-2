import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-742: complementos anidados y activación liviana en Plataforma › Empresa › Módulos.
test.describe("@preview plataforma: módulos y complementos", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("muestra complementos bajo el módulo padre", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/platform");
    const qa = page.getByRole("link", { name: /qa-e2e/i }).first();
    const visible = await qa.isVisible({ timeout: 30_000 }).catch(() => false);
    test.skip(!visible, "qa-e2e no opera Plataforma");
    await qa.click();
    await page.getByRole("link", { name: "Módulos" }).click();
    await expect(page.getByText("Cumplimiento DT")).toBeVisible({ timeout: 15_000 });
    await capturar(page, info, "platform-modulos");
  });
});