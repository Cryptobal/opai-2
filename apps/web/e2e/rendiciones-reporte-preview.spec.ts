import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-179: reporte de rendiciones (pantalla 07). Solo lee: cambia de mes y de agrupación con la empresa ficticia qa-e2e.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview rendiciones: reporte", () => {
  test("muestra totales, agrupa por centro de costo y navega de mes", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/rendiciones/reporte?mes=2026-11");
    await expect(page.getByRole("heading", { name: "Reporte de rendiciones" }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Total rendido")).toBeVisible();
    await expect(page.getByText("Noviembre 2026")).toBeVisible();
    await capturar(page, info, "rendiciones-reporte-persona");
    await page.getByRole("group", { name: "Agrupar por" }).getByRole("link", { name: "Centro de costo" }).click();
    await expect(page).toHaveURL(/por=centro/, { timeout: 30_000 });
    await page.getByRole("link", { name: "Mes anterior" }).click();
    await expect(page).toHaveURL(/mes=2026-10/, { timeout: 30_000 });
    await expect(page.getByText("Octubre 2026")).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "rendiciones-reporte-centro");
  });
});
