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

/**
 * Pulsa un control hasta que aparezca lo que abre (menú, hoja, diálogo). Espera la hidratación y
 * reintenta: en dev el primer clic puede llegar antes de que React lo atienda.
 */
export async function abrirCon(control: Locator, abierto: Locator) {
  await hidratado(control);
  await expect(async () => {
    if (!(await abierto.isVisible())) await control.click();
    await expect(abierto).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
}
