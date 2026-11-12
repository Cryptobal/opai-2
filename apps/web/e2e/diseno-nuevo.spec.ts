import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { captura, erroresDeConsola } from "./hilo-apoyo";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Diseño nuevo (ADR-109, CAR-335 D2) con el usuario de la empresa ficticia `qa-e2e`: pinta la piel
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
      await captura(page, "nuevo-inicio", info);

      if (ancho(page) >= 1024) {
        const ocultar = page.getByRole("button", { name: "Ocultar el menú" });
        await hidratado(ocultar);
        await ocultar.click();
        const fijar = page.getByRole("button", { name: "Dejar el menú fijo" });
        await expect(fijar).toBeVisible();
        await captura(page, "nuevo-menu-oculto", info);
        // Al pasar el mouse por el riel, el menú completo se asoma sobre la página.
        await fijar.hover();
        await expect(page.getByText("OPAI", { exact: true })).toBeVisible();
        await captura(page, "nuevo-menu-asomado", info);
        await page.mouse.move(ancho(page) - 10, 400);
        await expect(page.getByText("OPAI", { exact: true })).toBeHidden();
        await fijar.click();
        await expect(page.getByRole("button", { name: "Ocultar el menú" })).toBeVisible();
      }
      expect(errores).toEqual([]);
    } finally {
      await conDiseno(page, "");
    }
    const clasico = await page.goto("/");
    expect(await clasico?.text()).not.toContain('data-marco="nuevo"');
  });
});
