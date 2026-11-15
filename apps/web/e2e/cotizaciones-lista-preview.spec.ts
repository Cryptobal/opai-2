import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { entrar } from "./sesion";

test.describe("@preview CPQ: lista y documento", () => {
  test("filtros, vistas y tarjetas de documento", async ({ page }, info) => {
    await entrar(page, "cpq-gestor@example.test");
    await page.goto("/cotizaciones?estado=enviada");
    await expect(page.getByRole("button", { name: "Vistas guardadas" }).filter({ visible: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Filtrar por estado")).toBeVisible();
    await capturar(page, info, "cotizaciones-lista-filtros");
    await page.goto("/cotizaciones");
    const primera = page.getByRole("link").filter({ hasText: /CPQ-\d{4}-\d+/ }).first();
    await expect(primera).toBeVisible({ timeout: 60_000 });
    await primera.click();
    await page.getByRole("button", { name: /Documento y envío/i }).click();
    await expect(page.getByRole("button", { name: "Ver cotización (PDF)" })).toBeVisible();
    await expect(page.getByRole("button", { name: /propuesta técnica/i })).toBeVisible();
    await capturar(page, info, "cotizaciones-documento-tarjetas");
  });
});