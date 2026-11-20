import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-620 · bandeja de turnos extra (qa-e2e; sin Gard).

test.describe("@preview turnos extra", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("lista y detalle de turnos extra en ERP", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/pauta/turnos-extra");
    await expect(page.getByRole("heading", { name: "Turnos extra" }).first()).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "turnos-extra-1280");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/pauta/turnos-extra");
    await capturar(page, info, "turnos-extra-375");
    expect(errores).toEqual([]);
  });
});