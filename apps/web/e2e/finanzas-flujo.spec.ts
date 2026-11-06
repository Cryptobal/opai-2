import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { E2E_PASSWORD, entrar } from "./sesion";

/** CAR-139 · Flujo de caja PR 3: capturas de planilla tras columnas tabular-nums (375 / 1024 / 1280). */
test.describe("Finanzas · flujo de caja", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("planilla visible sin scroll horizontal", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/finanzas/flujo");
    await expect(page.getByRole("heading", { name: "Flujo de caja" })).toBeVisible();
    // En una base sin filas del flujo (CI) no hay planilla, solo el aviso «Sin filas en el flujo»: la
    // ausencia de scroll horizontal se mide igual, y la hidratación solo se espera si hay tabla.
    const tabla = page.locator("table").first();
    const sinFilas = page.getByText("Sin filas en el flujo");
    await expect(tabla.or(sinFilas).first()).toBeVisible();
    if (await tabla.count()) await hidratado(tabla);
    const ancho = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(ancho).toBeLessThanOrEqual(2);
    await page.screenshot({
      path: `e2e/__screenshots__/finanzas-flujo-${info.project.name}.png`,
      fullPage: true,
    });
  });
});
