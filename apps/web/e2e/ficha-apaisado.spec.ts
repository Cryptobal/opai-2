import { expect, type Locator, type Page, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Celular apaisado (CAR-6): las fichas usan el ancho de la pantalla, no el de «tablet», y las tarjetas
// de dos columnas se apilan solo ahí (844×390 y 932×430): en «Ubicación y vigencia» (Instalaciones) el
// texto queda bajo el mapa y en Laboral (Personas) la segunda columna queda bajo la primera, con el texto
// de 200 px o más. Desde 1024 px de ancho (y a 768 de alto normal) quedan lado a lado, igual que en main.

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const sinDesborde = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** Las dos columnas de una rejilla quedan una sobre otra: misma x, la segunda empieza bajo la primera. */
async function expectApiladas(rejilla: Locator, donde: string) {
  const primera = await rejilla.locator("> *").nth(0).boundingBox();
  const segunda = await rejilla.locator("> *").nth(1).boundingBox();
  expect(primera && segunda, `${donde}: hay dos columnas`).toBeTruthy();
  expect(Math.abs((primera?.x ?? 0) - (segunda?.x ?? 99)), `${donde}: misma x`).toBeLessThan(2);
  expect(segunda?.y ?? 0, `${donde}: la segunda va debajo`).toBeGreaterThanOrEqual(
    (primera?.y ?? 0) + (primera?.height ?? 0) - 1,
  );
}

/** Las dos columnas van lado a lado (como en main): x distinta y se solapan en vertical. */
async function expectLadoALado(rejilla: Locator, donde: string) {
  const primera = await rejilla.locator("> *").nth(0).boundingBox();
  const segunda = await rejilla.locator("> *").nth(1).boundingBox();
  expect(primera && segunda, `${donde}: hay dos columnas`).toBeTruthy();
  expect(Math.abs((primera?.x ?? 0) - (segunda?.x ?? 0)), `${donde}: x distintas`).toBeGreaterThan(
    100,
  );
  expect(segunda?.y ?? 99999, `${donde}: misma fila`).toBeLessThan(
    (primera?.y ?? 0) + (primera?.height ?? 0),
  );
}

test.describe("fichas con el celular en horizontal", () => {
  test.beforeEach(({ browserName: _navegador }, info) => {
    test.skip(info.project.name !== "ipad", "Recorre los anchos con el proyecto iPad.");
    if (!password && process.env["CI"])
      throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD en CI.");
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  });

  test("celular apaisado (844×390 y 932×430): Instalaciones no desborda y «Ubicación y vigencia» deja el texto legible", async ({
    page,
  }, info) => {
    await entrar(page);
    for (const [ancho, alto] of [
      [844, 390],
      [932, 430],
      [1024, 768],
      [1280, 800],
      [1440, 900],
    ] as const) {
      // Apiladas en celular apaisado y entre 1024 y 1279 px, donde la barra lateral completa (D9) y la
      // lista dejan el panel angosto; lado a lado desde 1280.
      const apilada = alto <= 500 || (ancho >= 1024 && ancho < 1280);
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto("/instalaciones");
      const href = await page
        .locator('a[href^="/instalaciones/"][href*="-"]')
        .first()
        .getAttribute("href");
      await page.goto(href ?? "/instalaciones");
      const tarjeta = page.locator("section", { hasText: "Ubicación y vigencia" }).last();
      await expect(tarjeta).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      expect(await sinDesborde(page), `${ancho}×${alto}`).toBe(true);
      // Cada par (Dirección, Región, Geocerca, Vigencia) mide 200 px o más: ya no se parte por letras.
      for (const etiqueta of apilada ? ["Dirección", "Región", "Geocerca", "Vigencia"] : []) {
        const par = tarjeta.getByText(etiqueta, { exact: true }).first().locator("xpath=..");
        const caja = await par.boundingBox();
        expect(caja?.width, `${etiqueta} a ${ancho}×${alto}`).toBeGreaterThanOrEqual(200);
      }
      // Apiladas: mapa sobre el texto; en el resto, lado a lado.
      const ubicacion = tarjeta.locator("div.grid.gap-4").first();
      if (apilada) await expectApiladas(ubicacion, `Ubicación ${ancho}×${alto}`);
      else await expectLadoALado(ubicacion, `Ubicación ${ancho}×${alto}`);
      if (ancho === 844)
        await page.screenshot({ path: info.outputPath("instalacion-844x390.png") });

      // Laboral de Personas: sus dos columnas también quedan una sobre otra.
      await page.goto("/personas");
      const persona = await page
        .locator('a[href^="/personas/"][href*="-"]')
        .first()
        .getAttribute("href");
      await page.goto(`${persona}/laboral`);
      // Desde el #89 la columna derecha es el historial de vínculos (antes, sueldo y puesto).
      const rejilla = page
        .locator("div.grid.gap-4:has(> div.flex.flex-col.gap-4)")
        .filter({ hasText: "Historial de vínculos" })
        .first();
      await expect(rejilla).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      if (apilada) await expectApiladas(rejilla, `Laboral ${ancho}×${alto}`);
      else await expectLadoALado(rejilla, `Laboral ${ancho}×${alto}`);
      expect(await sinDesborde(page), `Laboral ${ancho}×${alto}`).toBe(true);
      // El texto de las dos columnas (pares del vínculo y del puesto) mide 200 px o más.
      for (const [n, columna] of (apilada ? ["izquierda", "derecha"] : []).entries()) {
        const caja = await rejilla.locator("> *").nth(n).boundingBox();
        expect(caja?.width ?? 0, `Laboral ${columna} ${ancho}×${alto}`).toBeGreaterThanOrEqual(200);
      }
    }
  });
});
