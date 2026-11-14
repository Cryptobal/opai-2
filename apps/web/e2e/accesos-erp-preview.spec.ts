import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-474: Accesos en el ERP (Operaciones). Registros con ficha a la derecha, En sitio e Intentos denegados.
// La empresa de prueba puede no tener registros: entonces se revisa el estado vacío y la navegación.
test.describe("@preview acceso: Accesos en el ERP", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("registros, ficha y secciones", async ({ page }, info) => {
    await entrar(page);
    // Diseño oficial (ADR-109): el nuevo, no el clásico que fija por defecto playwright.config.
    await page
      .context()
      .addCookies([{ name: "opai_marco", value: "nuevo", url: new URL(page.url()).origin }]);
    await page.goto("/accesos");
    await expect(page.getByPlaceholder("Buscar por nombre, empresa o patente")).toBeVisible({
      timeout: 60_000,
    });
    await capturar(page, info, "accesos-registros");

    const fila = page
      .locator(
        'a[href^="/accesos/"]:not([href^="/accesos/intentos"]):not([href^="/accesos/listas"])',
      )
      .first();
    if ((await fila.count()) === 0) {
      // Sin registros (p. ej. test.opai.cl sin ACCESO_HUELLA_SECRET, CAR-483): la ficha no se recorre y se anota.
      test
        .info()
        .annotations.push({ type: "sin-datos", description: "Sin registros: ficha no recorrida" });
    } else {
      await fila.click();
      await expect(page.getByText("Documento enmascarado")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText("Historial")).toBeVisible();
      await capturar(page, info, "accesos-ficha");
    }

    await page.goto("/accesos?estado=en_sitio");
    await expect(page.getByPlaceholder("Buscar por nombre, empresa o patente")).toBeVisible({
      timeout: 60_000,
    });
    await capturar(page, info, "accesos-en-sitio");

    await page.goto("/accesos/intentos");
    await expect(
      page
        .getByText(/Sin intentos denegados|Bloqueado|Fuera de lista|Fuera de horario|Pase ya usado/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({
      timeout: 60_000,
    });
    await capturar(page, info, "accesos-intentos");
  });
});
