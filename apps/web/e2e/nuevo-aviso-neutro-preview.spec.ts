import { expect, test, type Page } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-334 (Sesión Diseño): en el diseño nuevo (ADR-109) los avisos informativos son neutros, sin el
// azul de «info»: el único color libre es el acento de la empresa. Corre en `preview-e2e` con el
// usuario de la empresa ficticia `qa-e2e`.
const BASE = process.env["BASE_URL"] ?? "http://localhost:3000";
const FILL_NUEVO_CLARO = "rgb(242, 242, 242)";
const AZUL_INFO = "rgb(232, 244, 250)";

async function fondoDe(page: Page, texto: string): Promise<string> {
  const aviso = page.getByText(texto, { exact: false }).first();
  await expect(aviso).toBeVisible({ timeout: 60_000 });
  return aviso.evaluate((el) => {
    let n: Element | null = el;
    while (n && getComputedStyle(n).backgroundColor === "rgba(0, 0, 0, 0)") n = n.parentElement;
    return n ? getComputedStyle(n).backgroundColor : "";
  });
}

test.describe("@preview diseño nuevo: avisos informativos neutros", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("el aviso informativo usa el relleno neutro, no azul", async ({ page, context }, info) => {
    test.setTimeout(180_000);
    await context.addCookies([{ name: "opai_marco", value: "nuevo", url: BASE }]);
    await entrar(page);
    const oscuro = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);

    await page.goto("/configuracion/modulos");
    const fondo = await fondoDe(page, "Apagar un módulo no rompe otro");
    expect(fondo).not.toBe(AZUL_INFO);
    if (!oscuro) expect(fondo).toBe(FILL_NUEVO_CLARO);
    await capturar(page, info, "nuevo-aviso-modulos");
  });
});
