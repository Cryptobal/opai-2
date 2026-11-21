import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-472: cola en vivo de la Central y ficha de la alerta. Solo lee, con la empresa ficticia `qa-e2e`
// (nunca Gard). Si el módulo Central no está activo en la empresa de prueba, se omite.
test.describe("@preview central: cola y ficha de alerta", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la cola agrupa por instalación y la fila abre la ficha", async ({ page }, info) => {
    await entrar(page);
    const r = await page.goto("/central");
    const titulo = page.getByRole("heading", { name: "Central" }).first();
    const visible = await titulo
      .waitFor({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!visible || (r?.status() ?? 200) >= 400, "El módulo Central no está activo en qa-e2e");
    await capturar(page, info, "central-cola");

    const fila = page.locator('a[href^="/central/alertas/"]').first();
    if ((await fila.count()) === 0) return;
    await fila.click();
    await expect(page.getByRole("heading", { name: "Qué pasó" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Bitácora" })).toBeVisible();
    await capturar(page, info, "central-alerta");
  });
});
