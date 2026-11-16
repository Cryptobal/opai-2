import { expect, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-477: desde la ficha de un registro en sitio, «Registrar salida» y «Anular registro» con motivo.
// Sin registros en sitio (p. ej. la vista previa sin ACCESO_HUELLA_SECRET, CAR-483) se anota y se sale.
test.describe("@preview acceso: correcciones desde la ficha", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("registrar salida y anular", async ({ page }, info) => {
    await entrar(page);
    await page
      .context()
      .addCookies([{ name: "opai_marco", value: "nuevo", url: new URL(page.url()).origin }]);
    await page.goto("/accesos?estado=en_sitio");
    await expect(page.getByPlaceholder("Buscar por nombre, empresa o patente")).toBeVisible({
      timeout: 60_000,
    });
    const filas = page.locator(
      'a[href^="/accesos/"]:not([href^="/accesos/intentos"]):not([href^="/accesos/listas"])',
    );
    if ((await filas.count()) < 2) {
      test.info().annotations.push({ type: "sin-datos", description: "Menos de 2 en sitio" });
      return;
    }
    await filas.first().click();
    const salida = page.getByRole("button", { name: "Registrar salida" }).filter({ visible: true });
    await expect(async () => {
      await salida.first().click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 60_000 });
    await capturarHoja(page, info, "accesos-registrar-salida");
    await page.getByRole("dialog").getByRole("button", { name: "Registrar salida" }).click();
    await expect(
      page
        .getByText(/^Salió /)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({
      timeout: 30_000,
    });

    await page.goto("/accesos?estado=en_sitio");
    await filas.first().click();
    const anular = page.getByRole("button", { name: "Anular registro" }).filter({ visible: true });
    await expect(async () => {
      await anular.first().click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 60_000 });
    await page.getByRole("dialog").getByRole("textbox").fill("Registrado por error en la prueba");
    await page.getByRole("dialog").getByRole("button", { name: "Anular registro" }).click();
    await expect(
      page
        .getByText(/^Anulado el /)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({
      timeout: 30_000,
    });
    await capturar(page, info, "accesos-anulado");
  });
});
