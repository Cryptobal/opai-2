import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-318: la tabla de indicadores legales muestra el valor vigente de cada uno (también topes e
// impuesto único), nunca «Ver detalle» en la columna Valor. Solo mira; no guarda nada.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview remuneraciones: indicadores legales", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra el valor de cada indicador y cómo se actualizan", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/remuneraciones");
    await expect(page.getByText("Se actualizan solos").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const valores = page.locator("tbody tr td:nth-child(2)");
    for (const texto of await valores.allInnerTexts()) expect(texto.trim()).not.toBe("Ver detalle");
    await capturar(page, info, "remuneraciones-indicadores");
  });
});
