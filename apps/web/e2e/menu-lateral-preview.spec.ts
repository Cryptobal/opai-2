import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { captura, erroresDeConsola } from "./hilo-apoyo";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Menú lateral del diseño nuevo (CAR-442, referente Linear) con el usuario de la empresa ficticia
// `qa-e2e`: en escritorio el borde del menú se arrastra para cambiar su ancho, se recuerda al recargar
// y, soltado muy a la izquierda, el menú se pliega al riel. El menú de la cuenta lleva a Configuración.
const anchoVentana = (page: Page) => page.viewportSize()?.width ?? 0;
const menu = (page: Page) => page.locator('nav[data-shell="sidebar"]').filter({ visible: true });

async function anchoMenu(page: Page): Promise<number> {
  const caja = await menu(page).boundingBox();
  return Math.round(caja?.width ?? 0);
}

test.describe("@preview menú lateral: ancho y cuenta", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("el borde cambia el ancho, se recuerda y pliega el menú", async ({ page }, info) => {
    test.skip(anchoVentana(page) < 1024, "El borde para arrastrar solo existe en escritorio.");
    test.setTimeout(180_000);
    const errores = erroresDeConsola(page);
    await entrar(page);
    const origen = new URL(page.url()).origin;
    try {
      await page.goto("/");
      const asa = page.getByRole("separator", { name: "Cambiar el ancho del menú" });
      await hidratado(asa);
      const caja = await asa.boundingBox();
      if (!caja) throw new Error("sin borde del menú");
      const y = caja.y + caja.height / 2;
      // Arrastrar a 320 px: el menú toma ese ancho.
      await page.mouse.move(caja.x + caja.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(300, y, { steps: 6 });
      await page.mouse.move(320, y, { steps: 4 });
      await page.mouse.up();
      await expect.poll(() => anchoMenu(page)).toBe(320);
      await captura(page, "menu-lateral-ancho", info);
      // Al recargar, el servidor ya manda el ancho guardado.
      const recarga = await page.goto("/");
      expect(await recarga?.text()).toContain("--ancho-menu:320px");
      // Soltado muy a la izquierda, el menú se pliega al riel.
      await hidratado(asa);
      const otra = await asa.boundingBox();
      if (!otra) throw new Error("sin borde del menú");
      await page.mouse.move(otra.x + otra.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(60, y, { steps: 8 });
      await page.mouse.up();
      await expect(page.getByRole("button", { name: "Dejar el menú fijo" })).toBeVisible();
      await captura(page, "menu-lateral-plegado", info);
      expect(errores).toEqual([]);
    } finally {
      await page.context().addCookies([
        { name: "opai_menu", value: "", url: origen },
        { name: "opai_menu_ancho", value: "", url: origen },
      ]);
    }
  });

  test("el menú de la cuenta lleva a Configuración, Novedades y Cerrar sesión", async ({
    page,
  }, info) => {
    test.skip(anchoVentana(page) < 1024, "En el teléfono la cuenta vive en «Yo».");
    await entrar(page);
    await page.goto("/");
    const cuenta = page.getByRole("button", { name: /^Menú de usuario/ }).filter({ visible: true });
    await hidratado(cuenta.first());
    await cuenta.first().click();
    for (const opcion of ["Configuración", "Novedades", "Cerrar sesión"])
      await expect(page.getByRole("menuitem", { name: new RegExp(`^${opcion}`) })).toBeVisible();
    await captura(page, "menu-lateral-cuenta", info);
    await page.getByRole("menuitem", { name: /^Configuración/ }).click();
    await page.waitForURL(/\/configuracion/);
  });
});
