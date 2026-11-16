import { expect, test } from "@playwright/test";

import { abrirAccesos } from "./accesos-instalacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-474 y CAR-567: el control de acceso se entra solo por la pestaña Accesos de la instalación. `/accesos`
// lleva a Instalaciones, que abre en las activas. Sin registros (p. ej. la vista previa sin
// ACCESO_HUELLA_SECRET, CAR-483) se revisa el estado vacío y la navegación.
test.describe("@preview acceso: Accesos desde la instalación", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("sin entrada propia: /accesos lleva a Instalaciones activas", async ({ page }, info) => {
    await entrar(page);
    await page
      .context()
      .addCookies([{ name: "opai_marco", value: "nuevo", url: new URL(page.url()).origin }]);
    await page.goto("/accesos");
    await expect(page).toHaveURL(/\/instalaciones$/, { timeout: 60_000 });
    await expect(page.getByText("Estado: Activa").filter({ visible: true }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.locator('nav a[href="/accesos"]')).toHaveCount(0);
    await capturar(page, info, "instalaciones-activas");
  });

  test("registros, ficha, en sitio e intentos", async ({ page }, info) => {
    await entrar(page);
    await page
      .context()
      .addCookies([{ name: "opai_marco", value: "nuevo", url: new URL(page.url()).origin }]);
    const base = await abrirAccesos(page, "registros");
    await expect(
      page.getByRole("link", { name: "Prerregistros" }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "accesos-registros");

    const fila = page.locator('a[href^="/accesos/0"]').filter({ visible: true }).first();
    if ((await fila.count()) === 0) {
      test
        .info()
        .annotations.push({ type: "sin-datos", description: "Sin registros: ficha no recorrida" });
    } else {
      await fila.click();
      await expect(page.getByText("Documento enmascarado")).toBeVisible({ timeout: 60_000 });
      await capturar(page, info, "accesos-ficha");
    }

    await page.goto(`${base}?sub=en_sitio`);
    await expect(
      page
        .getByText(/Nadie en sitio|En sitio/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "accesos-en-sitio");

    await page.goto(`${base}?sub=intentos`);
    await expect(
      page
        .getByText(/Sin intentos denegados|Bloqueado|Fuera de lista|Fuera de horario|Pase ya usado/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "accesos-intentos");
  });
});
