import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Portal del trabajador · Por firmar (CAR-634) en `preview-e2e`: lista o vacío a 375 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const SIN_PORTAL = /Tu cuenta aún no tiene una ficha|Portal no disponible en tu empresa|No tienes acceso a este portal/;

test.describe("@preview trabajador por firmar", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Por firmar carga desde Más, con lista o vacío", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/trabajador/mas");
    const entrada = page.locator('main a[href="/trabajador/por-firmar"]').first();
    const sinPortal = page.getByText(SIN_PORTAL);
    await expect(entrada.or(sinPortal).first()).toBeVisible();
    if (!(await entrada.count())) {
      info.annotations.push({ type: "omitido", description: `qa-e2e: ${(await sinPortal.first().textContent()) ?? "sin portal"}` });
      expect(errores).toEqual([]);
      return;
    }
    await entrada.click();
    await page.waitForURL((u) => u.pathname === "/trabajador/por-firmar");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const fila = page.getByText(/Por firmar|No tienes documentos por firmar/).first();
    await expect(fila).toBeVisible();
    await capturar(page, info, "trabajador-por-firmar");
    expect(errores).toEqual([]);
  });
});