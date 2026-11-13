import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-337: el alta va en el mismo lugar en todas las listas (arriba de la columna), y Contactos tiene alta
// directa eligiendo la cuenta.
test.describe("@preview listas: botón de alta", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Contactos abre «Nuevo contacto» con la cuenta a elegir", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/contactos");
    const nuevo = page.getByRole("link", { name: "Nuevo", exact: true }).filter({ visible: true });
    await expect(nuevo.first()).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "contactos-boton-nuevo");
    await nuevo.first().click();
    const hoja = page.getByRole("dialog", { name: "Nuevo contacto" });
    await expect(hoja).toBeVisible({ timeout: 30_000 });
    await expect(hoja.getByText("Cuenta", { exact: true }).first()).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Crear contacto" })).toBeDisabled();
    await capturar(page, info, "contactos-hoja-nuevo");
  });

  test("Cotizaciones y Solicitudes muestran un solo botón de alta, sobre la lista", async ({ page }, info) => {
    await entrar(page);
    for (const [ruta, nombre] of [
      ["/cotizaciones", "Nueva"],
      ["/solicitudes", "Registrar solicitud"],
    ] as const) {
      await page.goto(ruta);
      const boton = page.getByRole("link", { name: nombre, exact: true }).filter({ visible: true });
      await expect(boton.first()).toBeVisible({ timeout: 60_000 });
      // En la barra superior ya no se repite (puede aparecer otra vez solo en el estado vacío).
      await expect(page.locator("header").getByRole("link", { name: nombre, exact: true })).toHaveCount(0);
      await capturar(page, info, `alta${ruta.replace("/", "-")}`);
    }
  });
});
