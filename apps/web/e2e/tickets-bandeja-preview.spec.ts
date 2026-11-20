import { expect, test } from "@playwright/test";

import { E2E_PASSWORD as password, entrar } from "./sesion";

test.describe("@preview tickets bandeja CAR-622", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await entrar(page);
  });

  test("bandeja: estado vacío o filas, búsqueda y navegación por cursor", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();
    const buscar = page.getByRole("textbox", { name: "Número, asunto o solicitante" });
    await expect(buscar).toBeVisible();

    const filas = page.getByText(/^(?:[1-9]\d* tickets|\d+–\d+)$/);
    const vacio = page.getByText(/^(?:Aún no puedes crear tickets|Sin tickets)$/);
    await expect(filas.or(vacio).first()).toBeVisible();

    const siguiente = page.getByRole("link", { name: "Siguiente", exact: true });
    if ((await siguiente.isVisible()) && (await siguiente.isEnabled())) {
      await siguiente.click();
      await page.waitForURL((url) => url.pathname === "/tickets" && url.searchParams.has("cursor"));
      await expect(page.getByRole("link", { name: "Anterior", exact: true })).toBeEnabled();
    }

    await buscar.fill("a");
    await page.waitForURL((url) =>
      url.pathname === "/tickets" &&
      url.searchParams.get("q") === "a" &&
      !url.searchParams.has("cursor") &&
      !url.searchParams.has("prev"),
    );
    await expect(filas.or(vacio).first()).toBeVisible();
  });
});
