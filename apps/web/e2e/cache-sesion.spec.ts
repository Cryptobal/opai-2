import { expect, type Page, test } from "@playwright/test";

import { digitoVerificador } from "@opai/domain";

// Caché del navegador (staleTimes, ADR-045): lo escrito desde la pantalla se ve al volver a una lista
// ya visitada, y entrar, salir o cambiar de empresa en una pestaña pone al día a las demás.
// No dependen de la tabla de Personas: buscan filas por el enlace a cada persona (tabla o lista).
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const emailMulti = "e2e-multiempresa@opai.cl"; // dueño de Gard y de «Empresa E2E» (seed:e2e)
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

async function entrar(page: Page, correo = email) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  // Con más de una empresa el acceso pide elegir (las pruebas parten de Gard); con una, pasa de largo.
  const gard = page.getByRole("button", { name: /Gard Security/ });
  await Promise.race([
    gard.waitFor({ state: "visible" }),
    page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform"),
  ]).catch(() => undefined);
  if (await gard.isVisible()) await gard.click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform");
}

/** RUT válido y único por corrida (cuerpo de 8 dígitos desde la hora). */
function rutNuevo() {
  const cuerpo = String(20_000_000 + (Date.now() % 9_000_000));
  return `${cuerpo}-${digitoVerificador(cuerpo)}`;
}

const menu = (page: Page, nombre: RegExp) =>
  page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: nombre });

/**
 * Escritorio: selector del riel. En iPad el shell no ofrece cambiar de empresa (ni en el riel ni en
 * el menú de usuario): se usa el selector de empresa del acceso, que ejecuta la misma acción.
 */
async function cambiarDeEmpresa(page: Page, nombre: string) {
  const selector = page.getByRole("button", { name: /Cambiar de portal o empresa/ });
  if (await selector.isVisible()) {
    await selector.click();
    await page.getByRole("menuitem", { name: nombre }).click();
  } else {
    await page.goto("/elegir-empresa?next=/");
    await page.getByRole("button", { name: new RegExp(nombre) }).click();
  }
}

/** Filas de personas (tabla o lista): enlaces a una ficha, no a las pestañas de Personas. */
const filas = (page: Page, texto: string) =>
  page
    .locator('main a[href^="/personas/"]:not([href*="vencimientos"])')
    .filter({ hasText: texto })
    .filter({ visible: true });

test.describe("caché y sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  // El riel lateral (menú) existe desde iPad; la barra inferior del teléfono tiene otro DOM.
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, "Se prueba en iPad y escritorio");

  test("una persona creada aparece en la lista ya visitada (sin recarga)", async ({ page }) => {
    const apellido = `Cache ${Date.now()}`;
    await entrar(page);
    // Reloj fijo: la caché (30 s) no vence ni corre el refresco silencioso (15 s) durante la prueba,
    // así que solo la invalidación al escribir puede mostrar a la persona nueva.
    await page.clock.setFixedTime(new Date());
    await page.goto("/");
    // Todo con navegación del lado del cliente: una recarga completa vaciaría la caché y taparía el fallo.
    await menu(page, /^Personas/).click();
    await page.waitForURL("**/personas");
    await menu(page, /^Cuentas/).click();
    await page.waitForURL("**/cuentas");
    await menu(page, /^Personas/).click(); // Personas queda en la caché del navegador
    await page.waitForURL("**/personas");
    await page.locator('a[href="?nueva=1"]').filter({ visible: true }).first().click();
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
    await expect(filas(page, apellido).first()).toBeVisible();
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

  test("entrar en una pestaña recarga la que esperaba en el login", async ({ context, page }) => {
    const espera = await context.newPage();
    await espera.goto("/login");
    await expect(espera.getByLabel("Correo")).toBeVisible();
    await espera.evaluate(() => Reflect.set(window, "marcaSinRecargar", true));
    await entrar(page);
    // La marca desaparece solo si la pestaña se recargó.
    await espera.waitForFunction(
      () => Reflect.get(window, "marcaSinRecargar") !== true,
      undefined,
      {
        timeout: 15_000,
      },
    );
    // Se recarga UNA sola vez: ya con la sesión, su época coincide con la de la otra y se queda quieta.
    await espera.evaluate(() => Reflect.set(window, "marcaSinRecargar", true));
    await espera.waitForTimeout(3000);
    expect(await espera.evaluate(() => Reflect.get(window, "marcaSinRecargar"))).toBe(true);
  });

  test("con la misma sesión, el ERP, el login y el selector de empresa no se recargan entre sí", async ({
    context,
    page,
  }) => {
    await entrar(page, emailMulti);
    await page.goto("/personas");
    const login = await context.newPage();
    await login.goto("/login"); // /login no redirige con sesión
    const selector = await context.newPage();
    await selector.goto("/elegir-empresa?next=/"); // con dos empresas tampoco redirige
    await expect(selector.getByRole("button", { name: /Gard Security/ })).toBeVisible();
    await expect(login.getByLabel("Correo")).toBeVisible();
    const paginas = [page, login, selector];
    for (const p of paginas) await p.evaluate(() => Reflect.set(window, "marcaSinRecargar", true));
    await page.waitForTimeout(3000);
    for (const p of paginas) {
      expect(await p.evaluate(() => Reflect.get(window, "marcaSinRecargar"))).toBe(true);
    }
  });

  test("cambiar de empresa muestra lo de la nueva en ambas pestañas y nada de la anterior", async ({
    context,
    page,
  }) => {
    await entrar(page, emailMulti);
    await menu(page, /^Personas/).click();
    await page.waitForURL("**/personas");
    await expect(filas(page, "Lagos").first()).toBeVisible(); // persona de la demo de Gard
    const otra = await context.newPage();
    await otra.goto("/personas");
    await expect(filas(otra, "Lagos").first()).toBeVisible();

    await cambiarDeEmpresa(page, "Empresa E2E");
    await page.waitForURL((u) => u.pathname === "/");
    await menu(page, /^Cuentas/).click();
    await page.waitForURL("**/cuentas");
    await menu(page, /^Personas/).click(); // Personas de la otra empresa: no sale de la caché de Gard
    await page.waitForURL("**/personas");
    await expect(filas(page, "Otraempresa").first()).toBeVisible();
    await expect(filas(page, "Lagos")).toHaveCount(0);
    // La otra pestaña se recarga sola: ve lo de la empresa nueva y nada de la anterior.
    await expect(filas(otra, "Otraempresa").first()).toBeVisible({ timeout: 15_000 });
    await expect(filas(otra, "Lagos")).toHaveCount(0);
  });
});
