import { expect, type Locator, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-416: en el teléfono, con el diseño nuevo (export-diseno-nuevo/Telefono), Agente y Menú son
// pestañas de la barra inferior: la barra sigue a la vista, Menú ocupa todo el alto sobre ella,
// Agente no trae «Cerrar» y la barra superior no repite el botón del agente. Usa la empresa
// ficticia `qa-e2e` (nunca Gard) y no escribe nada.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

async function abrirInicioNuevo(page: Page): Promise<Locator> {
  await entrar(page);
  await page
    .context()
    .addCookies([{ name: "opai_marco", value: "nuevo", url: new URL(page.url()).origin }]);
  await page.goto("/");
  const barra = page.getByRole("navigation", { name: "Principal" }).filter({ visible: true });
  await hidratado(barra.getByRole("button", { name: /Menú/ }));
  return barra;
}

test.describe("@preview barra inferior del teléfono (CAR-416)", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");
  test.beforeEach(({ viewport }) => test.skip((viewport?.width ?? 0) > 500, "solo teléfono"));

  test("la barra superior no repite el botón del agente", async ({ page }, info) => {
    await abrirInicioNuevo(page);
    const arriba = page.locator("header").filter({ visible: true }).first();
    await expect(arriba.getByRole("button", { name: "Preguntar a OPAI" })).toHaveCount(0);
    await capturar(page, info, "inicio");
  });

  test("Menú ocupa el alto sobre la barra y la barra sigue a la vista", async ({ page }, info) => {
    const barra = await abrirInicioNuevo(page);
    await barra.getByRole("button", { name: /Menú/ }).click();
    const hoja = page.locator("[data-sobre-barra]");
    await expect(hoja).toBeVisible();
    await expect(barra).toBeVisible();
    const cajaHoja = await hoja.boundingBox();
    const cajaBarra = await barra.boundingBox();
    expect(cajaHoja && cajaBarra).toBeTruthy();
    if (cajaHoja && cajaBarra) {
      expect(cajaHoja.y).toBeLessThanOrEqual(1);
      expect(cajaHoja.y + cajaHoja.height).toBeLessThanOrEqual(cajaBarra.y + 1);
    }
    await capturar(page, info, "menu");
    // Tocar Menú otra vez lo cierra, como una pestaña.
    await barra.getByRole("button", { name: /Menú/ }).click();
    await expect(hoja).toHaveCount(0);
  });

  test("Agente se abre sin «Cerrar» y otra pestaña lo cierra", async ({ page }, info) => {
    const barra = await abrirInicioNuevo(page);
    const agente = barra.getByRole("button", { name: /Agente/ });
    test.skip((await agente.count()) === 0, "la empresa no tiene agente");
    await agente.click();
    const panel = page.locator("aside[data-panel-lateral]");
    await expect(panel).toBeVisible();
    await expect(barra).toBeVisible();
    await expect(panel.locator("[data-panel-cerrar]")).toBeHidden();
    await capturar(page, info, "agente");
    await barra.getByRole("button", { name: /Menú/ }).click();
    await expect(panel).toBeHidden();
    await expect(page.locator("[data-sobre-barra]")).toBeVisible();
  });
});
