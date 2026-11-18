import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";

// CAR-481: Accesos en el Portal Cliente (en sitio y registros, solo lectura). Corre en `preview-e2e` con un
// contacto de cliente con acceso completo de la empresa ficticia `qa-e2e` (nunca Gard ni datos reales); sus
// credenciales llegan como secretos (E2E_CLIENTE_EMAIL con la contraseña de e2e, CAR-500) y no se imprimen.
// Sin ellas la prueba se omite y no bloquea.
const email = process.env["E2E_CLIENTE_EMAIL"];
const password = process.env["E2E_PASSWORD"];

test.describe("@preview acceso: Accesos en el Portal Cliente", () => {
  test.skip(!email || !password, "Falta el contacto cliente de qa-e2e (E2E_CLIENTE_EMAIL, CAR-500)");

  test("en sitio y registros de sus instalaciones", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await pasarProteccionDeVercel(page);
    await page.goto("/login");
    await page.getByLabel("Correo").fill(email ?? "");
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/cliente"), { timeout: 45_000 });

    await page.goto("/cliente/accesos");
    await expect(page.getByRole("heading", { name: "En sitio" }).first()).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "cliente-accesos-en-sitio");
    await page.getByRole("link", { name: "Registros", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Registros" }).first()).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "cliente-accesos-registros");
    expect(errores).toEqual([]);
  });
});
