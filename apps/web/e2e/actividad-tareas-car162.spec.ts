import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-162 · Actividad y tareas: registrar una tarea en un negocio, verla en la línea de tiempo y en
// Mis tareas, marcarla hecha. Capturas de evidencia a 375, 1024 y 1280 px (en test-results/).
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const ANCHOS = [375, 1024, 1280] as const;

test.describe("Comercial · Actividad y tareas", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("registrar nota y tarea, ver Mis tareas y marcar hecha", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/negocios?vista=lista");
    const primero = page
      .getByRole("region", { name: "Lista de negocios" })
      .locator('a[href^="/negocios/"]')
      .first();
    test.skip((await primero.count()) === 0, "Sin negocios en el entorno");
    await primero.click();
    await page.waitForURL(/\/negocios\/[0-9a-f-]{36}/);
    await page.goto(`${new URL(page.url()).pathname}/actividad`);

    const titulo = `Tarea e2e ${Date.now()}`;
    // En escritorio el compositor va en línea; en teléfono, en una hoja.
    await page.setViewportSize({ width: 1280, height: 900 });
    const compositor = page.getByRole("region", { name: "Registrar actividad" });
    await expect(compositor).toBeVisible();
    const tipoTarea = compositor.getByRole("button", { name: "Tarea", exact: true });
    // El compositor se carga aparte: un clic antes de hidratar se pierde y el texto queda como nota.
    await hidratado(tipoTarea);
    await tipoTarea.click();
    await expect(tipoTarea).toHaveAttribute("aria-pressed", "true");
    await compositor.getByRole("textbox").first().fill(titulo);
    await compositor.getByRole("button", { name: "Crear tarea" }).click();
    await expect(page.getByText(titulo).first()).toBeVisible();

    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.screenshot({ path: info.outputPath(`actividad-${ancho}.png`), fullPage: true });
    }

    await page.goto("/tareas?ver=equipo");
    await expect(page.getByRole("heading", { name: /Mis tareas/ }).first()).toBeVisible();
    const fila = page.getByText(titulo).first();
    await expect(fila).toBeVisible();
    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.screenshot({ path: info.outputPath(`mis-tareas-${ancho}.png`), fullPage: true });
    }
    await page.getByRole("checkbox", { name: new RegExp(titulo) }).first().click();
    await expect(page.getByText("Tarea hecha").first()).toBeVisible();
  });
});
