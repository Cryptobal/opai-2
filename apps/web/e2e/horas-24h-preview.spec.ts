import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-368 (Sesión Diseño): las horas se escriben en 24 h («hh:mm») con `SelectorHora` del DS. La hora
// nativa del navegador mostraba «--:-- --» con AM/PM en un equipo en inglés. Solo lee; no registra nada.
test.describe("@preview horas en 24 h", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("Registrar incidente: la hora se escribe hh:mm", async ({ page }, info) => {
    test.setTimeout(150_000);
    await entrar(page);
    await page.goto("/configuracion/cumplimiento/incidentes?nuevo=1");
    const hora = page.getByLabel("Hora en que se detectó");
    await expect(hora).toBeVisible({ timeout: 60_000 });
    await expect(hora).toHaveAttribute("placeholder", "hh:mm");
    await expect(page.locator('input[type="time"]')).toHaveCount(0);
    await hora.fill("2130");
    await expect(hora).toHaveValue("21:30");
    await capturar(page, info, "horas-24h-incidente");
  });
});
