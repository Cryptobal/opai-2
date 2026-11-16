import { expect, type Page, test } from "@playwright/test";

import { contenidoHidratado, hidratado } from "./hidratacion";
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

async function abrirPrimeraCuenta(page: Page): Promise<string> {
  await page.goto("/cuentas");
  const lista = page.getByRole("region", { name: "Lista de cuentas" });
  await hidratado(lista);
  const primera = lista.locator('a[href^="/cuentas/"]:not([href$="/nueva"]):visible').first();
  const hay = await primera.isVisible({ timeout: 30_000 }).catch(() => false);
  if (!hay) throw new Error("qa-e2e sin cuentas en la lista");
  await primera.click();
  await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}/, { timeout: 60_000 });
  await contenidoHidratado(page);
  const detalle = page.locator("[data-detalle]");
  await expect(detalle).toBeVisible({ timeout: 30_000 });
  // Cabecera de ficha (`DetailScreen`): el título es `<h2>` con `tituloDetalle`, no h1.
  const tituloEl = detalle.getByRole("heading", { level: 2 });
  await expect(tituloEl).toBeVisible();
  return (await tituloEl.innerText()).trim();
}

async function abrirAgenteDesdeBarra(page: Page) {
  const superior = page.locator('button[title*="Ctrl+J"], button[title*="⌘J"]');
  if (await superior.isVisible().catch(() => false)) {
    await superior.click();
    return;
  }
  const barra = page.getByRole("navigation", { name: "Principal" }).filter({ visible: true });
  const pestaña = barra.getByRole("button", { name: /Agente/ });
  await expect(pestaña).toBeVisible();
  await pestaña.click();
}

async function cerrarPanel(page: Page, panel: ReturnType<Page["locator"]>) {
  await page.keyboard.press("Escape");
  if (await panel.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
  }
  await expect(panel).toBeHidden({ timeout: 15_000 });
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
    const hayBarra =
      (await page
        .locator('button[title*="Ctrl+J"], button[title*="⌘J"]')
        .count()) > 0 ||
      (await page
        .getByRole("navigation", { name: "Principal" })
        .getByRole("button", { name: /Agente/ })
        .count()) > 0;
    test.skip(!hayBarra, "la empresa no tiene agente interno");

    await expect(page.getByTestId("agente-en-ficha")).toHaveCount(0);
    await expect(preguntarFicha).toBeVisible();

    await preguntarFicha.click();
    const panel = page.locator("aside[data-panel-lateral]");
    await expect(panel).toBeVisible();
    const chip = panel.getByTestId("agente-contexto-ficha");
    await expect(chip).toContainText("Sobre");
    await expect(chip).toContainText(nombre);
    await cerrarPanel(page, panel);

    await abrirAgenteDesdeBarra(page);
    await expect(panel).toBeVisible();
    await expect(chip).toBeVisible();
    await page.waitForTimeout(300);
    await capturar(page, info, "agente-ficha-contexto");

    await cerrarPanel(page, panel);
    await page.goto("/cuentas");
    await abrirAgenteDesdeBarra(page);
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("agente-contexto-ficha")).toHaveCount(0);
    await capturar(page, info, "agente-lista-sin-contexto");
  });
});