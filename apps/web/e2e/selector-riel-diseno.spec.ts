import { expect, type Page, test } from "@playwright/test";

import { entrar as iniciarSesion } from "./sesion";

// Selector del riel de iPad según ShellTablet.html (seguimiento del PR #30, CAR-6): ⇅ junto al
// portal, radio de 12 px, el nombre del portal una sola vez y sin recortes, y cierre con clic
// fuera. Mismos datos que selector-riel.spec.ts (seed:multiempresa-e2e).
const email = process.env["E2E_SELECTOR_EMAIL"] ?? "e2e-selector@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const SELECTOR = /Cambiar de portal o empresa/;

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

async function entrar(page: Page) {
  await iniciarSesion(page, email);
  await page.waitForURL(/\/elegir-empresa/);
  await page.getByRole("button", { name: /Gard Security/ }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

const principal = (page: Page) => page.getByRole("navigation", { name: "Principal" });

test.describe("selector del riel de iPad según el diseño", () => {
  test.beforeEach(({ browserName: _navegador }, info) => {
    test.skip(info.project.name !== "ipad", "El riel es solo de iPad.");
    if (password) return;
    if (process.env["CI"]) throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD en CI.");
    test.skip(true, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  });

  test("⇅ junto al portal, radio 12, nombre una vez y sin recortes a 768, 1024 y 1279 (ERP y Supervisor)", async ({
    page,
  }, info) => {
    await entrar(page);
    const riel = principal(page);
    for (const portal of ["ERP", "Supervisor"] as const) {
      if (portal === "Supervisor") {
        await riel.getByRole("button", { name: SELECTOR }).click();
        await page.getByRole("menuitem", { name: /^Supervisor/ }).click();
        await page.waitForURL((url) => url.pathname === "/supervisor");
      }
      for (const ancho of [768, 1024, 1279]) {
        await page.setViewportSize({ width: ancho, height: 900 });
        const selector = riel.getByRole("button", { name: SELECTOR });
        await expect(selector).toHaveAccessibleName(new RegExp(`portal ${portal}\\.`));
        // Nombre completo en el tooltip nativo.
        await expect(selector).toHaveAttribute("title", new RegExp(`· ${portal}$`));
        // ⇅ (chevrons-up-down) dentro del botón; la flecha de la esquina ya no existe.
        await expect(selector.locator("svg.lucide-chevrons-up-down")).toHaveCount(1);
        await expect(selector.locator("svg.lucide-chevron-down")).toHaveCount(0);
        await expect(selector).toHaveCSS("border-radius", "12px");
        // La etiqueta no se corta: lo que se ve es lo que hay (sin puntos suspensivos por desborde).
        const etiqueta = selector.locator("span.truncate");
        const medidas = await etiqueta.evaluate((e) => [e.scrollWidth, e.clientWidth]);
        expect(medidas[0], `${portal} a ${ancho}px recortado`).toBeLessThanOrEqual(medidas[1] ?? 0);
        // El nombre del portal aparece una sola vez en el riel (ni bajo «OPAI» ni en otro lado).
        const texto = await riel.innerText();
        const abreviatura = portal === "ERP" ? "ERP" : "Superv.";
        expect(texto.split(abreviatura).length - 1, `«${abreviatura}» a ${ancho}px`).toBe(1);
        expect(texto).not.toContain("Supervisor");
        if (ancho === 1024) {
          await page.screenshot({
            path: info.outputPath(`riel-selector-${portal.toLowerCase()}-ipad.png`),
          });
        }
      }
    }
    // «Instalac.» (Supervisor) cabe y su nombre completo está en title.
    const instalaciones = riel.getByRole("link", { name: /Instalac/ });
    await expect(instalaciones).toHaveAttribute("title", "Instalaciones");
    const m = await instalaciones
      .locator("span.truncate")
      .evaluate((e) => [e.scrollWidth, e.clientWidth]);
    expect(m[0]).toBeLessThanOrEqual(m[1] ?? 0);
  });

  test("un clic fuera cierra el menú en ese mismo clic; Escape devuelve el foco; opciones de al menos 44 px", async ({
    page,
  }) => {
    await entrar(page);
    const selector = principal(page).getByRole("button", { name: SELECTOR });
    const menu = page.getByRole("menu");
    await selector.click();
    await expect(menu).toBeVisible();
    await expect(menu).toHaveCSS("opacity", "1"); // animación de entrada terminada
    // Se abre a la derecha del riel, sin recortarse, y las opciones son táctiles.
    const caja = await menu.boundingBox();
    const botonCaja = await selector.boundingBox();
    expect(caja?.x ?? 0).toBeGreaterThanOrEqual((botonCaja?.x ?? 0) + (botonCaja?.width ?? 0));
    expect((caja?.x ?? 0) + (caja?.width ?? 0)).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
    for (const opcion of await menu.getByRole("menuitem").all()) {
      expect((await opcion.boundingBox())?.height).toBeGreaterThanOrEqual(43.9);
    }
    // Clic fuera (sobre el contenido): el menú desaparece de inmediato, sin segundo clic.
    await page.mouse.click(600, 500);
    await expect(menu).toBeHidden({ timeout: 1000 });
    await expect(selector).toHaveAttribute("aria-expanded", "false");
    // Y Escape devuelve el foco al botón.
    await selector.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(selector).toBeFocused();
  });
});
