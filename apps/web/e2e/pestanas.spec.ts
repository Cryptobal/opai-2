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

  test("degradado en el borde con más pestañas", async ({ page }) => {
    await page.goto("/ds/qa");
    const barra = page.getByTestId("pestanas-ruta").getByRole("navigation");
    await barra.scrollIntoViewIfNeeded();
    await expect(barra).toHaveAttribute("data-der", "true");
    await expect(barra).toHaveAttribute("data-izq", "false");
    await barra.evaluate((el) => (el.scrollLeft = el.scrollWidth));
    await expect(barra).toHaveAttribute("data-izq", "true");
    await expect(barra).toHaveAttribute("data-der", "false");
  });

  const LEJOS = [
    {
      caso: "por ruta",
      bloque: "pestanas-activa-lejos",
      rol: "navigation" as const,
      activa: '[aria-current="page"]',
    },
    {
      caso: "con estado",
      bloque: "pestanas-estado-lejos",
      rol: "tablist" as const,
      activa: '[aria-selected="true"]',
    },
  ];
  for (const { caso, bloque, rol, activa } of LEJOS) {
    test(`barra ${caso}: la pestaña activa lejana queda visible y la página no salta`, async ({
      page,
    }) => {
      await page.goto("/ds/qa");
      const barra = page.getByTestId(bloque).getByRole(rol);
      await barra.scrollIntoViewIfNeeded();
      const y0 = await page.evaluate(() => scrollY); // antes de que el efecto ajuste la barra
      await expect(barra).toHaveAttribute("data-izq", "true"); // el efecto ya corrió
      const [b, a] = await Promise.all([barra.boundingBox(), barra.locator(activa).boundingBox()]);
      expect(b && a, "hay barra y pestaña activa").toBeTruthy();
      if (!b || !a) return;
      expect(a.x, "dentro de la barra, por la izquierda").toBeGreaterThanOrEqual(b.x);
      expect(a.x + a.width, "dentro de la barra, por la derecha").toBeLessThanOrEqual(
        b.x + b.width,
      );
      if ((await barra.getAttribute("data-der")) === "true")
        expect(a.x + a.width, "fuera de la franja difuminada").toBeLessThanOrEqual(
          b.x + b.width - 24,
        );
      expect(await page.evaluate(() => scrollY), "la página no se mueve en vertical").toBe(y0);
    });
  }
});
