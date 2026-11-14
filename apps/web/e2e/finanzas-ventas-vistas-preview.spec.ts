import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-258 (opción A): las vistas de Ventas son botones juntos y «Nueva factura» va aparte. Empresa ficticia qa-e2e; solo lee.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview finanzas: vistas de Ventas", () => {
  test("Libro, Programación y Tablero del mes como botones de vista", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/ventas");
    const vistas = page.getByRole("group", { name: "Vista de Ventas" });
    await expect(vistas).toBeVisible({ timeout: 60_000 });
    await expect(vistas.getByRole("link", { name: "Libro" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Nueva factura" }).first()).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "finanzas-ventas-vistas-libro");
    await vistas.getByRole("link", { name: "Programación" }).click();
    await expect(page).toHaveURL(/\/finanzas\/ventas\/programacion$/);
    await expect(page.getByRole("group", { name: "Vista de Ventas" }).getByRole("link", { name: "Programación" })).toHaveAttribute("aria-current", "page", { timeout: 60_000 });
    await capturar(page, info, "finanzas-ventas-vistas-programacion");
  });
});
