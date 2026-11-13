import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-369 (Sesión Diseño): en el marco Hilo la fila seleccionada no usa el índigo del agente. Corre en
// `preview-e2e` con el usuario de la empresa ficticia `qa-e2e`.
const BASE = process.env["BASE_URL"] ?? "http://localhost:3000";

test.describe("@preview fila seleccionada sin índigo en Hilo", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("Configuración › Módulos marca la fila elegida en gris y tinta", async ({
    page,
    context,
  }, info) => {
    // En el teléfono la lista lateral no acompaña al detalle (se ve una u otro): no hay fila elegida.
    test.skip(info.project.name === "telefono", "Sin lista lateral en el teléfono");
    test.setTimeout(150_000);
    await context.addCookies([{ name: "opai_marco", value: "hilo", url: BASE }]);
    await entrar(page);
    await page.goto("/configuracion/modulos");
    const fila = page
      .locator(".bg-accent-muted")
      .filter({ hasText: "Catálogo de módulos", visible: true })
      .first();
    await expect(fila).toBeVisible({ timeout: 60_000 });
    const oscuro = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);
    if (!oscuro) {
      await expect(fila).toHaveCSS("background-color", "rgb(240, 240, 238)");
    }
    await capturar(page, info, "hilo-fila-seleccionada");
  });
});
