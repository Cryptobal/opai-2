import { expect, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

test.describe("@preview Cotizaciones: búsqueda y tamaño de página", () => {
  test.skip(!E2E_PASSWORD || !EN_PREVIEW, "Requiere la empresa ficticia qa-e2e en preview");

  test("conserva los parámetros de búsqueda y muestra el vacío filtrado", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/cotizaciones?q=car585-sin-coincidencias-ficticias&limite=20");
    await expect(page.getByText("Sin resultados", { exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByPlaceholder("Buscar cotización")).toHaveValue(
      "car585-sin-coincidencias-ficticias",
    );
    await expect(page).toHaveURL(/limite=20/);
    await expect(page).toHaveURL(/q=car585-sin-coincidencias-ficticias/);
    await capturar(page, info, "cotizaciones-busqueda-paginacion");
  });
});
