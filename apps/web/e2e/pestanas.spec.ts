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
});
