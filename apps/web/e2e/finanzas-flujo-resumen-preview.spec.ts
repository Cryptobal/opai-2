import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Resumen del flujo de caja (CAR-378): indicadores de caja, vista por mes o semana y escenario de cobros
// atrasados. Solo lectura en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview finanzas: resumen del flujo de caja", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra los indicadores por mes y simula cobros atrasados sin guardar", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/flujo/resumen");
    await expect(page.getByRole("heading", { name: "Resumen del flujo", exact: true }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Semanas de caja").first()).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "flujo-resumen-mes");

    await page.getByRole("link", { name: "+2 sem.", exact: true }).click();
    await expect(page).toHaveURL(/atraso=2/);
    await expect(page.getByText(/Escenario: los clientes pagan 2 semanas tarde/)).toBeVisible();
    await page.getByRole("link", { name: "Por semana", exact: true }).click();
    await expect(page).toHaveURL(/vista=semana/);
    await expect(page.getByText("Semana a semana")).toBeVisible();
    // CAR-398: con dos o más semanas, el gráfico del saldo va sobre la tabla.
    await expect(page.getByRole("img", { name: "Saldo al cierre de cada semana" })).toBeVisible();
    await capturar(page, info, "flujo-resumen-semana-atraso");
  });
});
