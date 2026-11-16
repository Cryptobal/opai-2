import { expect, type Page, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-396: tocar la celda «Cobros esperados» abre las facturas de la semana y deja cambiar la fecha de cobro con vista
// previa. Solo revisa el cambio: no confirma, así no escribe nada en `qa-e2e` (la factura ficticia queda igual).
// CAR-456: el chevron «Ver detalle» ya no abre la hoja; hay que tocar el monto (botón «Editar») de la semana.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

/** dd-mm-aaaa de hoy + `dias`, como se escribe en el campo de fecha. */
function fechaEscrita(dias: number): string {
  const d = new Date(Date.now() + dias * 86_400_000);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(d.getUTCDate())}-${dos(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

async function abrirHojaCobros(page: Page) {
  const hoja = page.getByRole("dialog");
  const movil = (page.viewportSize()?.width ?? 0) < 1024;
  if (movil) {
    const fila = page.locator("li").filter({ hasText: "Cobros esperados" }).first();
    const celda = fila.getByRole("button");
    await celda.scrollIntoViewIfNeeded();
    await celda.click();
  } else {
    const celda = page
      .locator("tbody tr", { hasText: "Cobros esperados" })
      .getByRole("button", { name: /Editar/ })
      .first();
    await celda.scrollIntoViewIfNeeded();
    await celda.click();
  }
  await expect(hoja.getByText("Cobros esperados").first()).toBeVisible({ timeout: 15_000 });
}

test.describe("@preview flujo de caja: fecha de cobro desde la celda", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("abre los cobros esperados y revisa un cambio de fecha sin guardarlo", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/finanzas/flujo");
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({
      timeout: 60_000,
    });
    const movil = (page.viewportSize()?.width ?? 0) < 1024;
    const celdaEscritorio = page
      .locator("tbody tr", { hasText: "Cobros esperados" })
      .getByRole("button", { name: /Editar/ })
      .first();
    const celdaMovil = page.locator("li").filter({ hasText: "Cobros esperados" }).first().getByRole("button");
    const hayCelda = movil ? (await celdaMovil.count()) > 0 : (await celdaEscritorio.count()) > 0;
    test.skip(!hayCelda, "La empresa de prueba no tiene facturas por cobrar en el horizonte");

    const hoja = page.getByRole("dialog");
    await expect(async () => {
      await abrirHojaCobros(page);
      await expect(hoja.getByText("Cobros esperados").first()).toBeVisible({ timeout: 5_000 });
    })
      .toPass({ timeout: 30_000 })
      .catch(async (e: unknown) => {
        await capturar(page, info, "flujo-cobros-sin-hoja");
        throw e;
      });
    await capturarHoja(page, info, "flujo-cobros-esperados");

    const cambiar = hoja.getByRole("button", { name: "Cambiar fecha" }).first();
    if (await cambiar.isVisible()) await cambiar.click();
    const campo = hoja.locator("#cobro-fecha");
    await campo.fill(fechaEscrita(28));
    await hoja.getByRole("button", { name: "Revisar cambio" }).click();
    await expect(hoja.getByText("Revisa el cambio")).toBeVisible();
    await expect(hoja.getByText(/pasa a la semana del/)).toBeVisible();
    await capturarHoja(page, info, "flujo-cobro-revisar-cambio");
  });
});