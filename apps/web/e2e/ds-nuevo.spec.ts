import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
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
    // Captura después de hidratar: la captura oculta el cursor de texto y, antes, React lo ve como un
    // atributo que no coincide con el HTML del servidor.
    await hidratado(page.getByRole("button", { name: "Amarillo" }));
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
      // Plegado como en Linear (CAR-442): sin riel de íconos, queda el botón «Mostrar el menú».
      const mostrar = page.getByRole("button", { name: "Mostrar el menú" });
      await expect(mostrar).toBeVisible();
      await page.mouse.move(900, 500);
      await expect(page.locator("nav[data-riel-nuevo]")).toBeHidden();
      await capturar(page, info, "ds-nuevo-marco-oculto");
      // Al pasar el mouse por el botón se asoma el menú completo; al alejarse se esconde.
      await mostrar.hover();
      const completo = page
        .getByRole("navigation", { name: "Principal" })
        .filter({ hasText: "Cotizaciones" })
        .first();
      await expect(completo).toBeVisible();
      await capturar(page, info, "ds-nuevo-marco-asomado");
      await page.mouse.move(900, 500);
      await expect(page.getByText("OPAI", { exact: true })).toBeHidden();
      // El atajo «[» de Linear lo deja fijo y lo vuelve a plegar.
      await page.keyboard.press("[");
      await expect(page.getByRole("button", { name: "Ocultar el menú" })).toBeVisible();
      await page.keyboard.press("[");
      await expect(mostrar).toBeVisible();
      // Con el mouse en el borde izquierdo se asoma y su botón lo deja fijo.
      await page.mouse.move(2, 400);
      await page.getByRole("button", { name: "Dejar el menú fijo" }).click();
      await expect(page.getByRole("button", { name: "Ocultar el menú" })).toBeVisible();
      // El navegador recuerda la elección: vuelve fijo tras recargar.
      await page.reload();
      await expect(page.getByRole("button", { name: "Ocultar el menú" })).toBeVisible();
    }
    expect(errores).toEqual([]);
  });
});

test.describe("lista con selección (CAR-335 D4a)", () => {
  test.skip(EN_PREVIEW, "La muestra /ds/nuevo/lista solo existe fuera de producción");

  test("se eligen filas, aparece la barra con la acción y se quita la selección", async ({
    page,
  }, info) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, "La selección va en la tabla desde md");
    const errores = erroresDeConsola(page);
    await page.goto("/ds/nuevo/lista");
    const primera = page.getByRole("checkbox", { name: "Seleccionar [CUENTA A]" });
    await hidratado(primera);
    await primera.click();
    await page.getByRole("checkbox", { name: "Seleccionar [CUENTA B]" }).click();
    await expect(
      page.getByRole("region", { name: "Selección" }).getByText("2 filas seleccionadas"),
    ).toBeVisible();
    await expect(page.getByTestId("accion-muestra")).toHaveText("Archivar 2");
    await capturar(page, info, "nuevo-lista-seleccion");
    await page.getByRole("checkbox", { name: "Seleccionar todas las filas" }).click();
    await expect(
      page.getByRole("region", { name: "Selección" }).getByText("3 filas seleccionadas"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Quitar selección" }).click();
    await expect(page.getByRole("region", { name: "Selección" })).toHaveCount(0);
    // El foco vuelve a la casilla de la cabecera y el lector de pantalla oyó el conteo.
    await expect(page.getByRole("checkbox", { name: "Seleccionar todas las filas" })).toBeFocused();
    expect(errores).toEqual([]);
  });
});
