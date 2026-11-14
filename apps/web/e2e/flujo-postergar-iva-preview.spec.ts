import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-397: tocar la celda «IVA a pagar» abre la hoja para postergar el pago a M+2 (o volverlo a M+1) con vista previa.
// Solo revisa el cambio: no confirma, así no escribe nada en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview flujo de caja: postergar el IVA", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("abre el IVA de la semana y revisa la postergación sin guardarla", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/finanzas/flujo");
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({
      timeout: 60_000,
    });
    const celda = page
      .locator("tr", { hasText: "IVA a pagar" })
      .getByRole("button")
      .or(page.locator("li", { hasText: "IVA a pagar" }).getByRole("button"))
      .first();
    test.skip(
      (await celda.count()) === 0,
      "La empresa de prueba no tiene IVA proyectado en el horizonte",
    );

    await celda.click();
    const hoja = page.getByRole("dialog");
    await expect(hoja.getByText(/IVA de /).first()).toBeVisible();
    await capturar(page, info, "flujo-iva-hoja");
    await hoja.getByRole("button", { name: /Postergar a M\+2|Volver a pagarlo en M\+1/ }).click();
    await expect(hoja.getByText("Revisa el cambio")).toBeVisible();
    await capturar(page, info, "flujo-iva-revisar");
  });
});
