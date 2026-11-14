import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";
import { E2E_PASSWORD } from "./sesion";

// Portal del cliente · cobertura en el Resumen del mes (CAR-491) en `preview-e2e`. Entra con un contacto de cliente
// (`E2E_CLIENTE_EMAIL`, con la misma contraseña de e2e); sin ese usuario, se anota como omitido. Comprueba que la
// tarjeta de cada instalación muestra la cobertura con cifras o «Pendiente», sin errores. A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const CLIENTE = process.env["E2E_CLIENTE_EMAIL"];

test.describe("@preview cliente cobertura", () => {
  test.skip(!CLIENTE || !E2E_PASSWORD, "Falta E2E_CLIENTE_EMAIL o la contraseña de e2e");

  test("el resumen del mes muestra la cobertura de cada instalación", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await pasarProteccionDeVercel(page);
    await page.goto("/login");
    await page.getByLabel("Correo").fill(CLIENTE ?? "");
    await page.getByLabel("Contraseña", { exact: true }).fill(E2E_PASSWORD ?? "");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL((u) => u.pathname !== "/login");
    await page.goto("/cliente");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await expect(page.getByText("Cobertura").first()).toBeVisible();
    await expect(page.getByText(/ de \d+ turnos|Sin turnos programados|Pendiente/).first()).toBeVisible();
    await expect(page.getByText("Rondas realizadas").first()).toBeVisible();
    await expect(page.getByText("Novedades por gravedad").first()).toBeVisible();
    await capturar(page, info, "cliente-resumen-cobertura");
    expect(errores).toEqual([]);
  });
});
