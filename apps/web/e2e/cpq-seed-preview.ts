import { type Page, expect } from "@playwright/test";

import { prepararDatos } from "./auditoria/datos";
import { EN_PREVIEW } from "./preview";

export const CODIGO_COTIZACION_QA = "CPQ-2026-901";
export const TITULO_COTIZACION_QA = "Cotización ficticia preview";
/** Id fijo de `packages/db/scripts/qa-e2e/cotizacion-ficha.sql` (solo qa-e2e). */
export const ID_COTIZACION_QA = "00000000-0000-7000-8000-000000544002";

async function fichaSemillaVisible(page: Page): Promise<boolean> {
  await page.goto(`/cotizaciones/${ID_COTIZACION_QA}`);
  return page
    .getByRole("heading", { name: CODIGO_COTIZACION_QA })
    .first()
    .isVisible({ timeout: 45_000 })
    .catch(() => false);
}

async function filaSemillaEnLista(page: Page): Promise<boolean> {
  await page.goto(`/cotizaciones?q=${encodeURIComponent(CODIGO_COTIZACION_QA)}`);
  const fila = page
    .locator(`a[href^="/cotizaciones/${ID_COTIZACION_QA}"]`)
    .or(page.locator('a[href^="/cotizaciones/"]').filter({ hasText: CODIGO_COTIZACION_QA }));
  return fila.first().isVisible({ timeout: 45_000 }).catch(() => false);
}

/** Abre la cotización de semilla en ficha (preview-e2e) o la crea en local. Solo qa-e2e. */
export async function abrirCotizacionQa(page: Page): Promise<void> {
  if (await fichaSemillaVisible(page)) return;
  if (await filaSemillaEnLista(page)) {
    await page.goto(`/cotizaciones/${ID_COTIZACION_QA}`);
    await expect(page.getByRole("heading", { name: CODIGO_COTIZACION_QA }).first()).toBeVisible({
      timeout: 60_000,
    });
    return;
  }

  await page.goto(`/cotizaciones?q=${encodeURIComponent(TITULO_COTIZACION_QA)}`);
  const porTitulo = page.locator('a[href^="/cotizaciones/"]').filter({ hasText: /CPQ-\d{4}-\d+/ });
  if (await porTitulo.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
    await porTitulo.first().click();
    await expect(page.getByRole("heading", { name: /^CPQ-/ }).first()).toBeVisible({ timeout: 60_000 });
    return;
  }

  if (EN_PREVIEW) {
    throw new Error(
      "No está la semilla CPQ-2026-901 en la vista previa; revise que preview aplicó cotizacion-ficha.sql.",
    );
  }

  const notas = await prepararDatos(page);
  if (notas.length) {
    throw new Error(`No se pudo preparar cotización en qa-e2e: ${notas.join("; ")}`);
  }
  await page.goto("/cotizaciones");
  const enlace = page.locator('a[href^="/cotizaciones/"]').filter({ hasText: /CPQ-\d{4}-\d+/ }).first();
  await expect(enlace).toBeVisible({ timeout: 60_000 });
  await enlace.click();
  await expect(page.getByRole("heading", { name: /^CPQ-/ }).first()).toBeVisible({ timeout: 60_000 });
}