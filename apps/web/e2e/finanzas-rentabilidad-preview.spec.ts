import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-174: rentabilidad por instalación con costo estimado. Solo lee, con la empresa ficticia qa-e2e.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview finanzas: rentabilidad por instalación", () => {
  test("se abre desde Hoy en Finanzas y muestra totales y el mes anterior", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas");
    const enlace = page.getByRole("link", { name: /Rentabilidad por instalación/ });
    await expect(enlace).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "finanzas-hoy-informes");
    await enlace.click();
    await expect(page).toHaveURL(/\/finanzas\/rentabilidad/, { timeout: 30_000 });
    await expect(page.getByText("Costo estimado del personal")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("No son liquidaciones", { exact: false })).toBeVisible();
    await capturar(page, info, "finanzas-rentabilidad");
    await page.getByRole("link", { name: "Mes anterior" }).click();
    await expect(page).toHaveURL(/mes=\d{4}-\d{2}/, { timeout: 30_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "finanzas-rentabilidad-mes-anterior");
  });
});
