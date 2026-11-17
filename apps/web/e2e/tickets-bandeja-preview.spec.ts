import { expect, test } from "@playwright/test";

import { E2E_PASSWORD as password, entrar } from "./sesion";

test.describe("@preview tickets bandeja CAR-622", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await entrar(page);
  });

  test("bandeja con buscador y paginación", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
    await expect(page.getByPlaceholder("Número, asunto o solicitante")).toBeVisible();
    await expect(page.getByText(/\d+ tickets|\d+–\d+/)).toBeVisible();
  });
});