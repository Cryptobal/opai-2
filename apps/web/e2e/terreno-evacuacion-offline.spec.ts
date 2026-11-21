import { expect, test } from "@playwright/test";

import { porteriaEntradaYSalida } from "./terreno-porteria-apoyo";

/**
 * CAR-631 · R26: con una copia sincronizada, la portería muestra «en sitio» y permite exportar evacuación sin red.
 */
test("@preview evacuación sin conexión: copia local y exportar", async ({ page, context }) => {
  test.setTimeout(120_000);
  const ok = await porteriaEntradaYSalida(page);
  test.skip(!ok, "Control de acceso inactivo en qa-e2e");

  await expect(page.getByRole("region", { name: "Lista de evacuación" })).toBeVisible({
    timeout: 15_000,
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("region", { name: "En sitio" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Sin conexión: ves la última copia/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar o compartir lista" })).toBeVisible();
  await context.setOffline(false);
});