import { expect, type Locator, type Page, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-12 (Brief 05, §14 CA1): la campana, el buscador y el botón de usuario mantienen tamaño y
// posición idénticos al cambiar de vista, en las tres anchuras. Desde ADR-050 (reemplaza la D7) el
// teléfono vuelve a tener «Buscar» en la barra superior y no en la inferior, y a 1280 el usuario va al
// pie de la barra lateral (ShellPhone, ShellTablet y ShellDesktop).

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

// Vistas del recorrido de CA1: lista, vista dentro de la lista, otra lista, hoja sobre la lista e Inicio.
// «Nueva cuenta» abre una hoja (Sheet) modal: Radix deja la cabecera inerte (aria-hidden) mientras la
// hoja está abierta, así que esa vista se mide tras abrir y cerrar la hoja (la cabecera no debe moverse
// al abrir una hoja sobre la lista), no con la hoja encima.
const VISTAS = [
  { nombre: "Personas", ruta: "/personas" },
  { nombre: "Vencimientos", ruta: "/personas/vencimientos" },
  { nombre: "Cuentas", ruta: "/cuentas" },
  { nombre: "Nueva cuenta", ruta: "/cuentas?nueva=1", hoja: "Nueva cuenta" },
  { nombre: "Inicio", ruta: "/" },
] as const;

/** Caja real del único control visible que coincide: sin redondeo ni tolerancia. */
async function caja(loc: Locator) {
  const visible = loc.filter({ visible: true }).first();
  await expect(visible).toBeVisible();
  const b = await visible.boundingBox();
  if (!b) throw new Error("sin boundingBox");
  return {
    x: b.x,
    y: b.y,
    w: b.width,
    h: b.height,
  };
}

const campanaDe = (page: Page) =>
  page.locator("header").getByRole("link", { name: /notificaciones/i });
// A 1280 el usuario está al pie de la barra lateral; en 375 y 1024, en la cabecera.
const usuarioDe = (page: Page) =>
  page.locator("header, nav").getByRole("button", { name: "Menú de usuario" });

test.describe("cabecera estable (CAR-12, CA1)", () => {
  test.beforeEach(() => {
    if (!password && process.env["CI"])
      throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD en CI.");
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  });

  test("la campana, el buscador y el usuario no cambian de tamaño ni de posición", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/cuentas");
    const enlaceFicha = page.locator('main a[href^="/cuentas/"]').first();
    await expect(enlaceFicha).toBeVisible();
    const rutaFicha = await enlaceFicha.getAttribute("href");
    if (!rutaFicha) throw new Error("Falta la ficha de cuenta sembrada para e2e");
    const vistas = [...VISTAS, { nombre: "Ficha de cuenta con Atrás", ruta: rutaFicha }];
    const telefono = info.project.name === "telefono";
    // A 375 el buscador es el ícono «Buscar» de la cabecera; en md+ es la caja de búsqueda.
    const buscador = telefono
      ? page.locator("header").getByRole("button", { name: "Buscar", exact: true })
      : page.locator("header").getByRole("button", { name: /^Buscar/ });

    const refs: Record<string, { x: number; y: number; w: number; h: number }> = {};
    for (const vista of vistas) {
      await page.goto(vista.ruta);
      if ("hoja" in vista) {
        // La hoja modal deja la cabecera inerte: se comprueba que abra sobre la lista y se cierra
        // antes de medir, para verificar que abrir y cerrar una hoja no mueve la cabecera.
        const hoja = page.getByRole("dialog", { name: vista.hoja });
        await expect(hoja).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(hoja).toBeHidden();
      }
      await expect(campanaDe(page)).toBeVisible();
      await page.waitForLoadState("networkidle");
      const actual = {
        campana: await caja(campanaDe(page)),
        usuario: await caja(usuarioDe(page)),
        buscador: await caja(buscador),
      };
      if (telefono) {
        // «Buscar» ya no está en la barra inferior (ADR-050).
        const inferior = page
          .getByRole("navigation", { name: "Principal" })
          .filter({ visible: true });
        await expect(inferior.getByRole("button", { name: "Buscar" })).toHaveCount(0);
      }
      for (const [clave, valor] of Object.entries(actual)) {
        if (refs[clave]) expect(valor, `${clave} en ${vista.nombre}`).toEqual(refs[clave]);
        else refs[clave] = valor;
      }
      if (vista.nombre === "Vencimientos") {
        await page.getByRole("button", { name: /Faltan/ }).click();
        const filtrada = {
          campana: await caja(campanaDe(page)),
          usuario: await caja(usuarioDe(page)),
          buscador: await caja(buscador),
        };
        expect(filtrada).toEqual(actual);
      }
    }
  });
});
