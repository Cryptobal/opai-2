import { expect, type Page } from "@playwright/test";

/**
 * Abre la pestaña Accesos de una instalación (la primera de Instalaciones o la que calza con `nombre`) en el
 * segmento `sub`: es la única entrada al control de acceso en el ERP. Devuelve la ruta base de la pestaña.
 */
export async function abrirAccesos(page: Page, sub: string, nombre?: RegExp): Promise<string> {
  await page.goto("/instalaciones");
  const filas = page.locator('a[href^="/instalaciones/0"]').filter({ visible: true });
  const fila = (nombre ? filas.filter({ hasText: nombre }) : filas).first();
  await expect(fila).toBeVisible({ timeout: 60_000 });
  const base = `${(await fila.getAttribute("href"))?.split("?")[0]}/accesos`;
  await page.goto(`${base}?sub=${sub}`);
  return base;
}
