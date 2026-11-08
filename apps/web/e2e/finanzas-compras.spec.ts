import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
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
      const control = page.getByRole("button", typeof boton === "string" ? { name: boton, exact: true } : { name: boton });
      await hidratado(control);
      await control.click();
      expect((await respuesta).ok()).toBe(true);
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 30_000 });
    };
    // En `pnpm dev` el campo se pinta antes de hidratarse y un fill en esa ventana se pierde.
    const llenar = async (etiqueta: string, valor: string) => {
      const campo = page.getByLabel(etiqueta, { exact: true });
      await hidratado(campo);
      await campo.fill(valor);
    };
    const elegir = async (etiqueta: string, opcion: string) => {
      const select = page.getByLabel(etiqueta, { exact: true });
      await hidratado(select);
      await select.click();
      await page.getByRole("option", { name: opcion }).click();
    };
    const sinScrollHorizontal = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    // 06 · Plan de cuentas (en Configuración › Finanzas): carga la plantilla si el tenant aún no la tiene.
    await page.goto("/configuracion/modulo/finanzas?seccion=plan-cuentas");
    const cargar = page.getByRole("button", { name: "Cargar plantilla chilena" });
    // La página carga bajo Suspense: espera el botón o el plan ya cargado antes de decidir.
    await cargar.or(page.getByText("Deudores por venta").first()).first().waitFor({ timeout: 30_000 });
    if (await cargar.isVisible()) {
      await hidratado(cargar);
      await cargar.click();
    }
    await expect(page.getByText("Deudores por venta").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Grupo incorrecto")).toHaveCount(0);
    await sinScrollHorizontal();
    await page.screenshot({ path: info.outputPath("plan-de-cuentas.png"), fullPage: true });

    // 02 · Proveedor: crear y abrir su ficha.
    await page.goto("/finanzas/compras/proveedores");
    await page.getByRole("link", { name: "Nuevo proveedor" }).first().click();
    await llenar("RUT", rutDeCorrida());
    await llenar("Razón social", proveedor);
    await guardar("Crear proveedor", "finanzas.proveedores.crear");
    await expect(page.getByRole("heading", { name: proveedor }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Compras vinculadas")).toBeVisible();
    await sinScrollHorizontal();
    await page.screenshot({ path: info.outputPath("proveedor-ficha.png"), fullPage: true });

    // 01 · Libro de compras: registrar un documento, verlo «sin centro de costo» y asignarlo en lote.
    await page.goto("/finanzas/compras");
    await page.getByRole("link", { name: "Registrar documento" }).first().click();
    await elegir("Proveedor", proveedor);
    await llenar("Folio", folio);
    await llenar("Neto", "100000");
    await guardar("Registrar", "finanzas.compras.registrar");
    await page.goto("/finanzas/compras");
    await expect(page.getByText("Sin centro de costo").filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Sin conciliar").filter({ visible: true }).first()).toBeVisible();
    await sinScrollHorizontal();
    await page.screenshot({ path: info.outputPath("libro-compras.png"), fullPage: true });

    await page.getByRole("link", { name: "Asignar en lote" }).first().click();
    await elegir("Centro de costo", "Administración / Oficina central");
    const previa = page.getByRole("button", { name: "Ver vista previa" });
    await hidratado(previa);
    await previa.click();
    await expect(page.getByText(/Se asignará «Administración \/ Oficina central»/)).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: info.outputPath("libro-compras-lote.png"), fullPage: true });
    await guardar(/^Aplicar a \d+$/, "finanzas.compras.asignar_centro");
    await page.goto(`/finanzas/compras?q=${folio}`);
    await expect(page.getByText("Administración / Oficina central").filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
  });
});
