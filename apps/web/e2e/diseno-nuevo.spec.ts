import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { captura, erroresDeConsola } from "./hilo-apoyo";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Diseño nuevo (ADR-109, CAR-335 D2, D2b y D2c) con el usuario de la empresa ficticia `qa-e2e`: pinta la piel
// nueva desde el servidor, Preferencias lo muestra elegido, el menú lateral se oculta y se asoma al
// pasar el mouse, y se vuelve al clásico. Las capturas se comparan con docs/2.0/design/export-diseno-nuevo/.
const marco = (page: Page) => page.locator('div[data-marco="nuevo"]');
const ancho = (page: Page) => page.viewportSize()?.width ?? 0;

/**
 * El diseño se elige por la cookie de este navegador (lo que hace Preferencias tras guardar), así la
 * prueba no cambia la preferencia guardada de qa-e2e: no choca con `hilo.spec.ts`, que corre en
 * paralelo, ni deja a qa-e2e en el diseño nuevo si falla a mitad. El guardado se prueba en unidad.
 */
async function conDiseno(page: Page, valor: string) {
  const url = new URL(page.url()).origin;
  await page.context().addCookies([{ name: "opai_marco", value: valor, url }]);
}

test.describe("@preview diseño nuevo con sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("pinta la piel nueva, el menú se oculta y se asoma, y se vuelve al clásico", async ({
    page,
  }, info) => {
    test.setTimeout(240_000);
    await entrar(page);
    try {
      await conDiseno(page, "nuevo");
      // Sin parpadeo: con la cookie, el servidor ya manda la piel nueva en el HTML del documento.
      const documento = await page.goto("/mi-cuenta/preferencias");
      expect(await documento?.text()).toContain('data-marco="nuevo"');
      await expect(marco(page)).toBeVisible({ timeout: 60_000 });
      const opcion = page.getByRole("radio", { name: /^Nuevo/ });
      await hidratado(opcion);
      await expect(opcion).toBeChecked();
      await expect(page.locator("html")).toHaveAttribute("data-marco", "nuevo");
      expect(await marco(page).evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
        "Geist",
      );
      await captura(page, "nuevo-preferencias", info);

      const errores = erroresDeConsola(page);
      await page.goto("/");
      await expect(marco(page)).toBeVisible();
      // Barra superior (D2b): el buscador único y el tema como ícono, en iPad y escritorio.
      if (ancho(page) >= 768)
        await expect(page.getByRole("button", { name: "Cambiar entre día y noche" })).toBeVisible();
      // Teléfono (D2c): barra inferior Inicio, Menú y Yo; la cuenta y el tema viven en «Yo».
      if (ancho(page) < 768) {
        const barra = page.getByRole("navigation", { name: "Principal" }).filter({ hasText: "Yo" });
        await expect(barra.getByText("Menú", { exact: true })).toBeVisible();
        await expect(barra.getByRole("button", { name: /^Yo/ })).toBeVisible();
        // La barra clásica y el avatar de arriba quedan escondidos: una sola navegación principal.
        await expect(page.getByRole("navigation", { name: "Principal" })).toHaveCount(1);
        await expect(page.getByRole("button", { name: /^Menú de usuario/ })).toBeHidden();
      }
      // Inicio nuevo (D3): cola de trabajo en pestañas.
      const pestanas = page.getByRole("tablist");
      await expect(pestanas.getByRole("tab", { name: "Necesita tu atención" })).toBeVisible();
      await captura(page, "nuevo-inicio", info);
      await pestanas.getByRole("tab", { name: "Agenda" }).click();
      await expect(pestanas.getByRole("tab", { name: "Agenda" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      // «Personalizar» (qa-e2e es administrador): se abre y se cierra sin cambiar la elección, porque
      // la elección es de la empresa y otras pruebas leen sus indicadores. El guardado se prueba en
      // unidad (inicio-indicadores-orden.test.ts).
      const personalizar = page.getByRole("button", { name: "Personalizar" });
      await hidratado(personalizar);
      await personalizar.click();
      await expect(page.getByRole("button", { name: "Cobertura hoy" })).toBeVisible();
      await captura(page, "nuevo-inicio-personalizar", info);
      await page.getByRole("button", { name: "Listo" }).click();

      if (ancho(page) >= 1024) {
        const ocultar = page.getByRole("button", { name: "Ocultar el menú" });
        await hidratado(ocultar);
        await ocultar.click();
        const fijar = page.getByRole("button", { name: "Dejar el menú fijo" });
        await expect(fijar).toBeVisible();
        await captura(page, "nuevo-menu-oculto", info);
        // Plegado (CAR-377): el riel muestra las áreas, no cada submódulo.
        const riel = page.locator("nav[data-riel-nuevo]");
        await expect(riel.getByRole("button", { name: "Comercial" })).toBeVisible();
        await expect(riel.getByRole("link", { name: "Negocios" })).toHaveCount(0);
        // Al recargar, el servidor ya manda el menú plegado: sin parpadeo del menú abierto (D2b).
        const recarga = await page.goto("/");
        expect(await recarga?.text()).toContain('data-menu="plegado"');
        await hidratado(fijar);
        // Al pasar el mouse por el riel, el menú completo se asoma sobre la página.
        await fijar.hover();
        await expect(page.getByText("OPAI", { exact: true })).toBeVisible();
        await captura(page, "nuevo-menu-asomado", info);
        await page.mouse.move(ancho(page) - 10, 400);
        await expect(page.getByText("OPAI", { exact: true })).toBeHidden();
        // Con el mouse sobre el riel se asoma el menú y su botón lo deja fijo.
        await fijar.hover();
        await page.getByRole("button", { name: "Dejar el menú fijo" }).click();
        await expect(page.getByRole("button", { name: "Ocultar el menú" })).toBeVisible();
      }
      expect(errores).toEqual([]);
    } finally {
      const url = new URL(page.url()).origin;
      await page.context().addCookies([{ name: "opai_menu", value: "", url }]);
    }
  });
});
