import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-302: el diálogo «Asociar correo» trae el selector de negocio. Corre en `preview-e2e` con el usuario
// de la empresa ficticia `qa-e2e` (nunca Gard) y no escribe: abre el diálogo y lo cancela. Si la empresa
// no tiene correos sin asignar, la prueba se omite (no hay nada que asociar).
test.describe("@preview asociar correo a negocio", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el diálogo ofrece el negocio de la cuenta elegida", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/configuracion/correos-clientes");
    const boton = page.getByRole("button", { name: "Asociar a una cuenta" }).first();
    test.skip(!(await boton.isVisible({ timeout: 30_000 }).catch(() => false)), "qa-e2e no tiene correos sin asignar");
    await boton.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Negocio (opcional)")).toBeVisible();
    await capturar(page, info, "asociar-correo-negocio");
    await page.getByRole("button", { name: "Cancelar" }).click();
    expect(errores).toEqual([]);
  });
});
