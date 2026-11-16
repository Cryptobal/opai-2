import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-456 y CAR-537: ingresos por cliente y planilla en secciones contraíbles que se recuerdan al recargar.
// Solo abre y cierra filas: no escribe en `qa-e2e`. En teléfono la planilla de escritorio sigue en
// `/finanzas/flujo`; `?vista=movil` es la vista de tarjetas y la cubre otra prueba.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview flujo de caja: ingresos por cliente", () => {
  test("filas plegables en el sistema de diseño", async ({ page }, info) => {
    await page.goto("/ds");
    const cliente = page.getByRole("button", { name: "Ver detalle de Cementera Andina" });
    await expect(cliente).toBeVisible({ timeout: 30_000 });
    await cliente.scrollIntoViewIfNeeded();
    await expect(cliente).toHaveAttribute("aria-expanded", "false");
    await cliente.click();
    await expect(page.getByRole("button", { name: "Ocultar detalle de Cementera Andina" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(page.getByRole("rowheader", { name: "Planta Norte" })).toBeVisible();
    await capturar(page, info, "ds-planilla-filas-plegables");
  });

  test("Ingresos y Egresos contraíbles, y recordados, en la planilla del flujo", async ({ page }, info) => {
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
    await entrar(page);
    await page.goto("/finanzas/flujo");
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({ timeout: 60_000 });
    const ingresos = page.getByRole("button", { name: "Ocultar detalle de Ingresos" });
    const egresos = page.getByRole("button", { name: "Ocultar detalle de Egresos" });
    await expect(ingresos.or(page.getByRole("button", { name: "Ver detalle de Ingresos" })).first()).toBeVisible();
    await expect(egresos.or(page.getByRole("button", { name: "Ver detalle de Egresos" })).first()).toBeVisible();
    await capturar(page, info, "flujo-secciones-abiertas");
    await egresos.first().click();
    await expect(page.getByRole("button", { name: "Ver detalle de Egresos" }).first()).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await capturar(page, info, "flujo-egresos-contraidos");
    await page.reload();
    await expect(page.getByRole("button", { name: "Ver detalle de Egresos" }).first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Ver detalle de Egresos" }).first().click();
    await capturar(page, info, "flujo-secciones-recordadas");
  });
});
