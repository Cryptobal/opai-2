import { expect, type Page, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.describe("@preview rondas: mapa de puntos en la instalación", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  async function abrirPuntos(page: Page) {
    await entrar(page);
    await page.goto("/instalaciones");
    const href = await page
      .locator('a[href^="/instalaciones/"][href*="-"]')
      .first()
      .getAttribute("href");
    const id = (href ?? "").match(/\/instalaciones\/([0-9a-f-]{36})/)?.[1];
    expect(id).toBeTruthy();
    await page.goto(`/instalaciones/${id}/rondas?sub=puntos`);
    await expect(page.getByRole("group", { name: "Sección de rondas" })).toBeVisible({ timeout: 60_000 });
    return id!;
  }

  test("panel y hoja nuevo punto muestran el mapa interactivo", async ({ page }, info) => {
    await abrirPuntos(page);
    await expect(page.getByRole("region", { name: "Mapa de puntos de la ronda" })).toBeVisible();
    await capturar(page, info, "rondas-puntos-mapa-panel");

    await page.getByRole("link", { name: "Nuevo punto" }).first().click();
    const hoja = page.getByRole("dialog");
    await expect(hoja.getByRole("region", { name: "Mapa para ubicar el punto" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(hoja.getByLabel("Buscar dirección")).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Usar mi ubicación" })).toBeVisible();
    await capturarHoja(page, info, "rondas-punto-mapa-hoja");

    await hoja.getByRole("radio", { name: "QR", exact: true }).check();
    await expect(hoja.getByRole("region", { name: "Mapa para ubicar el punto" })).toHaveCount(0);
    await page.keyboard.press("Escape");
  });
});