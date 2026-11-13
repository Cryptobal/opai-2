import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-341: la pestaña Importaciones de Bancos muestra cada cartola con su período, saldos y autor, y «Deshacer
// importación» pide confirmación con lo que se borraría. Usa `packages/db/scripts/qa-e2e/bancos-importaciones.sql`;
// abre la vista previa y cancela, no borra nada.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la cartola ficticia de la empresa qa-e2e");

test.describe("@preview finanzas: historial de importaciones", () => {
  test("lista la cartola con su saldo y confirma antes de deshacer", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/bancos/importaciones");
    await expect(page.getByText("cartola-ficticia-qa-octubre.xlsx")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: "Importaciones" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Saldo de hoy")).toBeVisible();
    await capturar(page, info, "bancos-importaciones");
    const fila = page.locator("li", { hasText: "cartola-ficticia-qa-octubre.xlsx" });
    const deshacer = fila.getByRole("button", { name: "Deshacer" });
    await hidratado(deshacer);
    await deshacer.click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText(/Se borrarán los/)).toBeVisible({ timeout: 30_000 });
    await expect(dialogo.getByRole("button", { name: "Deshacer importación" })).toBeEnabled();
    await capturar(page, info, "bancos-importaciones-deshacer");
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByText("cartola-ficticia-qa-octubre.xlsx")).toBeVisible();
  });
});
