import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { abrirCotizacionQa } from "./cpq-seed-preview";
import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

const CARPETA_CAPTURAS =
  /^https:\/\//.test(process.env["BASE_URL"] ?? "") || process.env["CI"]
    ? "test-results/capturas"
    : "e2e/__screenshots__";

/** En iPad (1024 px) `fullPage` deforma el layout; misma regla que `capturarHoja` en preview.ts. */
async function capturarCotizaciones(page: Page, info: TestInfo, nombre: string) {
  if (info.project.name === "ipad") {
    await page.screenshot({ path: `${CARPETA_CAPTURAS}/${nombre}-ipad.png` });
    return;
  }
  await capturar(page, info, nombre);
}

// CAR-544: lista con filtros/vistas y paso «Documento y envío» con tarjetas PDF/propuesta.
// Datos: semillas `qa-e2e/*.sql` en el workflow `preview` (`aplicar-en-preview.sh`); fallback UI en el spec.

test.describe("@preview CPQ: lista y documento", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("filtros, vistas y tarjetas de documento", async ({ page }, info) => {
    test.setTimeout(150_000);
    await entrar(page);
    await page.goto("/cotizaciones?estado=enviada");
    await expect(page.getByRole("button", { name: "Vistas guardadas" }).filter({ visible: true })).toBeVisible({
      timeout: 60_000,
    });
    // Con `estado` en la URL el chip activo es «Estado: Enviada» (no el disparador «Filtrar por estado»).
    await expect(page.getByRole("button", { name: "Quitar filtro Estado" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel("Enviada desde")).toBeVisible();
    await expect(page.getByLabel("Enviada hasta")).toBeVisible();
    // Otros filtros sin valor siguen como menú punteado (misma fila en los 3 viewports).
    await expect(page.getByRole("button", { name: "Filtrar por cuenta" })).toBeVisible();
    await capturarCotizaciones(page, info, "cotizaciones-lista-filtros");

    await abrirCotizacionQa(page);
    await page.getByRole("button", { name: /Documento y envío/i }).click();
    await expect(page.getByRole("button", { name: "Ver cotización (PDF)" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: /propuesta técnica/i })).toBeVisible();
    await capturarCotizaciones(page, info, "cotizaciones-documento-tarjetas");
  });
});