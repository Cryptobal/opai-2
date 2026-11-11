import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Espera a que React hidrate el control (deja sus props en el nodo). En `pnpm dev` el control se
 * pinta antes de hidratarse y un clic en esa ventana se pierde: la prueba fallaba de forma
 * intermitente sin que la pantalla tuviera un error.
 */
export async function hidratado(control: Locator) {
  await expect
    .poll(() => control.evaluate((n) => Object.keys(n).some((k) => k.startsWith("__reactProps"))), {
      timeout: 30_000,
    })
    .toBe(true);
}

/**
 * Espera a que React hidrate el contenido de la página, no solo el marco. El marco hidrata primero
 * y el contenido cerca de un segundo después; en `pnpm dev`, navegar en esa ventana a menos de
 * 1024 px deja a React de desarrollo con errores de hidratación en cadena. Con la compilación de
 * producción no ocurre (medido con la CPU seis veces más lenta, CAR-278).
 */
export async function contenidoHidratado(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const c = document.querySelector("[data-contenido]");
          return c !== null && Object.keys(c).some((k) => k.startsWith("__reactFiber"));
        }),
      { timeout: 30_000 },
    )
    .toBe(true);
}
