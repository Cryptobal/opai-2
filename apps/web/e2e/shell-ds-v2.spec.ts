import { expect, type Page, test } from "@playwright/test";

// DS V2 (Claude Design 44e4d7b9): shell de ShellPhone/Tablet/Desktop.html y contraste del botón
// destructive con el tema forzado. Corre sobre /ds (datos ficticios, sin sesión).
const principal = (page: Page) => page.getByRole("navigation", { name: "Principal" });

test("teléfono: Buscar vive en la barra superior y no en la inferior", async ({ page }, info) => {
  test.skip(info.project.name !== "telefono", "Solo a 375 px.");
  await page.goto("/ds");
  await expect(
    page.locator("header").getByRole("button", { name: "Buscar", exact: true }),
  ).toBeVisible();
  await expect(principal(page).getByRole("button", { name: "Buscar" })).toHaveCount(0);
  const alto = await page
    .locator("header")
    .first()
    .evaluate((e) => e.getBoundingClientRect().height);
  expect(Math.round(alto)).toBe(52);
});

test("iPad: el riel abre con el bloque de portal, sin wordmark, y la búsqueda trae texto", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "ipad", "Solo a 1024 px.");
  await page.goto("/ds");
  const riel = principal(page).first();
  await expect(riel.getByText("OPAI", { exact: true })).toHaveCount(0);
  await expect(riel.getByRole("button", { name: /Cambiar de portal/ })).toBeVisible();
  const buscar = page.locator("header").getByRole("button", { name: /^Buscar/ });
  await expect(buscar).toContainText("Buscar personas, clientes, folios");
});

test("escritorio: usuario al pie de la barra lateral y portal en bloque", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Solo a 1280 px.");
  await page.goto("/ds");
  const lateral = principal(page).first();
  await expect(lateral.getByText("OPAI", { exact: true })).toBeVisible();
  await expect(lateral.getByRole("button", { name: /Cambiar de portal/ })).toBeVisible();
  await expect(lateral.getByRole("button", { name: "Menú de usuario" })).toBeVisible();
  await expect(
    page.locator("header").getByRole("button", { name: "Menú de usuario" }),
  ).toBeHidden();
});

test("oscuro forzado con el sistema en claro: destructive cumple 4,5:1", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/ds");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  const boton = page.getByRole("button", { name: "Eliminar" });
  await boton.scrollIntoViewIfNeeded();
  const razon = await boton.evaluate((el) => {
    const canal = (css: string) => {
      const m = css
        .match(/\d+(\.\d+)?/g)
        ?.slice(0, 3)
        .map(Number) ?? [0, 0, 0];
      return m.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
    };
    const lum = (css: string) => {
      const [r = 0, g = 0, b = 0] = canal(css);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const estilo = getComputedStyle(el);
    const [a, b] = [lum(estilo.backgroundColor), lum(estilo.color)].sort((x, y) => y - x);
    return ((a ?? 0) + 0.05) / ((b ?? 0) + 0.05);
  });
  expect(razon).toBeGreaterThanOrEqual(4.5);
});
