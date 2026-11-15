import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";

// CAR-481: Accesos en el Portal Cliente (en sitio y registros, solo lectura). Corre en `preview-e2e` con un
// contacto de cliente con acceso completo de la empresa ficticia `qa-e2e` (nunca Gard ni datos reales); sus
// credenciales llegan como secretos (E2E_CLIENTE_EMAIL / E2E_CLIENTE_PASSWORD) y no se imprimen. Sin ellas
// la prueba se omite y no bloquea.
const email = process.env["E2E_CLIENTE_EMAIL"];
const password = process.env["E2E_CLIENTE_PASSWORD"];

test.describe("@preview acceso: Accesos en el Portal Cliente", () => {
  test.skip(!email || !password, "Falta el contacto cliente de qa-e2e (E2E_CLIENTE_*)");

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
    // CAR-539: visitas prerregistradas y la hoja «Prerregistrar».
    await page.getByRole("link", { name: "Visitas", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Prerregistros" }).first()).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "cliente-accesos-visitas");
    // CAR-538: la pestaña Listas muestra las listas o explica que la empresa no la habilitó.
    await page.getByRole("link", { name: "Listas", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /^(Autorizadas|Listas no habilitadas)$/ }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "cliente-accesos-listas");
    expect(errores).toEqual([]);
  });
});
