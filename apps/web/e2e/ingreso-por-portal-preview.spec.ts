import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";

// CAR-347: sin sesión, cada portal abre su ingreso. Pantallas públicas: no necesita usuario de qa-e2e.
test.describe("@preview ingreso según el portal", () => {
  test("el guardia llega a su ingreso con RUT y PIN", async ({ page }, info) => {
    await pasarProteccionDeVercel(page);
    await page.goto("/trabajador/marcar");
    await expect(page).toHaveURL(/\/trabajador\/login\?next=%2Ftrabajador%2Fmarcar/);
    await expect(page.getByRole("heading", { name: "Ingresa con tu RUT" })).toBeVisible();
    await capturar(page, info, "ingreso-trabajador");
  });

  test("el portal cliente entra por el ingreso con correo, sin «Próximamente»", async ({
    page,
  }, info) => {
    await pasarProteccionDeVercel(page);
    await page.goto("/cliente/login");
    await expect(page).toHaveURL(/\/login\?next=%2Fcliente/);
    await expect(page.getByText("Próximamente")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Portal cliente" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Entrar como trabajador" })).toBeVisible();
    await expect(page.getByText("ERP, Plataforma, Supervisor y Cliente")).toBeVisible();
    await capturar(page, info, "ingreso-login");
  });
});
