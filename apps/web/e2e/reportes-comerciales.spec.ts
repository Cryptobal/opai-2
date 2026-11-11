import { expect, test } from "@playwright/test";

import { sinDesborde } from "./negocios-ayuda";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Reportes comerciales (CAR-27 y CAR-298): tablero de solo lectura en /negocios/reportes.
// Corre también en `preview-e2e` con el usuario de `qa-e2e`; no crea ni cambia datos.
test.describe("@preview comercial: reportes", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("se llega desde Negocios, cambia de período y no se desborda", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/negocios");
    await page.getByRole("link", { name: "Reportes", exact: true }).click();
    await page.waitForURL(/\/negocios\/reportes/);
    const periodo = page.getByRole("group", { name: "Período" });
    await expect(periodo.getByRole("link", { name: "Mes", exact: true })).toBeVisible();
    await capturar(page, info, "reportes-mes");

    await periodo.getByRole("link", { name: "Año", exact: true }).click();
    await page.waitForURL(/periodo=anio/);
    // Con datos se ven las secciones del tablero; sin datos, el estado vacío. Nunca un error.
    await expect(page.getByText(/Embudo y conversión|Sin negocios en este período/).first()).toBeVisible();
    await expect(page.getByText("No pudimos cargar esta información")).toHaveCount(0);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await sinDesborde(page);
    await capturar(page, info, "reportes-anio");
  });
});
