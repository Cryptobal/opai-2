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

// H2 (CAR-324): la piel Hilo de los indicadores y del tablero en pantallas reales. Corre también en
// `preview-e2e` (A2.10) con el usuario de la empresa ficticia `qa-e2e`; no depende de datos sembrados.
test.describe("@preview piel Hilo de indicadores y estados", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Inicio y Consumos con indicadores sin tarjeta; el clásico los conserva", async ({
    page,
  }, info) => {
    test.setTimeout(240_000);
    await entrar(page);
    await elegirMarco(page, /^Hilo/);
    await expect(marco(page)).toBeVisible({ timeout: 60_000 });
    const errores = erroresDeConsola(page);

    await page.goto("/");
    await contenidoHidratado(page);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const indicadores = page.getByRole("region", { name: "Indicadores" });
    if (await indicadores.count()) {
      // Sin tarjeta: sin radio ni fondo, con la línea encima.
      const estilo = await indicadores.locator("a > div").first().evaluate((e) => {
        const c = getComputedStyle(e);
        return { radio: c.borderTopLeftRadius, arriba: c.borderTopWidth, abajo: c.borderBottomWidth };
      });
      expect(estilo).toEqual({ radio: "0px", arriba: "1px", abajo: "0px" });
    }
    await captura(page, "hilo-h2-inicio", info);

    await page.goto("/configuracion/consumos");
    await contenidoHidratado(page);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await captura(page, "hilo-h2-consumos", info);
    expect(errores).toEqual([]);

    // De vuelta al clásico, el indicador recupera su tarjeta.
    await elegirMarco(page, /^Clásico/);
    await expect(marco(page)).toHaveCount(0, { timeout: 60_000 });
    await page.goto("/");
    await contenidoHidratado(page);
    if (await indicadores.count()) {
      const radio = await indicadores
        .locator("a > div")
        .first()
        .evaluate((e) => getComputedStyle(e).borderTopLeftRadius);
      expect(radio).not.toBe("0px");
    }
  });
});
