import { expect, test } from "@playwright/test";

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
    if (info.project.name === "telefono") {
      await page.getByRole("button", { name: "Más acciones de negocios" }).click({ timeout: 60_000 });
      await page.getByRole("menuitem", { name: "Transferir cartera" }).click();
    } else {
      const boton = page.getByRole("link", { name: "Transferir cartera" }).first();
      await expect(boton).toBeVisible({ timeout: 60_000 });
      await boton.click();
    }
    const hoja = page.getByRole("dialog");
    await expect(hoja.getByRole("heading", { name: "Transferir cartera" })).toBeVisible({ timeout: 60_000 });
    await expect(hoja.getByText("Nuevo responsable", { exact: true })).toBeVisible();
    await expect(hoja.getByText("Tareas pendientes", { exact: true })).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Transferir", exact: true })).toBeDisabled();
    await capturar(page, info, "comercial-transferir-cartera");
  });
});
