import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";

// CAR-300 corte 4: el prospecto entra al Portal Cliente y solo ve Cotizaciones. Corre en `preview-e2e`
// con un contacto de la empresa ficticia `qa-e2e` (nunca Gard ni datos reales); sus credenciales llegan
// como secretos de GitHub Actions (E2E_PROSPECTO_EMAIL / E2E_PROSPECTO_PASSWORD) y no se imprimen.
// Sin ellas la prueba se omite y no bloquea.
const email = process.env["E2E_PROSPECTO_EMAIL"];
const password = process.env["E2E_PROSPECTO_PASSWORD"];

test.describe("@preview portal del prospecto", () => {
  test.skip(!email || !password, "Falta el contacto prospecto de qa-e2e (E2E_PROSPECTO_*)");

  test("entra directo a Cotizaciones y abre el detalle de su propuesta", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await pasarProteccionDeVercel(page);
    await page.goto("/login");
    await page.getByLabel("Correo").fill(email ?? "");
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await page.waitForURL((url) => url.pathname.startsWith("/cliente/cotizaciones"), { timeout: 45_000 });
    await expect(page.getByRole("heading", { name: "Cotizaciones" }).first()).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "prospecto-cotizaciones");

    const primera = page.getByRole("link", { name: /CPQ-/ }).first();
    if (await primera.count()) {
      await primera.click();
      await expect(page.getByText("Tu acceso completo se activa cuando aceptes el servicio.")).toBeVisible({
        timeout: 30_000,
      });
      await capturar(page, info, "prospecto-detalle");
    }
    expect(errores).toEqual([]);
  });
});
