import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { BARRA, captura, enTelefono, erroresDeConsola, marco } from "./hilo-apoyo";
import { ocultarIndicadorDev } from "./indicador-dev";
import { EN_PREVIEW } from "./preview";

// Muestra `/ds/hilo` del marco «Hilo» (ADR-090, CAR-278): estados del marco y piezas por dentro.
test.beforeEach(async ({ page }) => ocultarIndicadorDev(page));

// La muestra vive en `/ds`, que no existe en la vista previa (compilación de producción). El job e2e de
// CI corre `next dev` con BASE_URL en localhost: ahí la muestra sí existe y se prueba.
const SIN_MUESTRA = EN_PREVIEW;

test.describe("muestra del marco Hilo", () => {
  test.skip(SIN_MUESTRA, "La muestra /ds/hilo solo existe fuera de producción");
  test("hilo, lienzo y barra; segmentos, Índice y Portales", async ({ page }, info) => {
    const errores = erroresDeConsola(page);
    await page.goto("/ds/hilo");
    await expect(marco(page)).toHaveAttribute("data-vista", "inicio");
    await expect(page.getByRole("complementary", { name: "Hilo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Buen día, Camilo." })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Pendientes/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: BARRA })).toBeVisible();
    await captura(page, "hilo-ds-inicio", info);

    const actividad = page.getByRole("tab", { name: "Actividad" });
    await hidratado(actividad);
    await actividad.click();
    await expect(page.getByText("Calzó 23 movimientos del banco")).toBeVisible();
    await page.getByRole("tab", { name: "Agenda" }).click();
    await expect(page.getByText("Sin cobertura")).toBeVisible();

    await page.getByRole("button", { name: "Índice de todo el portal" }).click();
    await expect(page.getByRole("heading", { name: "Índice", exact: true })).toBeVisible();
    const indice = page.getByRole("navigation", { name: "Índice" });
    await expect(indice.getByRole("link", { name: "Cuentas" })).toBeVisible();
    await captura(page, "hilo-ds-indice", info);
    await page.getByRole("button", { name: "Cerrar Índice" }).click();
    await expect(indice).toHaveCount(0);

    // En teléfono, cerrar el panel devuelve al hilo; desde 1024 px el hilo nunca dejó de verse.
    // Sin botón «Portales» aparte (CAR-317): el selector es la identidad de la cabecera.
    await expect(page.getByRole("button", { name: "Portales", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /\. Cambiar de portal o de empresa$/ }).click();
    await expect(page.getByText("Aquí estás").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await captura(page, "hilo-ds-portales", info);
    expect(errores).toEqual([]);
  });

  test("sin pendientes, con error y en una planilla", async ({ page }, info) => {
    await page.goto("/ds/hilo?estado=vacio");
    await expect(page.getByText("Nada espera tu decisión.")).toBeVisible();
    await page.goto("/ds/hilo?estado=error");
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(page.getByText("Te avisamos si aparece algo.")).toHaveCount(0);

    await page.goto("/ds/hilo?vista=ancha");
    await expect(marco(page)).toHaveAttribute("data-vista", "ancha");
    await expect(page.getByRole("complementary", { name: "Hilo" })).toBeHidden();
    // El riel (hilo plegado) existe desde 1024 px; en teléfono se vuelve con el botón del lienzo.
    if (enTelefono(page)) await expect(page.getByRole("link", { name: "Volver al hilo" })).toBeVisible();
    else await expect(page.getByRole("navigation", { name: "Hilo plegado" })).toBeVisible();
    await captura(page, "hilo-ds-planilla", info);
  });
});

test.describe("piel Hilo de las pantallas por dentro", () => {
  test.skip(SIN_MUESTRA, "La muestra /ds/hilo solo existe fuera de producción");
  test("botones, campos, etiquetas y tablas siguen el diseño dentro del marco", async ({ page }, info) => {
    await page.goto("/ds/hilo?vista=piezas");
    await expect(marco(page)).toHaveAttribute("data-vista", "pantalla");
    const estilo = (nombre: string, prop: string, pseudo = "") =>
      page
        .getByTestId(nombre)
        .evaluate((n, [p, ps]) => getComputedStyle(n, ps || null).getPropertyValue(p ?? ""), [prop, pseudo]);
    const tinta = await marco(page).evaluate((n) => getComputedStyle(n).color);
    // La acción principal de una persona va en tinta; el índigo queda para lo que viene del agente.
    expect(await estilo("pieza-boton", "background-color")).toBe(tinta);
    expect(await estilo("pieza-boton", "border-top-left-radius")).toBe("12px");
    expect(await estilo("pieza-campo", "border-top-left-radius")).toBe("12px");
    // Etiqueta de estado sin punto y tabla sin tarjeta: filas con línea, como en el diseño.
    expect(await estilo("pieza-etiqueta", "display", "::before")).toBe("none");
    const marcoTabla = page.getByTestId("pieza-tabla").locator("xpath=..");
    expect(await marcoTabla.evaluate((n) => getComputedStyle(n).borderTopWidth)).toBe("0px");
    // H2 (CAR-324): estados a la izquierda y sin borde; indicador sin tarjeta; esqueleto en filas.
    const piezas = page.getByTestId("piezas-estados");
    const css = (sel: string, props: string[]) =>
      piezas
        .locator(sel)
        .first()
        .evaluate((n, ps) => ps.map((x) => getComputedStyle(n).getPropertyValue(x)), props);
    expect(await css(".ds-estado", ["text-align", "border-top-width", "align-items"])).toEqual([
      "left",
      "0px",
      "flex-start",
    ]);
    expect(await css(".ds-estado-icono", ["width", "border-top-left-radius"])).toEqual(["44px", "14px"]);
    expect(await css(".ds-kpi", ["border-top-left-radius", "border-top-width", "border-right-width"])).toEqual([
      "0px",
      "1px",
      "0px",
    ]);
    expect(await css(".ds-esq-fila", ["height", "border-bottom-width"])).toEqual(["61px", "1px"]);
    await captura(page, "hilo-ds-piezas", info);
  });
});
