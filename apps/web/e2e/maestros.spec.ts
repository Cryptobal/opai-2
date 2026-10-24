import { expect, type Page, test } from "@playwright/test";

import { digitoVerificador } from "@opai/domain";

// Maestros (Brief 02, sesión C): personas (lista, alta con vínculo, laboral, sueldo en tres
// niveles), cargos, vencimientos, Inicio y terreno del supervisor, a 375, 1024 y 1280.
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
}

/** RUT válido y único por corrida (cuerpo de 8 dígitos desde la hora). */
function rutNuevo() {
  const cuerpo = String(20_000_000 + (Date.now() % 9_000_000));
  return `${cuerpo}-${digitoVerificador(cuerpo)}`;
}

// El servidor de desarrollo compila cada ruta en su primera visita.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("maestros con sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Inicio, cuentas, instalaciones, cargos y vencimientos", async ({ page }, info) => {
    const p = info.project.name;
    await entrar(page);
    await page.goto("/");
    await expect(page.getByText("Requiere tu decisión hoy")).toBeVisible();
    await captura(page, "maestros-inicio", p);
    for (const [ruta, nombre] of [
      ["/cuentas", "cuentas"],
      ["/instalaciones", "instalaciones"],
      ["/cargos", "cargos"],
      ["/personas/vencimientos", "vencimientos"],
    ] as const) {
      await page.goto(ruta);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      await captura(page, `maestros-${nombre}`, p);
    }
  });

  test("alta de persona con vínculo, laboral y sueldo", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    // Visita Personas y Cuentas con enlaces del menú para que queden en la caché del navegador.
    const apellido = `E2E ${Date.now()}`;
    await page.goto("/personas");
    await page
      .getByRole("link", { name: /^Cuentas/ })
      .first()
      .click();
    await page.waitForURL("**/cuentas");
    await page
      .getByRole("link", { name: /^Personas/ })
      .first()
      .click();
    await page.waitForURL("**/personas");
    await page.getByRole("link", { name: "Agregar persona" }).first().click();
    const dialogo = page.getByRole("dialog", { name: "Agregar persona" });
    await expect(dialogo).toBeVisible();
    await dialogo.getByLabel("Nombres").fill("Prueba");
    await dialogo.getByLabel("Apellidos").fill(apellido);
    await dialogo.getByLabel("RUT").fill(rutNuevo());
    await dialogo.getByLabel("Cargo").click();
    await page.getByRole("option").first().click();
    await dialogo.getByRole("button", { name: "Crear persona" }).click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}$/);
    await expect(
      page
        .getByRole("tab", { name: /Laboral/ })
        .or(page.getByRole("link", { name: "Laboral" }))
        .first(),
    ).toBeVisible();
    await captura(page, "maestros-persona", "ipad");
    // La escritura vació la caché: Personas, ya visitada, muestra a la persona nueva.
    await page
      .getByRole("link", { name: /^Cuentas/ })
      .first()
      .click();
    await page.waitForURL("**/cuentas");
    await page
      .getByRole("link", { name: /^Personas/ })
      .first()
      .click();
    await page.waitForURL("**/personas");
    await expect(page.getByRole("link", { name: new RegExp(apellido) }).first()).toBeVisible();
    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(/\/personas\/[0-9a-f-]{36}$/);

    await page.getByRole("link", { name: "Laboral" }).first().click();
    await expect(page.getByText("Estructura de sueldo efectiva")).toBeVisible({ timeout: 30_000 });
    await captura(page, "maestros-persona-laboral", "ipad");

    await page.getByRole("link", { name: /Cómo se arma/ }).click();
    await expect(page.getByRole("columnheader", { name: /Valor final/ })).toBeVisible({
      timeout: 30_000,
    });
    await captura(page, "maestros-persona-sueldo", "ipad");
  });

  test("terreno del supervisor", async ({ page }, info) => {
    test.skip(info.project.name !== "telefono", "Terreno es de teléfono");
    await entrar(page);
    await page.goto("/supervisor/instalaciones");
    await expect(page.getByRole("heading", { name: "Instalaciones" })).toBeVisible();
    await captura(page, "terreno-instalaciones", "telefono");
    await page.goto("/supervisor");
    await expect(page.getByText("Documentos pendientes")).toBeVisible();
    await captura(page, "terreno-hoy", "telefono");
  });
});
