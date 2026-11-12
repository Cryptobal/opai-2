import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-328: Bancos filtra por ingresos y egresos, «Reconocer» concilia contra una fila del flujo con su cuenta
// contable, y la pestaña Reglas crea reglas con vista previa. Usa los movimientos ficticios de
// `packages/db/scripts/qa-e2e/bancos-reglas.sql`; no confirma ni guarda nada.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa los movimientos ficticios de la empresa qa-e2e");

test.describe("@preview finanzas: bancos, fila del flujo y reglas", () => {
  test("el filtro Egresos deja solo cargos", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/bancos?estado=pendiente&tipo=egresos");
    await expect(page.getByText("Comision ficticia QA")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Abono cliente ficticio QA")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Egresos" })).toHaveAttribute("aria-current", "page");
    await capturar(page, info, "bancos-filtro-egresos");
  });

  test("Reconocer ofrece la fila del flujo y la cuenta contable", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/bancos?estado=pendiente&tipo=egresos");
    const fila = page.locator("li", { hasText: "Comision ficticia QA" });
    const boton = fila.getByRole("link", { name: "Reconocer" });
    await expect(boton).toBeVisible({ timeout: 60_000 });
    await hidratado(boton);
    await boton.click();
    const hoja = page.getByRole("dialog");
    const modo = hoja.getByRole("button", { name: "Fila del flujo" });
    await expect(modo).toBeVisible({ timeout: 30_000 });
    await modo.click();
    await expect(hoja.getByText("Fila de egresos del flujo")).toBeVisible();
    await expect(hoja.getByText("Cuenta contable (opcional)")).toBeVisible();
    await expect(hoja.getByText("Crear una regla con este movimiento")).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "bancos-reconocer-fila");
  });

  test("Reglas: vacío y editor con vista previa", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/bancos/reglas");
    const nueva = page.getByRole("button", { name: "Nueva regla" }).first();
    await expect(nueva).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "bancos-reglas-lista");
    await hidratado(nueva);
    await nueva.click();
    const hoja = page.getByRole("dialog");
    await hoja.getByLabel("Nombre").fill("Servicio ficticio");
    await hoja.getByLabel("Valor de la condición 1").fill("servicio ficticio");
    await hoja.getByRole("button", { name: "Probar con los últimos 120 días" }).click();
    await expect(hoja.getByText(/2 calzan/)).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "bancos-reglas-editor");
    await hoja.getByRole("button", { name: "Descartar cambios" }).click();
    await expect(hoja).toBeHidden();
  });
});
