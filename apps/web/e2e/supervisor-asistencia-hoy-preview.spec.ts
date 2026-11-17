import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-600 · Asistencia de hoy en el portal Supervisor (375 px), con supervisor sembrado en `seed:asistencia-e2e`.
const SUPERVISOR = "supervisor-asistencia-hoy@opai.cl";

test.describe("@preview supervisor · Asistencia de hoy", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("ve turnos de su instalación", async ({ page }, info) => {
    test.skip(info.project.name !== "telefono", "Vista móvil 375 px");
    await entrar(page, SUPERVISOR);
    await page.goto("/supervisor/asistencia");
    await expect(page.getByRole("heading", { name: "Asistencia de hoy" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/· \d+ turnos/).first()).toBeVisible();
    await expect(page.getByText("Ana Pauta E2E").first()).toBeVisible();
    await capturar(page, info, "supervisor-asistencia-hoy");
  });
});