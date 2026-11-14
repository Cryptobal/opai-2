import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-83: pestaña «Visitas» de la ficha de instalación (historial de visitas de supervisión). Con la
// empresa de prueba sin visitas, se verifica y captura el estado vacío.
test.describe("@preview instalación: pestaña Visitas", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la ficha muestra la pestaña Visitas con su lista o el estado vacío", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/instalaciones");
    const primera = page
      .locator('a[href^="/instalaciones/"]:not([href="/instalaciones/nueva"])')
      .first();
    await expect(primera).toBeVisible({ timeout: 60_000 });
    const href = await primera.getAttribute("href");
    const id = href?.match(/\/instalaciones\/([0-9a-f-]{36})/)?.[1];
    test.skip(!id, "La empresa de prueba no tiene instalaciones");
    await page.goto(`/instalaciones/${id}/visitas`);
    await expect(page.getByRole("link", { name: "Visitas", exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page
        .getByText("Aún no hay visitas", { exact: true })
        .or(page.getByText("Supervisor", { exact: true }).first()),
    ).toBeVisible();
    await capturar(page, info, "instalacion-visitas");
  });
});
