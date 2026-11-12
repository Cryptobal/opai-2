import { expect, type Page, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de persona (CAR-124, CAR-244) en `preview-e2e`: el Resumen con sus tarjetas de estado y la
// pestaña Laboral con el banco elegido de la lista SBIF, a 375, 1024 y 1280 px. Entra con el usuario
// de la empresa ficticia `qa-e2e`; usa la persona ficticia sembrada en esa empresa.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const ENLACE_PERSONA = 'a[href^="/personas/"]:not([href*="vencimientos"])';

/** Abre la primera persona de la lista (la empresa de pruebas `qa-e2e` tiene una persona ficticia sembrada). */
async function abrirUnaPersona(page: Page): Promise<void> {
  await page.goto("/personas");
  await expect(page.getByText("Algo salió mal")).toHaveCount(0);
  const primera = page.locator(ENLACE_PERSONA).filter({ visible: true }).first();
  await expect(primera, "qa-e2e tiene al menos una persona ficticia").toBeVisible();
  await primera.click();
  await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
}

test.describe("@preview ficha de persona", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Resumen con tarjetas de estado y Laboral con el selector de banco", async ({
    page,
  }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await abrirUnaPersona(page);
    const ficha = new URL(page.url()).pathname.match(/^\/personas\/[0-9a-f-]{36}/)?.[0] ?? "";

    // Resumen: una tarjeta por sección, cada una con su enlace a Laboral.
    for (const titulo of ["Previsión", "Pago", "Uniforme", "Jornada DT", "OS-10"])
      await expect(page.getByText(titulo, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "ficha-persona-resumen");

    // Laboral: las secciones muestran su estado (vacío con acción) en vez de quedar en blanco.
    await page.goto(`${ficha}/laboral`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const solicitar = page.getByRole("link", { name: /Solicitar cambio|Ver solicitud/ }).first();
    await expect(solicitar).toBeVisible();
    await capturar(page, info, "ficha-persona-laboral");

    // Pago: el banco se elige de la lista con código SBIF, no se escribe a mano.
    if ((await solicitar.innerText()).includes("Solicitar cambio")) {
      await solicitar.click();
      const hoja = page.getByRole("dialog").first();
      await expect(hoja.getByText("Banco", { exact: true }).first()).toBeVisible();
      await capturar(page, info, "ficha-persona-cambio-banco");
    }
    expect(errores).toEqual([]);
  });

  test("Pago: agregar otra cuenta bancaria (CAR-275)", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await abrirUnaPersona(page);
    const ficha = new URL(page.url()).pathname.match(/^\/personas\/[0-9a-f-]{36}/)?.[0] ?? "";
    await page.goto(`${ficha}/laboral`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const agregar = page.getByRole("link", { name: "Agregar cuenta" }).first();
    // Con una solicitud ya pendiente el botón no se ofrece; la prueba no depende del orden de las otras.
    test.skip(
      (await agregar.count()) === 0,
      "Hay una solicitud de pago pendiente en la persona de prueba",
    );
    await agregar.click();
    const hoja = page.getByRole("dialog").first();
    await expect(hoja.getByText("Dejarla como cuenta por defecto")).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Solicitar cuenta" })).toBeDisabled();
    await capturar(page, info, "ficha-persona-agregar-cuenta");
    expect(errores).toEqual([]);
  });
});
