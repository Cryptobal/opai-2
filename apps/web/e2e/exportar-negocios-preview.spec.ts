import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Exportar negocios a Excel (CAR-27): el botón aparece en el tablero y en la lista, y la descarga
// responde un .xlsx real con los filtros de la pantalla. Solo lee: no escribe nada en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

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

    const r = await page.request.get("/api/negocios/export?estado=abierto");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("spreadsheetml.sheet");
    expect(r.headers()["content-disposition"]).toMatch(/attachment; filename="negocios-\d{4}-\d{2}-\d{2}\.xlsx"/);
    const cuerpo = await r.body();
    expect(cuerpo.subarray(0, 2).toString("latin1")).toBe("PK");
  });

  test("rechaza un filtro inválido sin llegar a la base", async ({ page }) => {
    await entrar(page);
    const r = await page.request.get("/api/negocios/export?estado=cualquiera");
    expect(r.status()).toBe(400);
  });
});
