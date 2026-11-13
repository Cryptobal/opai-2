import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Gastos recurrentes del flujo de caja (CAR-382): lista y hoja de nuevo gasto. No guarda nada en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview finanzas: gastos recurrentes", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra la lista y la hoja de nuevo gasto con sus unidades", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/flujo/recurrentes");
    await expect(page.getByRole("heading", { name: "Gastos recurrentes", exact: true }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "flujo-recurrentes-lista");

    const nuevo = page.getByRole("link", { name: "Nuevo gasto recurrente" });
    if ((await nuevo.count()) === 0) return; // Sin filas de egreso en la empresa de prueba: queda el estado vacío.
    await nuevo.first().click();
    await expect(page.getByRole("dialog").getByText("Nuevo gasto recurrente")).toBeVisible();
    await page.getByLabel("Concepto").fill("Arriendo de prueba");
    await page.getByLabel("Monto por cuota ($)").fill("80.000");
    await capturar(page, info, "flujo-recurrentes-nuevo");
  });
});
