import { type Page, expect } from "@playwright/test";

import { prepararDatos } from "./auditoria/datos";

export const CODIGO_COTIZACION_QA = "CPQ-2026-901";
export const TITULO_COTIZACION_QA = "Cotización ficticia preview";

/** Garantiza una cotización visible en lista (semilla SQL o datos de auditoría). Solo qa-e2e. */
export async function asegurarCotizacionEnLista(page: Page): Promise<void> {
  const buscar = async () => {
    await page.goto(`/cotizaciones?q=${encodeURIComponent(CODIGO_COTIZACION_QA)}`);
    return page.getByRole("link").filter({ hasText: CODIGO_COTIZACION_QA });
  };
  let enlace = await buscar();
  if (await enlace.isVisible({ timeout: 8_000 }).catch(() => false)) return;

  await page.goto(`/cotizaciones?q=${encodeURIComponent(TITULO_COTIZACION_QA)}`);
  enlace = page.getByRole("link").filter({ hasText: /CPQ-\d{4}-\d+/ }).first();
  if (await enlace.isVisible({ timeout: 8_000 }).catch(() => false)) return;

  // Fallback si la semilla SQL no corrió en la rama preview: crea negocio + cotización borrador vía UI.
  const notas = await prepararDatos(page);
  if (notas.length) {
    throw new Error(`No se pudo preparar cotización en qa-e2e: ${notas.join("; ")}`);
  }
  await page.goto("/cotizaciones");
  enlace = page.getByRole("link").filter({ hasText: /CPQ-\d{4}-\d+/ }).first();
  await expect(enlace).toBeVisible({ timeout: 60_000 });
}