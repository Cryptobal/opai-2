import { expect, type Page, test } from "@playwright/test";

import { contenidoHidratado, hidratado } from "./hidratacion";
import { captura, erroresDeConsola, marco } from "./hilo-apoyo";
import { ocultarIndicadorDev } from "./indicador-dev";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.beforeEach(async ({ page }) => ocultarIndicadorDev(page));

async function elegirMarco(page: Page, nombre: RegExp) {
  await page.goto("/mi-cuenta/preferencias");
  const radio = page.getByRole("radio", { name: nombre });
  await hidratado(radio);
  await radio.click();
  await expect(page.getByRole("radio", { name: nombre })).toBeChecked();
}

// H3 (CAR-331): Actividad y Agenda del hilo leen `core.hilo.actividad` y `core.hilo.agenda`. Corre en
// `preview-e2e` (A2.10) con el usuario de `qa-e2e`; no depende de datos sembrados: con o sin filas, el
// segmento debe quedar listo (lista o vacío), nunca en error ni sin permiso para el dueño.
test.describe("@preview hilo: Actividad y Agenda", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("los segmentos Actividad y Agenda cargan sin error", async ({ page }, info) => {
    test.setTimeout(240_000);
    await entrar(page);
    await elegirMarco(page, /^Hilo/);
    await expect(marco(page)).toBeVisible({ timeout: 60_000 });
    const errores = erroresDeConsola(page);
    await page.goto("/");
    await contenidoHidratado(page);

    const panel = page.locator("#hilo-panel");
    for (const [nombre, archivo] of [
      ["Actividad", "hilo-h3-actividad"],
      ["Agenda", "hilo-h3-agenda"],
    ] as const) {
      const tab = page.getByRole("tab", { name: nombre });
      await hidratado(tab);
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expect(panel.getByRole("status", { name: "Cargando" })).toHaveCount(0, {
        timeout: 30_000,
      });
      await expect(panel.getByText(/No pudimos|No tienes permiso/)).toHaveCount(0);
      await captura(page, archivo, info);
    }
    expect(errores).toEqual([]);
    await elegirMarco(page, /^Clásico/);
  });
});
