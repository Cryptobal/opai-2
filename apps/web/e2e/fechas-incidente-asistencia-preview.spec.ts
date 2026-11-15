import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-368 (Sesión Diseño): «Cuándo se detectó» del incidente usa fecha del DS (dd-mm-aaaa) + hora,
// y el encabezado de Asistencia muestra la fecha como «Jueves 12-11-2026». Solo lee; no registra nada.
test.describe("@preview fechas de incidente y Asistencia", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("Registrar incidente: fecha dd-mm-aaaa y hora aparte", async ({ page }, info) => {
    test.setTimeout(150_000);
    await entrar(page);
    await page.goto("/configuracion/cumplimiento/incidentes?nuevo=1");
    const fecha = page.locator("#inc-cuando");
    await expect(fecha).toBeVisible({ timeout: 60_000 });
    await expect(fecha).toHaveAttribute("placeholder", "dd-mm-aaaa");
    await expect(page.locator('input[type="datetime-local"]')).toHaveCount(0);
    await expect(page.getByLabel("Hora en que se detectó")).toBeVisible();
    await capturar(page, info, "fechas-incidente");
  });

  test("Asistencia: la fecha del encabezado es dd-mm-aaaa", async ({ page }, info) => {
    test.setTimeout(150_000);
    await entrar(page);
    await page.goto("/asistencia");
    await expect(page.getByText(/[A-ZÁÉÍÓÚ][a-záéíóú]+ \d{2}-\d{2}-\d{4} · \d+ turnos/).first()).toBeVisible({
      timeout: 60_000,
    });
    await capturar(page, info, "fechas-asistencia");
  });
});
