import { expect, type Locator, type Page, test } from "@playwright/test";

// Celular apaisado (CAR-6): el detalle de Instalaciones usa el ancho de la pantalla, no el de «tablet».
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
}

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
    ] as const) {
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
      for (const etiqueta of ["Dirección", "Región", "Geocerca", "Vigencia"]) {
        const par = tarjeta.getByText(etiqueta, { exact: true }).first().locator("xpath=..");
        const caja = await par.boundingBox();
        expect(caja?.width, `${etiqueta} a ${ancho}×${alto}`).toBeGreaterThanOrEqual(200);
      }
      // Apiladas: el mapa queda arriba del texto, en la misma columna.
      await expectApiladas(
        tarjeta.locator("div.\\@container > div").first(),
        `Ubicación ${ancho}×${alto}`,
      );
      if (ancho === 844)
        await page.screenshot({ path: info.outputPath("instalacion-844x390.png") });

      // Laboral de Personas: sus dos columnas también quedan una sobre otra.
      await page.goto("/personas");
      const persona = await page
        .locator('a[href^="/personas/"][href*="-"]')
        .first()
        .getAttribute("href");
      await page.goto(`${persona}/laboral`);
      const rejilla = page.locator("div.\\@container > div").first();
      await expect(rejilla).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      await expectApiladas(rejilla, `Laboral ${ancho}×${alto}`);
      expect(await sinDesborde(page), `Laboral ${ancho}×${alto}`).toBe(true);
    }
  });
});
