import { expect, type Page, test } from "@playwright/test";

/**
 * Bloqueante del Brief 04: el service worker sirve la navegación con `fetch(request)` tal cual, así
 * que cuando el servidor redirige el navegador sigue el redirect y la barra de direcciones queda en
 * el destino. Antes reconstruía la respuesta y la URL se quedaba en el origen: rompía la salida a
 * /login (otra pestaña, cache-sesion) y el redirect de /entrar (D1). Aquí se prueba con el service
 * worker CONTROLANDO la página (sin control, la navegación no pasa por `sw.js` y el bug no aparece).
 */

const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl"; // ERP + Plataforma

async function esperarControl(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: 40_000,
  });
}

async function entrar(page: Page, correo: string, empresa: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  const boton = page.getByRole("button", { name: empresa });
  await Promise.race([
    boton.waitFor({ state: "visible" }),
    page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform"),
  ]).catch(() => undefined);
  if (await boton.isVisible().catch(() => false)) await boton.click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform");
}

test("con el service worker controlando, una navegación sin sesión termina en /login", async ({
  page,
}) => {
  await page.goto("/login");
  await esperarControl(page);
  // Ruta protegida sin sesión: el servidor redirige a /login. Con el service worker controlando, el
  // navegador debe quedar en /login (no en /terreno, que es lo que rompía el bloqueante).
  await page.goto("/terreno");
  await page.waitForURL(/\/login/, { timeout: 15_000 });
  expect(await page.evaluate(() => navigator.serviceWorker.controller != null)).toBe(true);
});

test.describe("redirect de /entrar (D1) con el service worker controlando", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test.setTimeout(180_000);

  test("con la cookie del portal, /entrar redirige al portal a través del service worker", async ({
    page,
    context,
  }) => {
    await entrar(page, email, /Gard Security/);
    await esperarControl(page);
    // Con la cookie «platform», el servidor redirige /entrar → /platform; con el service worker
    // controlando, el navegador debe seguir ese redirect y no quedarse en /entrar.
    await context.addCookies([{ name: "opai_portal", value: "platform", url: page.url() }]);
    await page.goto("/entrar");
    await page.waitForURL((u) => u.pathname === "/platform", { timeout: 15_000 });
    expect(await page.evaluate(() => navigator.serviceWorker.controller != null)).toBe(true);
  });
});
