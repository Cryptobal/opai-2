import { expect, type Page, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// QA del iPad vertical (CAR-6): de 768 a 1023 px las fichas con lista + detalle (Personas, Cuentas,
// Instalaciones) muestran un solo panel a todo el ancho; desde 1024 px la vista dividida sigue igual.

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const MODULOS = [
  { ruta: "/personas", lista: "Lista de personas", volver: "Personas" },
  { ruta: "/cuentas", lista: "Lista de cuentas", volver: "Cuentas" },
  { ruta: "/instalaciones", lista: /^Lista de /, volver: /Instalaciones|Instalaci/ },
] as const;

const ancho = async (page: Page, nombre: string | RegExp) =>
  (await page.getByRole("region", { name: nombre }).filter({ visible: true }).boundingBox())?.width;

/** Controles de la barra superior (enlaces, botones y título) que se pisan entre sí. */
async function solapes(page: Page) {
  return page.evaluate(() => {
    const barra = [...document.querySelectorAll("header")].find((h) => h.offsetParent !== null);
    if (!barra) return ["sin barra"];
    const cajas = [...barra.querySelectorAll<HTMLElement>("a, button, h1")]
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0);
    const malos: string[] = [];
    for (const [i, a] of cajas.entries()) {
      for (const b of cajas.slice(i + 1)) {
        if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
        const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (x > 1 && y > 1)
          malos.push(
            `${a.e.tagName}«${a.e.textContent?.trim().slice(0, 20)}» × ${b.e.tagName}«${b.e.textContent?.trim().slice(0, 20)}»`,
          );
      }
    }
    return malos;
  });
}

const sinDesborde = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** Nada del contenido se sale por la derecha de la ventana (salvo dentro de una tabla con su propio scroll). */
const fueraDeVentana = (page: Page) =>
  page.evaluate(() => {
    const dentroDeScroll = (e: HTMLElement) => {
      for (let a = e.parentElement; a && a.tagName !== "MAIN"; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
      }
      return false;
    };
    return [...document.querySelectorAll<HTMLElement>("main *")]
      .filter((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0)
      .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1)
      .filter((e) => !dentroDeScroll(e))
      .slice(0, 5)
      .map((e) => `${e.tagName}.${e.className}`.slice(0, 80));
  });

test.describe("fichas en un solo panel bajo 1024 px", () => {
  test.beforeEach(({ browserName: _navegador }, info) => {
    test.skip(info.project.name !== "ipad", "Recorre los anchos con el proyecto iPad.");
    if (!password && process.env["CI"])
      throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD en CI.");
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  });

  for (const m of MODULOS) {
    test(`${m.ruta}: a 768 la ficha ocupa todo el ancho y «Volver» conserva la búsqueda; a 1024 sigue dividida`, async ({
      page,
    }) => {
      await entrar(page);
      await page.setViewportSize({ width: 768, height: 1000 });
      await page.goto(m.ruta);
      // Ruta de la lista: solo la lista, a todo el ancho.
      const primera = page.locator(`a[href^="${m.ruta}/"][href*="-"]`).first();
      await expect(primera).toBeVisible();
      expect(await ancho(page, m.lista)).toBeGreaterThanOrEqual(600);
      await expect(
        page.getByRole("region", { name: "Detalle" }).filter({ visible: true }),
      ).toHaveCount(0);
      // Búsqueda que se conserva: la inicial del primer elemento (siempre da al menos una coincidencia).
      const lineas = (await primera.innerText()).split("\n").map((l) => l.trim());
      const nombre = lineas.find((l) => l.length > 3 && /^\p{L}/u.test(l)) ?? "a";
      const q = nombre.split(/\s+/)[0]?.slice(0, 3) ?? "a";
      await page.goto(`${m.ruta}?q=${encodeURIComponent(q)}`);
      const fila = page.locator(`a[href^="${m.ruta}/"][href*="-"]`).first();
      await expect(fila).toBeVisible();
      await fila.click();
      await page.waitForURL((u) => /^\/[a-z]+\/[0-9a-f-]{36}/.test(u.pathname));
      expect(new URL(page.url()).searchParams.get("q")).toBe(q);

      // Ficha: solo el detalle, a todo el ancho; sin desborde horizontal; barra sin pisarse.
      const detalle = page.getByRole("region", { name: "Detalle" }).filter({ visible: true });
      await expect(detalle).toBeVisible();
      expect(await ancho(page, "Detalle")).toBeGreaterThanOrEqual(480);
      await expect(
        page.getByRole("region", { name: m.lista }).filter({ visible: true }),
      ).toHaveCount(0);
      expect(await sinDesborde(page)).toBe(true);
      expect(await fueraDeVentana(page)).toEqual([]);
      expect(await solapes(page)).toEqual([]);

      // «Volver a la lista» devuelve la lista con la misma búsqueda.
      await page
        .getByRole("link", { name: /^Volver a / })
        .filter({ visible: true })
        .click();
      await page.waitForURL((u) => u.pathname === m.ruta);
      expect(new URL(page.url()).searchParams.get("q")).toBe(q);
      expect(await ancho(page, m.lista)).toBeGreaterThanOrEqual(600);

      // A 1024 nada cambia: lista de 360 px y detalle a la vista, sin «Volver» en la barra.
      await page.setViewportSize({ width: 1024, height: 768 });
      await fila.click();
      await page.waitForURL((u) => /^\/[a-z]+\/[0-9a-f-]{36}/.test(u.pathname));
      expect(await ancho(page, m.lista)).toBe(360);
      await expect(
        page.getByRole("region", { name: "Detalle" }).filter({ visible: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /^Volver a / }).filter({ visible: true }),
      ).toHaveCount(0);
    });
  }

  test("todas las pestañas de las fichas y Vencimientos a 768 sin cortes ni solapes", async ({
    page,
  }) => {
    await entrar(page);
    await page.setViewportSize({ width: 768, height: 1000 });
    const rutas = ["/personas/vencimientos"];
    const pestanas = {
      "/personas": ["", "/laboral", "/sueldo", "/documentos", "/actividad"],
      "/cuentas": ["", "/instalaciones", "/contactos", "/documentos", "/actividad"],
      "/instalaciones": ["", "/puestos", "/documentos", "/actividad"],
    } as const;
    for (const [lista, sufijos] of Object.entries(pestanas)) {
      await page.goto(lista);
      const href = await page
        .locator(`a[href^="${lista}/"][href*="-"]`)
        .first()
        .getAttribute("href");
      for (const sufijo of sufijos) rutas.push(`${href}${sufijo}`);
    }
    for (const ruta of rutas) {
      await page.goto(ruta);
      await expect(page.locator("header h1:visible")).toHaveCount(1, { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      // El título conserva su sitio (no lo aplasta la acción principal) y nada se pisa ni se corta.
      const titulo = await page.locator("header h1:visible").boundingBox();
      expect(titulo?.width, ruta).toBeGreaterThan(40);
      expect(await sinDesborde(page), ruta).toBe(true);
      expect(await fueraDeVentana(page), ruta).toEqual([]);
      expect(await solapes(page), ruta).toEqual([]);
    }
  });
});
