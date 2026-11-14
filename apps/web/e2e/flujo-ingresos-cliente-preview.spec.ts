import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-456: «Cobros esperados» se abre en una fila por cliente y cada cliente en sus instalaciones.
// Solo abre y cierra filas: no escribe en `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview flujo de caja: ingresos por cliente", () => {
  test("filas plegables en el sistema de diseño", async ({ page }, info) => {
    await page.goto("/ds");
    const cliente = page.getByRole("button", { name: "Ver detalle de Cementera Andina" });
    await cliente.scrollIntoViewIfNeeded();
    await expect(cliente).toHaveAttribute("aria-expanded", "false");
    await cliente.click();
    await expect(page.getByRole("button", { name: "Ocultar detalle de Cementera Andina" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("rowheader", { name: "Planta Norte" })).toBeVisible();
    await capturar(page, info, "ds-planilla-filas-plegables");
  });

  test("cobros esperados por cliente en la planilla del flujo", async ({ page }, info) => {
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
    await entrar(page);
    await page.goto("/finanzas/flujo");
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({ timeout: 60_000 });
    const abrir = page.getByRole("button", { name: "Ver detalle de Cobros esperados" });
    test.skip((await abrir.count()) === 0, "La empresa de prueba no tiene cobros esperados con cliente");
    await abrir.click();
    await expect(page.getByRole("button", { name: "Ocultar detalle de Cobros esperados" })).toBeVisible();
    await capturar(page, info, "flujo-ingresos-por-cliente");
  });
});
