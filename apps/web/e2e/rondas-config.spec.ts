import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// Brief 14 · Rondas PR 1b — flujo de configuración en la ficha de instalación: crear un punto,
// agregarlo a una plantilla y fijar una programación, verificando que persiste. Evidencia visual a
// 375, 1024 y 1280 px (proyectos de playwright.config). El login comparte sesion.ts (contraseña y
// TOTP). El tenant de dev tiene Rondas activo (seed:dev-tenant), así que la pestaña está disponible.
test.setTimeout(180_000);

test.describe("Rondas · configuración de la instalación", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("crear punto, plantilla y programación", async ({ page }, info) => {
    const sello = Date.now().toString().slice(-6);
    const punto = `Punto e2e ${sello}`;
    const plantilla = `Plantilla e2e ${sello}`;
    const programacion = `Programación e2e ${sello}`;

    await entrar(page);
    await page.goto("/instalaciones");
    // La primera ficha real: enlace cuyo href es `/instalaciones/<uuid>` (lleva guión), no «/nueva».
    const href = await page
      .locator('a[href^="/instalaciones/"][href*="-"]')
      .first()
      .getAttribute("href");
    const id = (href ?? "").match(/\/instalaciones\/([0-9a-f-]{36})/)?.[1];
    expect(id, "no hay instalaciones sembradas").toBeTruthy();
    const base = `/instalaciones/${id}`;

    // Tras guardar, recargamos la sub-pestaña: confirma que persistió (viaje al servidor) y deja la
    // lista sin el drawer abierto (Radix marca el fondo inert mientras el Sheet está abierto).
    const visible = (texto: string) =>
      expect(page.getByText(texto).filter({ visible: true }).first()).toBeVisible();

    // Puntos (c13p)
    await page.goto(`${base}/rondas?sub=puntos`);
    await expect(page.getByRole("group", { name: "Sección de rondas" })).toBeVisible();
    await page.screenshot({ path: info.outputPath("rondas-puntos.png"), fullPage: true });
    await page.getByRole("link", { name: "Nuevo punto" }).first().click();
    await page.getByLabel("Nombre del punto").fill(punto);
    await page.getByRole("radio", { name: "QR", exact: true }).check();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.waitForTimeout(500);
    await page.goto(`${base}/rondas?sub=puntos`);
    await visible(punto);

    // Plantillas (c13t): incluye el punto recién creado
    await page.goto(`${base}/rondas?sub=plantillas`);
    await page.getByRole("link", { name: "Nueva plantilla" }).first().click();
    await page.getByLabel("Nombre de la plantilla").fill(plantilla);
    await page.getByRole("checkbox", { name: punto }).check();
    await page.getByRole("button", { name: "Guardar plantilla" }).click();
    await page.waitForTimeout(500);
    await page.goto(`${base}/rondas?sub=plantillas`);
    await visible(plantilla);

    // Programación (c13s): usa la plantilla recién creada
    await page.goto(`${base}/rondas?sub=programacion`);
    await page.getByRole("link", { name: "Nueva programación" }).first().click();
    await page.getByLabel("Nombre", { exact: true }).fill(programacion);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.waitForTimeout(500);
    await page.goto(`${base}/rondas?sub=programacion`);
    await visible(programacion);

    // Historial (c13h): contenedor vacío
    await page.goto(`${base}/rondas?sub=historial`);
    await expect(page.getByText(/Aún no hay historial/)).toBeVisible();
    await page.screenshot({ path: info.outputPath("rondas-historial.png"), fullPage: true });
  });
});
