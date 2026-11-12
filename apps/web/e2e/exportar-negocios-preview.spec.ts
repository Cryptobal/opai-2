import { expect, type Page, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Exportar negocios a Excel (CAR-27): el botón aparece en el tablero y en la lista, y la descarga
// responde un .xlsx real con los filtros de la pantalla. Solo lee: no escribe nada en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

/** Pide la descarga desde la página: así pasa por la protección de la vista previa, a diferencia de `page.request`. */
const pedir = (page: Page, url: string) =>
  page.evaluate(async (u) => {
    const r = await fetch(u, { credentials: "same-origin" });
    const b = new Uint8Array(await r.arrayBuffer());
    return {
      status: r.status,
      tipo: r.headers.get("content-type") ?? "",
      disp: r.headers.get("content-disposition") ?? "",
      firma: String.fromCharCode(b[0] ?? 0, b[1] ?? 0),
    };
  }, url);

test.describe("@preview negocios: exportar a Excel", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("el botón está en el tablero y en la lista, y la descarga es un Excel", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/negocios");
    const enTablero = page.getByRole("link", { name: "Exportar a Excel" });
    await expect(enTablero).toBeVisible();
    await expect(enTablero).toHaveAttribute("href", "/api/negocios/export");
    await capturar(page, info, "negocios-exportar-tablero");

    await page.goto("/negocios?vista=lista&estado=abierto");
    const enLista = page.getByRole("link", { name: "Exportar a Excel" });
    await expect(enLista).toBeVisible();
    await expect(enLista).toHaveAttribute("href", "/api/negocios/export?estado=abierto");
    await capturar(page, info, "negocios-exportar-lista");

    const r = await pedir(page, "/api/negocios/export?estado=abierto");
    expect(r.status).toBe(200);
    expect(r.tipo).toContain("spreadsheetml.sheet");
    expect(r.disp).toMatch(/attachment; filename="negocios-\d{4}-\d{2}-\d{2}\.xlsx"/);
    expect(r.firma).toBe("PK");
  });

  test("rechaza un filtro inválido sin llegar a la base", async ({ page }) => {
    await entrar(page);
    const r = await pedir(page, "/api/negocios/export?estado=cualquiera");
    expect(r.status).toBe(400);
  });
});
