import { expect, type Page, test } from "@playwright/test";

import { digitoVerificador } from "@opai/domain";

// Caché del navegador (staleTimes de 5 min, ADR-045): lo escrito desde la pantalla se ve al volver a
// una lista ya visitada, y cambiar de sesión o de empresa no deja pestañas con datos de la anterior.
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => ["/", "/platform", "/elegir-empresa"].includes(u.pathname));
  // Con más de una empresa el acceso pide elegir; las pruebas parten de Gard.
  if (new URL(page.url()).pathname === "/elegir-empresa") {
    await page.getByText("Gard Security").first().click();
    await page.waitForURL((u) => u.pathname === "/");
  }
}

/** RUT válido y único por corrida (cuerpo de 8 dígitos desde la hora). */
function rutNuevo() {
  const cuerpo = String(20_000_000 + (Date.now() % 9_000_000));
  return `${cuerpo}-${digitoVerificador(cuerpo)}`;
}

const menu = (page: Page, nombre: RegExp) =>
  page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: nombre });

test.describe("caché y sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("una persona creada aparece en la lista ya visitada (sin recarga)", async ({ page }) => {
    const apellido = `Cache ${Date.now()}`;
    await entrar(page);
    await page.goto("/");
    // Todo con navegación del lado del cliente: una recarga completa vaciaría la caché y taparía el fallo.
    await menu(page, /^Personas/).click();
    await page.waitForURL("**/personas");
    await menu(page, /^Cuentas/).click();
    await page.waitForURL("**/cuentas");
    await menu(page, /^Personas/).click(); // Personas queda en la caché del navegador
    await page.waitForURL("**/personas");
    await page.locator('a[href="?nueva=1"]').first().click();
    const dialogo = page.getByRole("dialog", { name: /persona/i });
    await dialogo.getByLabel("Nombres").fill("Prueba");
    await dialogo.getByLabel("Apellidos").fill(apellido);
    await dialogo.getByLabel("RUT").fill(rutNuevo());
    await dialogo.getByLabel("Cargo").click();
    await page.getByRole("option").first().click();
    await dialogo.getByRole("button", { name: "Crear persona" }).click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
    await menu(page, /^Cuentas/).click();
    await page.waitForURL("**/cuentas");
    await menu(page, /^Personas/).click();
    await page.waitForURL("**/personas");
    await expect(
      page.locator('main table a[href^="/personas/"]').filter({ hasText: apellido }).first(),
    ).toBeVisible();
  });

  test("salir en una pestaña recarga la otra", async ({ context, page }) => {
    await entrar(page);
    await page.goto("/personas");
    const otra = await context.newPage();
    await otra.goto("/cuentas");
    await expect(menu(otra, /^Cuentas/)).toBeVisible();

    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await page.getByRole("menuitem", { name: /Cerrar sesión|Salir/i }).click();
    await page.waitForURL(/\/login/);

    await otra.waitForURL(/\/login/, { timeout: 15_000 });
  });

  test("cambiar de empresa no deja datos de la anterior en la caché ni en otra pestaña", async ({
    context,
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((u) => ["/", "/platform", "/elegir-empresa"].includes(u.pathname));
    test.skip(new URL(page.url()).pathname !== "/elegir-empresa", "El usuario tiene una sola empresa");
    await page.getByText("Gard Security").first().click();
    await page.waitForURL((u) => u.pathname === "/");

    await menu(page, /^Personas/).click();
    await page.waitForURL("**/personas");
    const titulo = await page.locator('main table a[href^="/personas/"] [title]').first().getAttribute("title");
    const nombre = (titulo ?? "").split(" ").pop() ?? ""; // el apellido del e2e termina en un número único
    expect(nombre.length).toBeGreaterThan(3);
    const otra = await context.newPage();
    await otra.goto("/personas");
    const fila = (p: Page) => p.locator('main table a[href^="/personas/"]').filter({ hasText: nombre });
    await expect(fila(otra).first()).toBeVisible();

    await page.getByRole("button", { name: /Cambiar de portal o empresa/ }).click();
    await page.getByRole("menuitem", { name: "Empresa E2E" }).click();
    await page.waitForURL((u) => u.pathname === "/");
    await menu(page, /^Cuentas/).click();
    await page.waitForURL("**/cuentas");
    await menu(page, /^Personas/).click(); // visita Personas en la otra empresa: no sale de la caché de Gard
    await page.waitForURL("**/personas");
    await expect(fila(page)).toHaveCount(0);
    // La otra pestaña se recarga sola y tampoco muestra a las personas de la empresa anterior.
    await expect(fila(otra)).toHaveCount(0, { timeout: 15_000 });
  });
});
