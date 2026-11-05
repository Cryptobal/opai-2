import { expect, test } from "@playwright/test";

import { E2E_PASSWORD as password, entrar } from "./sesion";
import { abrirMenuUsuario } from "./menu-usuario";

// Centro de Configuración 2.0 · PR 1 (portada por tarjetas de grupo). Desktop (1280), iPad (1024) y
// teléfono (375), claro y oscuro. Diseño aprobado por Carlos el 30-oct-2026 08:18 CLT.

const GRUPOS = [
  "Empresa",
  "Operación",
  "Personas y acceso",
  "Agentes",
  "Módulos",
  "Uso y registros",
];

/** Carpeta de evidencia del QA (REGLA §5), además de las capturas de e2e/__screenshots__. */
const qa = (nombre: string) => `../../docs/2.0/qa/brief_configuracion-pr1-portada/${nombre}.png`;

test.describe("configuración: portada por tarjetas de grupo", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("owner ve las 6 tarjetas de grupo, sin contadores", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion");
    for (const g of GRUPOS)
      await expect(page.getByRole("link", { name: new RegExp(g) }).first()).toBeVisible();
    // Ajuste aprobado 1: ninguna tarjeta muestra un contador «N ajustes».
    await expect(page.getByText(/\d+\s+ajustes?/)).toHaveCount(0);
    await page.screenshot({
      path: `e2e/__screenshots__/configuracion-portada-${info.project.name}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: qa(`portada-${info.project.name}`), fullPage: true });
  });

  test("portada en modo oscuro", async ({ page }, info) => {
    await entrar(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/configuracion");
    await expect(page.getByRole("link", { name: /Empresa/ }).first()).toBeVisible();
    await page.screenshot({ path: qa(`portada-oscuro-${info.project.name}`), fullPage: true });
    await page.goto("/configuracion/grupo/operacion");
    await expect(page.getByRole("link", { name: /Calendario/ }).first()).toBeVisible();
    await page.screenshot({
      path: qa(`grupo-operacion-oscuro-${info.project.name}`),
      fullPage: true,
    });
  });

  test("tarjeta → grupo (escritorio/iPad) y tarjeta → lista → entrada → atrás (teléfono)", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/configuracion");
    if (info.project.name === "telefono") {
      await page
        .getByRole("link", { name: /Empresa/ })
        .first()
        .click();
      await page.waitForURL(/\/configuracion\/grupo\/empresa$/);
      const entrada = page.getByRole("link", { name: /Datos de la empresa/ });
      await expect(entrada).toBeVisible();
      await entrada.click();
      await page.waitForURL(/\/configuracion\/empresa$/);
      await expect(
        page.getByRole("heading", { name: "Datos de la empresa", exact: true }).first(),
      ).toBeVisible();
      // «‹ Empresa» vuelve a la lista del grupo.
      await page.getByRole("link", { name: "Volver a Empresa" }).click();
      await page.waitForURL(/\/configuracion\/grupo\/empresa$/);
    } else {
      await page.getByRole("link", { name: /^Empresa:/ }).click();
      await page.waitForURL(/\/configuracion\/grupo\/empresa$/);
      await expect(page.getByRole("heading", { name: "Empresa", exact: true })).toBeVisible();
      // Migas «Configuración › Empresa» sobre el título.
      await expect(page.getByRole("navigation", { name: "Ruta de configuración" })).toBeVisible();
    }
  });

  test("buscador: «feriados» lleva a Calendario y sin resultados muestra el vacío", async ({
    page,
  }) => {
    await entrar(page);
    await page.goto("/configuracion");
    const campo = page.getByRole("searchbox", { name: "Buscar un ajuste" });
    const resultado = page.getByRole("link", { name: /Calendario/ });
    await expect(async () => {
      await campo.fill("");
      await campo.fill("feriados");
      await expect(resultado.first()).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 15_000 });
    await resultado.first().click();
    await page.waitForURL(/\/configuracion\/calendario$/);
    await page.goto("/configuracion");
    await expect(async () => {
      const busqueda = page.getByRole("searchbox", { name: "Buscar un ajuste" });
      await busqueda.fill("");
      await busqueda.fill("zxqwk");
      await expect(page.getByText(/No encontramos/)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 15_000 });
  });

  test("404 de un grupo inexistente, con el shell del ERP", async ({ page }) => {
    await entrar(page);
    // El proxy fuerza el 404 con un `fetch` interno de 4 s; si el runner está lento ese `fetch` vence y
    // sale 200. Se reintenta la carga hasta ver el 404 real (el contrato que protege esta prueba).
    await expect(async () => {
      const r = await page.goto("/configuracion/grupo/inventado");
      expect(r?.status()).toBe(404);
    }).toPass({ timeout: 60_000 });
  });

  test("Preferencias se abre desde el menú de usuario y no está en la portada", async ({
    page,
  }, info) => {
    test.skip(
      info.project.name === "telefono",
      "El menú de usuario del shell se prueba en iPad/escritorio",
    );
    await entrar(page);
    await page.goto("/configuracion");
    // No aparece como tarjeta ni entrada de Configuración.
    await expect(page.getByRole("link", { name: /Preferencias/ })).toHaveCount(0);
    const pref = page.getByRole("menuitem", { name: "Preferencias" });
    await abrirMenuUsuario(page, pref);
    await pref.click();
    await page.waitForURL(/\/mi-cuenta\/preferencias$/);
    await expect(page.getByRole("region", { name: "Preferencias" })).toBeVisible();
  });

  test("la URL antigua de Preferencias redirige a /mi-cuenta/preferencias", async ({ page }) => {
    await entrar(page);
    await page.goto("/configuracion/preferencias");
    await expect(page).toHaveURL(/\/mi-cuenta\/preferencias$/);
    await expect(page.getByRole("region", { name: "Preferencias" })).toBeVisible();
  });
});
