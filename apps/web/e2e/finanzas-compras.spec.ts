import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// Brief 23 · Finanzas compras PR 1 — flujo de las tres pantallas nuevas: plan de cuentas (06),
// proveedores (02) y libro de compras (01), con evidencia a 375, 1024 y 1280 px (proyectos de
// playwright.config). El tenant de dev tiene Finanzas activo (seed:dev-tenant) y el usuario e2e es
// owner. Datos ficticios; cada corrida usa un RUT y un folio propios para no chocar con otra.
test.setTimeout(240_000);

/** RUT válido y único por corrida: cuerpo de 8 dígitos desde la hora y su dígito verificador. */
function rutDeCorrida(): string {
  const cuerpo = String(70_000_000 + (Date.now() % 9_000_000));
  let suma = 0;
  let mult = 2;
  for (const d of cuerpo.split("").reverse()) {
    suma += Number(d) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (suma % 11);
  return `${cuerpo}-${r === 11 ? "0" : r === 10 ? "K" : String(r)}`;
}

test.describe("Finanzas · Compras", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("plan de cuentas, proveedor y libro de compras", async ({ page }, info) => {
    const sello = Date.now().toString().slice(-6);
    const proveedor = `Proveedor e2e ${sello}`;
    const folio = String(Number(sello) + 1_000_000);
    await entrar(page);

    const guardar = async (boton: string | RegExp, capacidad: string) => {
      const respuesta = page.waitForResponse(
        (r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes(capacidad),
      );
      await page.getByRole("button", typeof boton === "string" ? { name: boton, exact: true } : { name: boton }).click();
      expect((await respuesta).ok()).toBe(true);
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 30_000 });
    };
    const sinScrollHorizontal = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    // 06 · Plan de cuentas: carga la plantilla si el tenant aún no la tiene.
    await page.goto("/finanzas/plan-de-cuentas");
    const cargar = page.getByRole("button", { name: "Cargar plantilla chilena" });
    if (await cargar.isVisible({ timeout: 10_000 }).catch(() => false)) await cargar.click();
    await expect(page.getByText("Deudores por venta").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Grupo incorrecto")).toHaveCount(0);
    await sinScrollHorizontal();
    await page.screenshot({ path: info.outputPath("plan-de-cuentas.png"), fullPage: true });

    // 02 · Proveedor: crear y abrir su ficha.
    await page.goto("/finanzas/compras/proveedores");
    await page.getByRole("link", { name: "Nuevo proveedor" }).first().click();
    await page.getByLabel("RUT").fill(rutDeCorrida());
    await page.getByLabel("Razón social").fill(proveedor);
    await guardar("Crear proveedor", "finanzas.proveedores.crear");
    await expect(page.getByRole("heading", { name: proveedor }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Compras vinculadas")).toBeVisible();
    await sinScrollHorizontal();
    await page.screenshot({ path: info.outputPath("proveedor-ficha.png"), fullPage: true });

    // 01 · Libro de compras: registrar un documento, verlo «sin centro de costo» y asignarlo en lote.
    await page.goto("/finanzas/compras");
    await page.getByRole("link", { name: "Registrar documento" }).first().click();
    await page.getByLabel("Proveedor").click();
    await page.getByRole("option", { name: proveedor }).click();
    await page.getByLabel("Folio").fill(folio);
    await page.getByLabel("Neto").fill("100000");
    await guardar("Registrar", "finanzas.compras.registrar");
    await page.goto("/finanzas/compras");
    await expect(page.getByText("Sin centro de costo").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Sin conciliar").first()).toBeVisible();
    await sinScrollHorizontal();
    await page.screenshot({ path: info.outputPath("libro-compras.png"), fullPage: true });

    await page.getByRole("link", { name: "Asignar en lote" }).first().click();
    await page.getByLabel("Centro de costo").click();
    await page.getByRole("option", { name: "Administración / Oficina central" }).click();
    await page.getByRole("button", { name: "Ver vista previa" }).click();
    await expect(page.getByText(/Se asignará «Administración \/ Oficina central»/)).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: info.outputPath("libro-compras-lote.png"), fullPage: true });
    await guardar(/^Aplicar a \d+$/, "finanzas.compras.asignar_centro");
    await page.goto(`/finanzas/compras?q=${folio}`);
    await expect(page.getByText("Administración / Oficina central").first()).toBeVisible({ timeout: 30_000 });
  });
});
