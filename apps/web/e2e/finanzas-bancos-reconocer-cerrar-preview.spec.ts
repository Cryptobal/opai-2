import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-443: el panel «Reconocer» se cierra con la X de arriba a la derecha y vuelve a la lista, en escritorio y en
// teléfono; cada fila deja el monto alineado a la derecha. Usa los movimientos ficticios de
// `packages/db/scripts/qa-e2e/bancos-reglas.sql`; no confirma ni guarda nada.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa los movimientos ficticios de la empresa qa-e2e");

test.describe("@preview finanzas: bancos, cerrar Reconocer", () => {
  test("la X cierra el panel y vuelve a la lista", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/bancos?estado=pendiente&tipo=egresos");
    const fila = page.locator("li", { hasText: "Comision ficticia QA" });
    const boton = fila.getByRole("link", { name: "Reconocer" });
    await expect(boton).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "bancos-lista-alineada");
    await hidratado(boton);
    await boton.click();
    await expect(page).toHaveURL(/mov=/);
    const panel = page.getByRole("region", { name: "Detalle del movimiento" });
    const cerrar = panel.getByRole("button", { name: "Cerrar" });
    await expect(cerrar).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "bancos-reconocer-con-cerrar");
    await cerrar.click();
    await expect(page).not.toHaveURL(/mov=/);
    await expect(page.locator("li", { hasText: "Comision ficticia QA" }).getByRole("link", { name: "Reconocer" })).toBeVisible();
  });
});
