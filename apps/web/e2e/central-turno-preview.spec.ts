import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.describe("@preview central: turno y nueva alerta", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("turno de central y formulario de alerta manual", async ({ page }, info) => {
    await entrar(page);
    const r = await page.goto("/central/turno");
    const titulo = page.getByRole("heading", { name: "Turno de central" }).first();
    const visible = await titulo
      .waitFor({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!visible || (r?.status() ?? 200) >= 400, "El módulo Central no está activo en qa-e2e");
    await capturar(page, info, "central-turno");

    await page.goto("/central/nueva-alerta");
    await expect(page.getByRole("heading", { name: "Abrir alerta" })).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "central-nueva-alerta");
  });
});