import { expect, type Page, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// Brief 25 · Nómina PR 1: pantallas Períodos (01), Novedades (05), Calendario (10) y la pestaña
// «Conceptos» de Configuración › Módulos › Nómina (09). Evidencia a 375, 1024 y 1280 (proyectos de
// playwright.config). Las escrituras se prueban una vez (iPad) y sin residuo que choque entre
// corridas: «Abrir período» sugiere siempre el mes siguiente al último. Los flujos con persona se
// cubren en packages/capabilities (nomina.test.ts y nomina-db.test.ts).
test.setTimeout(180_000);

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test.describe("Nómina", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("períodos: abre un mes y muestra su estado", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    await page.goto("/nomina");
    await expect(page.getByRole("button", { name: "Abrir período" })).toBeVisible();
    await page.getByRole("button", { name: "Abrir período" }).click();
    const abrir = page.getByRole("dialog").getByRole("button", { name: "Abrir", exact: true });
    const respuesta = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("nomina.periodos.abrir"));
    await abrir.click();
    await respuesta;
    await expect(page.getByText("Abierto").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Pasar a revisión" }).first()).toBeVisible();
    await captura(page, "nomina-periodos", info.project.name);
  });

  test("períodos: se ve a 375, 1024 y 1280 sin scroll horizontal", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/nomina");
    await expect(page.getByRole("group", { name: "Secciones de Nómina" })).toBeVisible();
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(ancho).toBeLessThanOrEqual(1);
    await captura(page, "nomina-periodos-vista", info.project.name);
  });

  test("novedades: anticipos y préstamos enlazados desde el período", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/nomina/novedades");
    await expect(page.getByRole("group", { name: "Vista" })).toBeVisible();
    await page.getByRole("link", { name: "Anticipos" }).click();
    await expect(page.getByText("Anticipo quincenal").first()).toBeVisible();
    await page.getByRole("link", { name: "Préstamos" }).click();
    await expect(page.getByText("Cada cuota se descuenta en su mes").first()).toBeVisible();
    await captura(page, "nomina-novedades", info.project.name);
  });

  test("calendario: marca formatos y plazos por verificar", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/nomina/calendario");
    const generar = page.getByRole("button", { name: /Generar calendario|Completar calendario/ }).first();
    await expect(generar).toBeVisible();
    if (info.project.name === "ipad") {
      const respuesta = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("nomina.obligaciones.generar_calendario"));
      await generar.click();
      await respuesta;
    }
    await page.reload();
    await expect(page.getByText("Formato por verificar").first()).toBeVisible();
    await expect(page.getByText("Plazo por verificar").first()).toBeVisible();
    await captura(page, "nomina-calendario", info.project.name);
  });

  test("configuración: la pestaña Conceptos vive en Configuración › Módulos › Nómina", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/nomina");
    await expect(page.getByText("Conceptos de haberes y descuentos").first()).toBeVisible();
    await expect(page.getByText("por verificar").first()).toBeVisible();
    await captura(page, "nomina-configuracion", info.project.name);
  });
});
