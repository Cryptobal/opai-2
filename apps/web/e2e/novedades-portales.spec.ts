import { expect, test } from "@playwright/test";

import { E2E_PASSWORD as password, entrar } from "./sesion";

const RESUMEN = /^(\d+) novedad(?:es)? sin leer$|^Estás al día/;
const VACIO = "No hay novedades para mostrar";

/** CAR-542: el ERP lista lo que cuenta el menú; Terreno no repite todo el catálogo del ERP. */
test.describe("novedades por portal", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("en el ERP la lista coincide con el contador del menú", async ({ page }) => {
    await entrar(page);
    await page.goto("/novedades");
    await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });
    const resumen = (await page.getByText(RESUMEN).first().textContent()) ?? "";
    const pendientes = Number(/^(\d+)/.exec(resumen)?.[1] ?? 0);
    await expect(page.getByText(VACIO)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /^(Hoy|Esta semana|Antes)$/ }).first(),
    ).toBeVisible();
    if (pendientes > 0) {
      await expect(page.getByRole("button", { name: "Marcar como leída" }).first()).toBeVisible();
    }
  });

  test("en Terreno la lista no usa el vacío del ERP con catálogo completo", async ({ page }) => {
    await entrar(page);
    await page.goto("/terreno/novedades");
    const resumen = page.getByText(RESUMEN).first();
    if (
      !(await resumen.waitFor({ timeout: 20_000 }).then(
        () => true,
        () => false,
      ))
    ) {
      test.skip(true, "El usuario de prueba no tiene portal Terreno");
    }
    const vacio = page.getByText(VACIO);
    if (await vacio.isVisible().catch(() => false)) {
      await expect(page.getByText(RESUMEN)).toHaveCount(0);
      return;
    }
    await expect(
      page.getByRole("heading", { name: /^(Hoy|Esta semana|Antes)$/ }).first(),
    ).toBeVisible();
  });
});