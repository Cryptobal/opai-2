import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-173: borrador del F29 del mes en Finanzas › Compras › IVA y F29. Usa la empresa ficticia qa-e2e; solo lee.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview finanzas: impuestos (borrador del F29)", () => {
  test("muestra IVA a pagar, PPM, fecha de pago y los dos libros", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/compras/impuestos");
    await expect(page.getByText("IVA a pagar")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Se paga el")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ventas (IVA débito)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Compras (IVA crédito)" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Mes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "IVA y F29" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "finanzas-impuestos-f29");
  });

  test("un mes fuera de la lista cae en el mes anterior sin error", async ({ page }) => {
    await entrar(page);
    await page.goto("/finanzas/compras/impuestos?mes=1999-01");
    await expect(page.getByText("IVA a pagar")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
  });
});
