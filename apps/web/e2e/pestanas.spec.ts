import { expect, test } from "@playwright/test";

// El bug (QA 24-oct) pasaba en el celular: la barra de pestañas de las fichas se movía en vertical.
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

const BARRAS = [
  { caso: "por ruta", bloque: "pestanas-ruta", rol: "navigation" as const },
  { caso: "con estado", bloque: "pestanas-estado", rol: "tablist" as const },
];

test.describe("Pestañas · solo se desplazan en horizontal", () => {
  for (const { caso, bloque, rol } of BARRAS) {
    test(`barra ${caso}: sin scroll vertical y con scroll horizontal`, async ({ page }) => {
      await page.goto("/ds/qa");
      const barra = page.getByTestId(bloque).getByRole(rol);
      await barra.scrollIntoViewIfNeeded();
      const m = await barra.evaluate((el) => {
        const antes = {
          ancho: el.scrollWidth,
          visible: el.clientWidth,
          alto: el.clientHeight,
          scroll: el.scrollHeight,
          overflowY: getComputedStyle(el).overflowY,
        };
        el.scrollLeft = 120;
        return { ...antes, despues: el.scrollLeft };
      });
      expect(m.scroll, "scrollHeight igual a clientHeight").toBe(m.alto);
      expect(m.overflowY).toBe("hidden");
      expect(m.ancho, "las pestañas no caben: hay scroll horizontal").toBeGreaterThan(m.visible);
      expect(m.despues, "el scroll horizontal sigue funcionando").toBeGreaterThan(0);
    });
  }

  test("degradado en el borde con más pestañas y pestaña activa visible", async ({ page }) => {
    await page.goto("/ds/qa");
    const barra = page.getByTestId("pestanas-ruta").getByRole("navigation");
    await barra.scrollIntoViewIfNeeded();
    await expect(barra).toHaveAttribute("data-der", "true");
    await expect(barra).toHaveAttribute("data-izq", "false");
    await barra.evaluate((el) => (el.scrollLeft = el.scrollWidth));
    await expect(barra).toHaveAttribute("data-izq", "true");
    await expect(barra).toHaveAttribute("data-der", "false");

    const lejos = page.getByTestId("pestanas-activa-lejos").getByRole("navigation");
    await lejos.scrollIntoViewIfNeeded();
    const activa = lejos.locator('[aria-current="page"]');
    await expect
      .poll(async () => {
        const [b, a] = await Promise.all([lejos.boundingBox(), activa.boundingBox()]);
        return b && a ? a.x >= b.x && a.x + a.width <= b.x + b.width : false;
      })
      .toBe(true);
    const y0 = await page.evaluate(() => scrollY);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => scrollY), "la página no se mueve en vertical").toBe(y0);
  });
});
