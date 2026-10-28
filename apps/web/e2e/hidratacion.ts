import { expect, type Locator } from "@playwright/test";

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
