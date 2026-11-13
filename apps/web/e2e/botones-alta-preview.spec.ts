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
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 60_000 });
    const nuevo = page.getByRole("link", { name: "Nuevo", exact: true }).filter({ visible: true });
    const hay = await nuevo
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(!hay, "El usuario de prueba no puede crear contactos (cuentas:manage)");
    await capturar(page, info, "contactos-boton-nuevo");
    await nuevo.first().click();
    const hoja = page.getByRole("dialog", { name: "Nuevo contacto" });
    await expect(hoja).toBeVisible({ timeout: 30_000 });
    await expect(hoja.getByText("Cuenta", { exact: true }).first()).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Crear contacto" })).toBeDisabled();
    await capturar(page, info, "contactos-hoja-nuevo");
  });

  test("Cotizaciones y Solicitudes muestran un solo botón de alta, sobre la lista", async ({
    page,
  }, info) => {
    await entrar(page);
    for (const [ruta, nombre] of [
      ["/cotizaciones", "Nueva"],
      ["/solicitudes", "Registrar solicitud"],
    ] as const) {
      await page.goto(ruta);
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 60_000 });
      const boton = page.getByRole("link", { name: nombre, exact: true }).filter({ visible: true });
      if (
        !(await boton
          .first()
          .isVisible({ timeout: 10_000 })
          .catch(() => false))
      )
        continue; // sin permiso o módulo
      // Un solo botón visible; dos solo si la lista está vacía (el estado vacío repite la acción).
      const vacia = await page
        .getByText(/Aún no hay/)
        .first()
        .isVisible()
        .catch(() => false);
      await expect(boton).toHaveCount(vacia ? 2 : 1);
      await capturar(page, info, `alta${ruta.replace("/", "-")}`);
    }
  });
});
