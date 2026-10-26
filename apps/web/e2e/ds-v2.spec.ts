import { expect, type Page, test } from "@playwright/test";

// Paridad con el DS V2 de Claude Design (ADR-050) en /ds, sin sesión: oscuro forzado con el sistema en
// claro, botón con carga, estado de error y bordes de controles; y el shell a 375, 1024 y 1280.

/** Contraste WCAG entre dos colores `rgb(r, g, b)` calculados por el navegador. */
function contraste(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((n) => {
      const s = Number(n) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (bl ?? 0);
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((l1 ?? 0) + 0.05) / ((l2 ?? 0) + 0.05);
}

const colores = (page: Page, nombre: string) =>
  page
    .locator('[data-muestra="botones-v2"]')
    .getByRole("button", { name: nombre })
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return { fondo: s.backgroundColor, texto: s.color };
    });

test.describe("DS V2 (ADR-050)", () => {
  test("con oscuro forzado y el sistema en claro, el destructivo cumple 4,5:1", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/ds");
    // Tras hidratar: el tema se fuerza en <html> como lo hace Preferencias.
    await page.waitForLoadState("networkidle");
    const claro = await colores(page, "Eliminar");
    expect(contraste(claro.fondo, claro.texto)).toBeGreaterThanOrEqual(4.5);
    await page.evaluate(() => {
      document.documentElement.dataset["theme"] = "dark";
    });
    // El botón anima el color 150 ms: se mide cuando terminó la transición.
    await expect
      .poll(async () => {
        const c = await colores(page, "Eliminar");
        return c.fondo !== claro.fondo ? contraste(c.fondo, c.texto) : 0;
      })
      .toBeGreaterThanOrEqual(4.5);
  });

  test("el botón con carga queda ocupado, deshabilitado y con el mismo ancho", async ({ page }) => {
    await page.goto("/ds");
    const boton = page.locator('[data-muestra="botones-v2"]').getByRole("button").first();
    const antes = await boton.boundingBox();
    // En dev el primer clic puede llegar antes de hidratar: se reintenta hasta que React lo atienda.
    await expect(async () => {
      await boton.click();
      await expect(boton).toHaveAttribute("aria-busy", "true", { timeout: 1_000 });
    }).toPass();
    await expect(boton).toBeDisabled();
    const despues = await boton.boundingBox();
    expect(Math.round(despues?.width ?? 0)).toBe(Math.round(antes?.width ?? -1));
  });

  test("el estado de error se anuncia con role=alert", async ({ page }) => {
    await page.goto("/ds");
    await expect(
      page.getByRole("alert").filter({ hasText: "No pudimos cargar las cuentas" }),
    ).toBeVisible();
  });

  test("el borde de los inputs llega a 3:1 sobre la superficie", async ({ page }) => {
    await page.goto("/ds");
    const medidas = await page.locator("#v2-normal").evaluate((el) => {
      const s = getComputedStyle(el);
      return { borde: s.borderTopColor, fondo: s.backgroundColor };
    });
    expect(contraste(medidas.borde, medidas.fondo)).toBeGreaterThanOrEqual(3);
  });

  test("el shell sigue el export: Buscar arriba en el teléfono y el usuario al pie en 1280", async ({
    page,
  }, info) => {
    await page.goto("/ds");
    const ancho = page.viewportSize()?.width ?? 0;
    if (ancho < 768) {
      await expect(page.locator("header").getByRole("button", { name: "Buscar" })).toBeVisible();
      const inferior = page.locator("nav").filter({ visible: true }).last();
      await expect(inferior.getByRole("button", { name: "Buscar" })).toHaveCount(0);
    } else {
      await expect(
        page.locator("header").getByRole("button", { name: "Buscar o ir a" }),
      ).toBeVisible();
      const lateral = page.getByRole("navigation", { name: "Principal" }).filter({ visible: true });
      // El riel (768–1279) ya no lleva la marca; la barra lateral (1280+) sí, con el usuario al pie.
      await expect(lateral.getByText("OPAI", { exact: true })).toHaveCount(ancho >= 1280 ? 1 : 0);
      if (ancho >= 1280)
        await expect(lateral.getByRole("button", { name: "Menú de usuario" })).toBeVisible();
    }
    await page.screenshot({ path: info.outputPath(`shell-v2-${info.project.name}.png`) });
  });
});
