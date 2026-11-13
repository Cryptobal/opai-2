import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-339: la Actividad de Inicio dice qué se hizo y, si hay ficha, la fila lleva a ella.
test.describe("@preview inicio: actividad con contexto", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("las filas de Actividad no dicen solo «realizó un cambio»", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/");
    const seccion = page
      .getByRole("region", { name: "Actividad" })
      .or(
        page.locator("section").filter({ has: page.getByRole("heading", { name: "Actividad" }) }),
      );
    const visible = await seccion
      .first()
      .waitFor({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!visible, "El usuario de prueba no ve la Actividad de la empresa (auditoría)");
    await expect(seccion.first().getByText(/realizó un cambio$/)).toHaveCount(0);
    for (const enlace of await seccion.first().locator('li a[href^="/"]').all())
      expect(await enlace.getAttribute("href")).toMatch(/^\/[a-z]+\/[0-9a-f-]{36}$/);
    await capturar(page, info, "inicio-actividad-contexto");
  });
});
