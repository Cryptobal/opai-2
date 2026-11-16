import { type Page, expect } from "@playwright/test";

import { prepararDatos } from "./auditoria/datos";
import { EN_PREVIEW } from "./preview";

export const CODIGO_COTIZACION_QA = "CPQ-2026-901";
export const TITULO_COTIZACION_QA = "Cotización ficticia preview";
/** Id fijo de `packages/db/scripts/qa-e2e/cotizacion-ficha.sql` (solo qa-e2e). */
export const ID_COTIZACION_QA = "00000000-0000-7000-8000-000000544002";

const RUTA_FICHA = `/cotizaciones/${ID_COTIZACION_QA}`;

/** El código CPQ puede no ir en `heading` en teléfono (patrón lista+ficha). */
async function codigoVisibleEnFicha(page: Page, timeout = 60_000): Promise<boolean> {
  return page
    .getByText(CODIGO_COTIZACION_QA, { exact: true })
    .first()
    .isVisible({ timeout })
    .catch(() => false);
}

async function abrirFichaSemilla(page: Page): Promise<boolean> {
  const reintentos = EN_PREVIEW ? 4 : 1;
  for (let i = 0; i < reintentos; i++) {
    await page.goto(RUTA_FICHA);
    await page.waitForURL(new RegExp(`/cotizaciones/${ID_COTIZACION_QA}`), { timeout: 60_000 }).catch(() => undefined);
    if (await codigoVisibleEnFicha(page, EN_PREVIEW ? 30_000 : 60_000)) return true;
    if (i < reintentos - 1) await page.waitForTimeout(2_500);
  }
  return false;
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
  if (await abrirFichaSemilla(page)) return;

  if (await filaSemillaEnLista(page)) {
    await page.goto(RUTA_FICHA);
    await expect(page.getByText(CODIGO_COTIZACION_QA, { exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
    return;
  }

  await page.goto(`/cotizaciones?q=${encodeURIComponent(TITULO_COTIZACION_QA)}`);
  const porTitulo = page.locator('a[href^="/cotizaciones/"]').filter({ hasText: /CPQ-\d{4}-\d+/ });
  if (await porTitulo.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
    await porTitulo.first().click();
    await expect(page.getByText(/^CPQ-\d{4}-\d+/).first()).toBeVisible({ timeout: 60_000 });
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
  await expect(page.getByText(/^CPQ-\d{4}-\d+/).first()).toBeVisible({ timeout: 60_000 });
}