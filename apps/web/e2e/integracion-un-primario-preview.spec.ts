import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-367 (Sesión Diseño): en la integración de IA hay un solo «Guardar» primario (los de cada
// credencial son secundarios) y, en teléfono, la cabecera ya no lo lleva. Corre en `preview-e2e` con el
// usuario de la empresa ficticia `qa-e2e`.
test.describe("@preview integración: un solo primario", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("la integración de IA tiene un solo «Guardar» primario visible", async ({ page }, info) => {
    test.setTimeout(120_000);
    await entrar(page);
    await page.goto("/configuracion/integraciones/ia");
    await expect(page.getByText("Credenciales", { exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
    const primarios = page.locator(".ds-primario").filter({ visible: true });
    await expect(primarios).toHaveCount(1);
    await expect(primarios.first()).toHaveText("Guardar");
    await capturar(page, info, "integracion-ia");
  });
});
