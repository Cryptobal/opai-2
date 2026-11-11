import { expect, type Page, test } from "@playwright/test";

import { contenidoHidratado, hidratado } from "./hidratacion";
import { ocultarIndicadorDev } from "./indicador-dev";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Marco «Hilo» (ADR-090, CAR-278): la muestra `/ds/hilo` con sus estados y, con sesión, el cambio
// desde Preferencias, la navegación dentro del lienzo y la vuelta al marco clásico. Las capturas van a
// e2e/__screenshots__/ para compararlas con docs/2.0/design/export-base-hilo/.

// Texto de la barra: con agente invita a pedir; sin agente, busca.
const BARRA = /Pide, pregunta o busca una pantalla|Busca una pantalla o un registro/;
const marco = (page: Page) => page.locator('div[data-marco="hilo"]');
/** Bajo 1024 px se ve una pieza a la vez (hilo o lienzo), sin riel. */
const enTelefono = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;
const captura = (page: Page, nombre: string, proyecto: string) =>
  page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png` });

// Ruido propio de `next dev`, igual en el marco clásico: el aviso de «uncached data» por la lectura
// de la sesión en el layout, y los dos avisos que deja una recarga en caliente a mitad de la prueba.
const RUIDO_DEV = [
  "encountered uncached data during prerendering or a navigation",
  "The server could not finish this Suspense boundary",
  "Encountered a script tag while rendering React component",
];

function erroresDeConsola(page: Page): string[] {
  const errores: string[] = [];
  const anotar = (texto: string) => {
    if (!RUIDO_DEV.some((r) => texto.includes(r))) errores.push(texto);
  };
  page.on("console", (m) => {
    if (m.type() === "error") anotar(m.text());
  });
  page.on("pageerror", (e) => anotar(String(e)));
  return errores;
}

test.beforeEach(async ({ page }) => ocultarIndicadorDev(page));

// La muestra vive en `/ds`, que no existe en una compilación de producción (ni en la vista previa).
const SIN_MUESTRA = Boolean(process.env["BASE_URL"]);

test.describe("muestra del marco Hilo", () => {
  test.skip(SIN_MUESTRA, "La muestra /ds/hilo solo existe fuera de producción");
  test("hilo, lienzo y barra; segmentos, Índice y Portales", async ({ page }, info) => {
    const p = info.project.name;
    const errores = erroresDeConsola(page);
    await page.goto("/ds/hilo");
    await expect(marco(page)).toHaveAttribute("data-vista", "inicio");
    await expect(page.getByRole("complementary", { name: "Hilo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Buen día, Camilo." })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Pendientes/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: BARRA })).toBeVisible();
    await captura(page, "hilo-ds-inicio", p);

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
    await captura(page, "hilo-ds-indice", p);
    await page.getByRole("button", { name: "Cerrar Índice" }).click();
    await expect(indice).toHaveCount(0);

    // En teléfono, cerrar el panel devuelve al hilo; desde 1024 px el hilo nunca dejó de verse.
    await page.getByRole("button", { name: "Portales", exact: true }).click();
    await expect(page.getByText("Aquí estás").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await captura(page, "hilo-ds-portales", p);
    expect(errores).toEqual([]);
  });

  test("sin pendientes, con error y en una planilla", async ({ page }, info) => {
    const p = info.project.name;
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
    await captura(page, "hilo-ds-planilla", p);
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
    await captura(page, "hilo-ds-piezas", info.project.name);
  });
});

test.describe("marco Hilo con sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("se elige en Preferencias, navega dentro del lienzo y se vuelve al clásico", async ({ page }, info) => {
    test.setTimeout(240_000);
    const p = info.project.name;
    await entrar(page);
    await page.goto("/");
    await expect(marco(page)).toHaveCount(0);

    await page.goto("/mi-cuenta/preferencias");
    const hilo = page.getByRole("radio", { name: /^Hilo/ });
    await hidratado(hilo);
    await hilo.click();
    await expect(marco(page)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("radio", { name: /^Hilo/ })).toBeChecked();
    // Sin parpadeo: con la cookie, el servidor ya manda el marco Hilo en el HTML.
    expect(await (await page.request.get("/mi-cuenta/preferencias")).text()).toContain('data-marco="hilo"');

    const errores = erroresDeConsola(page);
    await page.goto("/");
    await expect(marco(page)).toHaveAttribute("data-vista", "inicio");
    // Los pendientes se piden después de pintar: se espera a que el hilo deje de cargar.
    await expect(page.getByRole("complementary", { name: "Hilo" }).locator('[aria-busy="true"]')).toHaveCount(0, {
      timeout: 60_000,
    });
    await expect(page.getByText("Revisando tus pendientes.")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /Pendientes/ })).toBeVisible();
    // El saludo y lo que requiere decisión viven en el hilo: la página de Inicio no los repite.
    await expect(page.getByText("Requiere tu decisión hoy")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^(Buen día|Buenas tardes|Buenas noches), / })).toHaveCount(1);
    await captura(page, "hilo-erp-inicio", p);
    await contenidoHidratado(page);

    const indice = page.getByRole("button", { name: "Índice de todo el portal" });
    await hidratado(indice);
    await indice.click();
    await captura(page, "hilo-erp-indice", p);
    await page.getByRole("navigation", { name: "Índice" }).getByRole("link", { name: "Cuentas" }).click();
    await expect(page).toHaveURL(/\/cuentas/);
    await expect(marco(page)).toHaveAttribute("data-vista", "pantalla");
    await expect(page.getByRole("navigation", { name: "Índice" })).toHaveCount(0);
    await expect(page.getByRole("main")).toContainText("Elige una cuenta", { timeout: 60_000 });
    await captura(page, "hilo-erp-cuentas", p);

    await page.getByRole("button", { name: BARRA }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.goto("/pauta");
    await expect(marco(page)).toHaveAttribute("data-vista", "ancha");
    await expect(page.getByRole("main")).toContainText("Cobertura del mes", { timeout: 60_000 });
    await captura(page, "hilo-erp-pauta", p);
    expect(errores).toEqual([]);

    await page.goto("/");
    await contenidoHidratado(page);
    const portales = page.getByRole("button", { name: "Portales", exact: true });
    await hidratado(portales);
    await portales.click();
    await captura(page, "hilo-erp-portales", p);
    await page.getByRole("button", { name: "Volver al diseño clásico" }).click();
    await expect(marco(page)).toHaveCount(0, { timeout: 60_000 });
    await expect(page.locator("html")).not.toHaveAttribute("data-marco", "hilo");
  });
});
