import { expect, test } from "@playwright/test";

import { capturarHoja } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-84: «Nuevo ticket» deja elegir la instalación (opcional) entre las que quien crea tiene a su
// cargo. Si la empresa de prueba no tiene instalaciones activas, el campo no aparece y se captura igual.
test.describe("@preview tickets: instalación en «Nuevo ticket»", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la hoja muestra el campo de instalación cuando hay alguna", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/tickets");
    const nuevo = page.getByRole("button", { name: "Nuevo ticket" }).first();
    await expect(nuevo).toBeVisible({ timeout: 60_000 });
    test.skip(await nuevo.isDisabled(), "La empresa de prueba no tiene tipos de ticket");
    await nuevo.click();
    await expect(page.getByRole("dialog", { name: "Nuevo ticket" })).toBeVisible();
    const campo = page.getByText("Instalación (opcional)", { exact: true });
    if (await campo.count()) {
      await expect(page.locator("#nt-inst")).toContainText("Sin instalación");
    }
    await capturarHoja(page, info, "tickets-nuevo-instalacion");
  });
});
