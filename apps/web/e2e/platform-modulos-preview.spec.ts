import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-742: complementos anidados y activación liviana en Plataforma › Empresa › Módulos.
test.describe("@preview plataforma: módulos y complementos", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("muestra complementos bajo el módulo padre", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/platform?q=qa-e2e");
    const sinPlataforma = await page.getByText("Plataforma es solo para el equipo de OPAI.").count();
    test.skip(sinPlataforma > 0, "La cuenta no tiene rol de plataforma");
    const fila = page.getByRole("main").getByText(/QA E2E/i).filter({ visible: true }).first();
    test.skip((await fila.count()) === 0, "qa-e2e no aparece en Plataforma");
    await fila.click();
    await page.getByRole("link", { name: "Módulos" }).click();
    await expect(page.getByText("Cumplimiento DT")).toBeVisible({ timeout: 15_000 });
    await capturar(page, info, "platform-modulos");
  });
});