import { expect, type Page } from "@playwright/test";

const ENLACE_PERSONA = 'a[href^="/personas/"]:not([href*="vencimientos"])';

/** Abre la primera persona visible de qa-e2e y devuelve el prefijo de ruta de la ficha. */
export async function abrirUnaPersona(page: Page): Promise<string> {
  await page.goto("/personas");
  await expect(page.getByText("Algo salió mal")).toHaveCount(0);
  const primera = page.locator(ENLACE_PERSONA).filter({ visible: true }).first();
  await expect(primera, "qa-e2e tiene al menos una persona ficticia").toBeVisible({
    timeout: 60_000,
  });
  await primera.click();
  await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
  return new URL(page.url()).pathname.match(/^\/personas\/[0-9a-f-]{36}/)?.[0] ?? "";
}