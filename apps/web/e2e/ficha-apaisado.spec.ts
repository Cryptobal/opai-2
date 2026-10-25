import { expect, type Page, test } from "@playwright/test";

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

test.describe("fichas con el celular en horizontal", () => {
  test.beforeEach(({ browserName: _navegador }, info) => {
    test.skip(info.project.name !== "ipad", "Recorre los anchos con el proyecto iPad.");
    if (!password && process.env["CI"])
      throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD en CI.");
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  });

  test("celular apaisado (844×390 y 932×430): Instalaciones no desborda y «Ubicación y vigencia» deja el texto legible", async ({
    page,
  }) => {
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
      if (ancho === 844)
        await page.screenshot({ path: "e2e/__screenshots__/instalacion-844x390.png" });
    }
  });
});
