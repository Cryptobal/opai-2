import { expect, type Page, test } from "@playwright/test";

// Selector de portal y de empresa en el riel de iPad (768–1279 px), QA del PR #27. Usa un usuario de
// prueba CORRIENTE (sin rol de plataforma, rol «admin») con dos empresas (Gard Security y Atlas
// Seguridad SpA) y los portales ERP y Supervisor. Datos, solo en una base local (tras seed:dev-tenant
// y seed:maestros-demo; el job de e2e del CI lo hace):
//   SEED_OWNER_PASSWORD=<…> pnpm --filter @opai/auth seed:multiempresa-e2e
const email = process.env["E2E_SELECTOR_EMAIL"] ?? "e2e-selector@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const CUENTA_GARD = "Logística Andina SpA"; // sembrada solo en Gard (seed:maestros-demo)
const CUENTA_ATLAS = "Cliente Atlas E2E"; // sembrada solo en Atlas (seed:multiempresa-e2e)
const SELECTOR = /Cambiar de portal o empresa/;

// El servidor de desarrollo compila cada ruta en su primera visita.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/elegir-empresa/);
  await page.getByRole("button", { name: /Gard Security/ }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

const principal = (page: Page) => page.getByRole("navigation", { name: "Principal" });
const titulo = (page: Page) => page.getByRole("heading", { level: 1 }).filter({ visible: true });

test.describe("selector de portal y empresa", () => {
  // En CI la falta de contraseña es un error (no un skip silencioso); en local se omite la suite.
  test.beforeEach(() => {
    if (password) return;
    if (process.env["CI"]) throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD en CI.");
    test.skip(true, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  });

  test("iPad: desde el riel se cambia de portal y de empresa", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "El riel es solo de iPad.");
    await entrar(page);
    const riel = principal(page);
    const selector = riel.getByRole("button", { name: SELECTOR });
    await expect(selector).toBeVisible();
    await expect(selector).toHaveAccessibleName(/^Gard Security · portal ERP\./);
    // Objetivo táctil de al menos 44 px.
    const caja = await selector.boundingBox();
    expect(caja?.width).toBeGreaterThanOrEqual(44);
    expect(caja?.height).toBeGreaterThanOrEqual(44);
    await expect(titulo(page)).toHaveText("Inicio");
    await page.screenshot({
      path: `e2e/__screenshots__/selector-riel-cerrado-${info.project.name}.png`,
    });

    // Abre el menú: portales de la membresía y empresas del usuario.
    await selector.click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    for (const nombre of [/^ERP/, /^Supervisor/, /^Gard Security/, /^Atlas Seguridad/]) {
      await expect(menu.getByRole("menuitem", { name: nombre })).toBeVisible();
    }
    // Usuario corriente: sin portal de Plataforma.
    await expect(menu.getByRole("menuitem", { name: /^Plataforma/ })).toHaveCount(0);
    // La captura se toma con la animación de entrada ya terminada.
    await expect(menu).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: `e2e/__screenshots__/selector-riel-abierto-${info.project.name}.png`,
    });

    // Portal: la vista cambia (otra ruta, otro título, el portal en la marca del riel).
    await menu.getByRole("menuitem", { name: /^Supervisor/ }).click();
    await page.waitForURL((url) => url.pathname === "/supervisor");
    await expect(titulo(page)).toHaveText("Hoy");
    await expect(riel.getByRole("button", { name: SELECTOR })).toHaveAccessibleName(
      /portal Supervisor\./,
    );
    await expect(riel.getByText("Superv.", { exact: true })).toBeVisible();

    // Vuelve al ERP desde el mismo selector.
    await riel.getByRole("button", { name: SELECTOR }).click();
    await page.getByRole("menuitem", { name: /^ERP/ }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(titulo(page)).toHaveText("Inicio");

    // Datos de Gard antes de cambiar: la cuenta de Gard está y se anota su dirección.
    await page.goto("/cuentas");
    const enlaceGard = page.getByRole("link", { name: new RegExp(CUENTA_GARD) }).first();
    await expect(enlaceGard).toBeVisible();
    const rutaGard = await enlaceGard.getAttribute("href");
    expect(rutaGard).toMatch(/^\/cuentas\/[0-9a-f-]{36}/);
    await expect(page.getByText(CUENTA_ATLAS)).toHaveCount(0);

    // Empresa: el selector y el monograma pasan a Atlas.
    await riel.getByRole("button", { name: SELECTOR }).click();
    await page.getByRole("menuitem", { name: /^Atlas Seguridad/ }).click();
    const nuevo = riel.getByRole("button", { name: SELECTOR });
    await expect(nuevo).toHaveAccessibleName(/^Atlas Seguridad SpA · portal ERP\./);
    await expect(nuevo.getByText("AS", { exact: true })).toBeVisible();

    // Aislamiento: la lista ya es la de Atlas (aparece su cuenta, desaparece la de Gard) y la
    // ficha de Gard, por su dirección directa, ya no se abre.
    await page.goto("/cuentas");
    await expect(page.getByRole("link", { name: new RegExp(CUENTA_ATLAS) }).first()).toBeVisible();
    await expect(page.getByText(CUENTA_GARD)).toHaveCount(0);
    await page.goto(rutaGard ?? "/cuentas/sin-ruta");
    await expect(page.getByText("No encontramos lo que buscas")).toBeVisible();
    await expect(page.getByText(CUENTA_GARD)).toHaveCount(0);
  });

  test("iPad: el selector se maneja con el teclado desde el primer uso", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "El riel es solo de iPad.");
    await entrar(page);
    const selector = principal(page).getByRole("button", { name: SELECTOR });
    const menu = page.getByRole("menu");
    // Primer uso de la página: Radix se carga en diferido y el Enter debe abrir el menú igual.
    await selector.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    const items = menu.getByRole("menuitem");
    // El foco entra al menú; las flechas lo llevan por los ítems y de vuelta.
    await expect(menu).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(items.first()).toBeFocused();
    // Escape cierra el menú y el foco vuelve al botón del riel.
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(selector).toBeFocused();
    // Con Espacio se abre otra vez.
    await page.keyboard.press("Space");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(selector).toBeFocused();
  });

  test("iPad: el selector está en el riel entre 768 y 1279 px y en su lugar fuera de ese rango", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "ipad", "Recorre los anchos con el proyecto iPad.");
    await entrar(page);
    const selector = page.getByRole("button", { name: SELECTOR });
    const casos = [
      { ancho: 767, dentro: page.getByRole("banner"), fuera: principal(page) },
      { ancho: 768, dentro: principal(page), fuera: page.getByRole("banner") },
      { ancho: 1279, dentro: principal(page), fuera: page.getByRole("banner") },
      { ancho: 1280, dentro: principal(page), fuera: page.getByRole("banner") },
    ];
    for (const { ancho, dentro, fuera } of casos) {
      await page.setViewportSize({ width: ancho, height: 900 });
      // Un solo selector visible a cada ancho, en el contenedor que corresponde.
      await expect(selector).toHaveCount(1);
      await expect(dentro.getByRole("button", { name: SELECTOR })).toHaveCount(1);
      await expect(fuera.getByRole("button", { name: SELECTOR })).toHaveCount(0);
    }
    // El riel mide 80 px a 768 y a 1279; a 1280 lo reemplaza la barra lateral de 248 px.
    for (const [ancho, esperado] of [
      [768, 80],
      [1279, 80],
      [1280, 248],
    ] as const) {
      await page.setViewportSize({ width: ancho, height: 900 });
      const caja = await principal(page).boundingBox();
      expect(caja?.width).toBe(esperado);
    }
  });

  test("teléfono y desktop: el selector sigue donde estaba", async ({ page }, info) => {
    test.skip(info.project.name === "ipad", "Cubierto por las pruebas de iPad.");
    await entrar(page);
    const selector = page.getByRole("button", { name: SELECTOR });
    await expect(selector).toHaveCount(1);
    if (info.project.name === "telefono") {
      await expect(page.getByRole("banner").getByRole("button", { name: SELECTOR })).toHaveCount(1);
      await expect(principal(page).getByRole("button", { name: SELECTOR })).toHaveCount(0);
    } else {
      await expect(principal(page).getByRole("button", { name: SELECTOR })).toHaveCount(1);
      await expect(page.getByRole("banner").getByRole("button", { name: SELECTOR })).toHaveCount(0);
      const caja = await principal(page).boundingBox();
      expect(caja?.width).toBe(248);
    }
  });
});
