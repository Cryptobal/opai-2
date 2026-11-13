import { expect, test } from "@playwright/test";

import { accionNegocios } from "./negocios-ayuda";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-27: «Transferir cartera» en Negocios abre la hoja con De, Nuevo responsable, tareas y mensaje.
// Corre en `preview-e2e` con el usuario de `qa-e2e` y no transfiere nada (solo abre y mira la hoja).
test.describe("@preview comercial: transferir cartera", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la hoja se abre desde el tablero y no deja transferir sin elegir", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/negocios");
    // En el teléfono las acciones secundarias van en el menú «⋯» (CAR-371).
    if (info.project.name !== "telefono")
      await expect(page.getByRole("link", { name: "Transferir cartera" }).first()).toBeVisible({ timeout: 60_000 });
    await accionNegocios(page, info.project.name === "telefono", "Transferir cartera");
    const hoja = page.getByRole("dialog");
    await expect(hoja.getByRole("heading", { name: "Transferir cartera" })).toBeVisible({ timeout: 60_000 });
    await expect(hoja.getByText("Nuevo responsable", { exact: true })).toBeVisible();
    await expect(hoja.getByText("Tareas pendientes", { exact: true })).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Transferir", exact: true })).toBeDisabled();
    await capturar(page, info, "comercial-transferir-cartera");
  });
});
