import { expect, test } from "@playwright/test";

import { erroresDeConsola } from "./hilo-apoyo";
import { ocultarIndicadorDev } from "./indicador-dev";
import { capturar, EN_PREVIEW } from "./preview";

// Sistema de diseño nuevo (ADR-109, CAR-335 D1): la muestra `/ds/nuevo` con la piel `data-marco="nuevo"`,
// las fuentes Geist y el color de la empresa ajustado de día y de noche. Como `/ds/hilo`, no existe en
// la vista previa (compilación de producción): corre en el job e2e de CI y en local.
test.beforeEach(async ({ page }) => ocultarIndicadorDev(page));

test.describe("muestra del sistema nuevo", () => {
  test.skip(EN_PREVIEW, "La muestra /ds/nuevo solo existe fuera de producción");

  test("piel, fuentes y color de la empresa de día y de noche", async ({ page }, info) => {
    const errores = erroresDeConsola(page);
    await page.goto("/ds/nuevo");
    const muestra = page.getByTestId("muestra-nuevo");
    await expect(muestra).toHaveAttribute("data-marco", "nuevo");
    await expect(page.getByRole("heading", { name: "Sistema de diseño nuevo" })).toBeVisible();
    expect(await muestra.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Geist");
    await expect(page.getByTestId("tonos-acento")).toHaveText("Día #0062d1 · Noche #1784ff");
    await capturar(page, info, "ds-nuevo-dia");

    // Un amarillo no se lee sobre blanco: de día se oscurece y el botón principal lo usa.
    await page.getByRole("button", { name: "Amarillo" }).click();
    await expect(page.getByTestId("tonos-acento")).toHaveText("Día #7f6a00 · Noche #ffd400");
    await page.mouse.move(0, 0);
    await expect(page.getByRole("button", { name: "Amarillo" })).toHaveCSS(
      "background-color",
      "rgb(127, 106, 0)",
    );

    await page.getByRole("button", { name: "Ver de noche" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(muestra).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await capturar(page, info, "ds-nuevo-noche");
    expect(errores).toEqual([]);
  });
});

test.describe("muestra del marco nuevo", () => {
  test.skip(EN_PREVIEW, "La muestra /ds/nuevo/marco solo existe fuera de producción");

  test("el menú se oculta, se asoma al pasar el mouse y se vuelve a fijar", async ({
    page,
  }, info) => {
    const errores = erroresDeConsola(page);
    await page.goto("/ds/nuevo/marco");
    await expect(page.locator('div[data-marco="nuevo"]')).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-marco", "nuevo");
    await capturar(page, info, "ds-nuevo-marco");
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await page.getByRole("button", { name: "Ocultar el menú" }).click();
      const fijar = page.getByRole("button", { name: "Dejar el menú fijo" });
      await expect(fijar).toBeVisible();
      await page.getByRole("navigation", { name: "Principal" }).filter({ has: fijar }).hover();
      const completo = page
        .getByRole("navigation", { name: "Principal" })
        .filter({ hasText: "Cotizaciones" })
        .first();
      await expect(completo).toBeVisible();
      await capturar(page, info, "ds-nuevo-marco-asomado");
      await page.mouse.move(900, 500);
      // El riel también tiene sus enlaces: lo que se esconde es el menú completo, con la marca OPAI.
      await expect(page.getByText("OPAI", { exact: true })).toBeHidden();
      await fijar.click();
      await expect(page.getByRole("button", { name: "Ocultar el menú" })).toBeVisible();
      // El navegador recuerda la elección: vuelve fijo tras recargar.
      await page.reload();
      await expect(page.getByRole("button", { name: "Ocultar el menú" })).toBeVisible();
    }
    expect(errores).toEqual([]);
  });
});
