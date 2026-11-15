import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Portal del trabajador · Mis documentos (CAR-463) en `preview-e2e`: la pantalla carga sin errores y muestra la lista
// de documentos propios compartidos o el estado vacío; se llega desde «Más». Si el usuario de `qa-e2e` no tiene ficha
// de trabajador (o no tiene el portal), se anota como omitido. A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const SIN_PORTAL = /Tu cuenta aún no tiene una ficha|Portal no disponible en tu empresa|No tienes acceso a este portal/;

test.describe("@preview trabajador mis documentos", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Mis documentos carga desde Más, con lista o estado vacío", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/trabajador/mas");
    const entrada = page.locator('main a[href="/trabajador/mis-documentos"]').first();
    const sinPortal = page.getByText(SIN_PORTAL);
    await expect(entrada.or(sinPortal).first()).toBeVisible();
    if (!(await entrada.count())) {
      info.annotations.push({ type: "omitido", description: `qa-e2e: ${(await sinPortal.first().textContent()) ?? "sin portal"}` });
      expect(errores).toEqual([]);
      return;
    }
    await entrada.click();
    await page.waitForURL((u) => u.pathname === "/trabajador/mis-documentos");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const lista = page.getByRole("button", { name: /^Ver / }).first();
    const vacio = page.getByText(/Aún no tienes documentos aquí|Tu cuenta aún no tiene una ficha/);
    await expect(lista.or(vacio).first()).toBeVisible();
    await capturar(page, info, "trabajador-mis-documentos");
    expect(errores).toEqual([]);
  });
});
