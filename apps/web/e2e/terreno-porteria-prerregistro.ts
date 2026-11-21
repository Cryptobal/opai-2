import { expect, type Page } from "@playwright/test";
import { digitoVerificador } from "@opai/domain";

import { abrirAccesos } from "./accesos-instalacion";

/**
 * CAR-478 · Prerregistro de punta a punta: en el ERP se prerregistra una visita para hoy en la instalación del
 * equipo; la portería la ve en «Esperados hoy», registra su entrada con el documento y la ficha del ERP queda
 * «Ingresó». La lectura del QR con la cámara no se prueba aquí (la cubre `acceso-prerregistro-porteria-db`).
 */
export async function porteriaConPrerregistro(
  erp: Page,
  t: Page,
  instalacion: RegExp,
): Promise<void> {
  const cuerpo = String(16_000_000 + (Date.now() % 3_000_000));
  const run = `${cuerpo}-${digitoVerificador(cuerpo)}`;
  const nombre = `Esperada ${Date.now() % 100_000}`;
  const base = await abrirAccesos(erp, "prerregistros", instalacion);
  const abrir = erp
    .getByRole("button", { name: "Prerregistrar" })
    .filter({ visible: true })
    .first();
  await expect(async () => {
    await abrir.click();
    await expect(erp.getByRole("dialog").getByText("Prerregistrar visita")).toBeVisible({
      timeout: 3_000,
    });
  }).toPass({ timeout: 60_000 });
  const hoja = erp.getByRole("dialog");
  await hoja.getByLabel("Nombre").fill(nombre);
  await hoja.getByLabel("RUN o pasaporte").fill(run);
  await hoja.getByLabel("Anfitrión").fill("Anfitriona E2E");
  await hoja.getByRole("button", { name: "Prerregistrar", exact: true }).click();
  await expect(hoja.getByText("Visita prerregistrada")).toBeVisible({ timeout: 30_000 });

  await t.goto("/terreno/porteria");
  const esperados = t.getByRole("region", { name: "Esperados hoy" });
  await expect(esperados.getByText(nombre)).toBeVisible({ timeout: 30_000 });
  await t.screenshot({
    path: "e2e/__screenshots__/terreno-porteria-esperados-375.png",
    fullPage: true,
  });
  const formulario = t.getByRole("region", { name: "Registrar entrada" });
  await formulario.getByLabel("Número de documento").fill(run);
  await formulario.getByLabel("Nombre y apellidos").fill(nombre);
  await formulario.getByRole("button", { name: "Registrar entrada" }).click();
  await expect(formulario.getByText("Entrada guardada en el teléfono")).toBeVisible();

  await erp.goto(`${base}?sub=prerregistros`);
  await expect(async () => {
    await erp.reload();
    await expect(
      erp
        .getByRole("link", { name: new RegExp(nombre) })
        .filter({ visible: true })
        .first(),
    ).toContainText("Ingresó", { timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
}
