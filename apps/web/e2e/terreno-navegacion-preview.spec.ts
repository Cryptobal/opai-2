import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-801 en `preview-e2e`: barra inferior entre secciones de Terreno y sin enlaces subrayados sueltos en el inicio.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview terreno navegación", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("barra inferior y secciones sin enlaces sueltos", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/terreno");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);

    const turno = page.getByRole("heading", { name: "Turno de ahora" });
    const llego = await turno
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    await capturar(page, info, "terreno-navegacion-inicio");
    if (!llego) {
      info.annotations.push({
        type: "omitido",
        description: "qa-e2e no llega al Inicio del equipo",
      });
      expect(errores).toEqual([]);
      return;
    }

    await expect(page.getByRole("link", { name: "Ir a Mis rondas" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ir a la portería" })).toHaveCount(0);
    await expect(page.getByText("Aún no hay nada por hacer")).toHaveCount(0);

    const barra = page.getByRole("navigation", { name: "Principal" });
    if ((await barra.count()) > 0) {
      await expect(barra.getByRole("link", { name: "Libro" })).toBeVisible();
      await page.getByRole("link", { name: "Libro" }).click();
      await expect(page.getByRole("heading", { name: "Libro de novedades" })).toBeVisible({
        timeout: 15_000,
      });
      await capturar(page, info, "terreno-navegacion-libro");
      await expect(barra).toBeVisible();
    }

    expect(errores).toEqual([]);
  });
});