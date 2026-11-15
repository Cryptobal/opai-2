import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-547: un solo panel de agente con contexto de ficha (barra y «Preguntar a OPAI»).
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

async function marcoNuevo(page: Page) {
  await page
    .context()
    .addCookies([{ name: "opai_marco", value: "nuevo", url: new URL(page.url()).origin }]);
}

async function abrirPrimeraCuenta(page: Page) {
  await page.goto("/cuentas");
  const lista = page.getByRole("region", { name: "Lista de cuentas" });
  await hidratado(lista);
  const primera = lista.locator('a[href^="/cuentas/"]:not([href$="/nueva"]):visible').first();
  await expect(primera).toBeVisible();
  const nombre = (await primera.textContent())?.trim() ?? "";
  await primera.click();
  await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}/);
  return nombre;
}

test.describe("@preview agente: panel único con contexto de ficha (CAR-547)", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("desde la ficha y desde la barra se ve el mismo contexto", async ({ page }, info) => {
    await entrar(page);
    await marcoNuevo(page);
    const nombre = await abrirPrimeraCuenta(page);
    const preguntarFicha = page.locator("[data-detalle]").getByRole("button", {
      name: "Preguntar a OPAI",
    });
    const agenteBarra = page.locator('button[title*="Ctrl+J"], button[title*="⌘J"]');
    test.skip((await agenteBarra.count()) === 0, "la empresa no tiene agente interno");

    await expect(page.getByTestId("agente-en-ficha")).toHaveCount(0);

    await preguntarFicha.click();
    const panel = page.locator("aside[data-panel-lateral]");
    await expect(panel).toBeVisible();
    const chip = panel.getByTestId("agente-contexto-ficha");
    await expect(chip).toContainText(nombre || "Sobre");
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();

    await agenteBarra.click();
    await expect(panel).toBeVisible();
    await expect(chip).toBeVisible();
    await page.waitForTimeout(300);
    await capturar(page, info, "agente-ficha-contexto");

    await page.keyboard.press("Escape");
    await page.goto("/cuentas");
    await agenteBarra.click();
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("agente-contexto-ficha")).toHaveCount(0);
    await capturar(page, info, "agente-lista-sin-contexto");
  });
});