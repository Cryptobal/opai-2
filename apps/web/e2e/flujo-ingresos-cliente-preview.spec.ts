import { expect, test } from "@playwright/test";

import { capturar, plegarHasta } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-456 y CAR-537: la planilla se abre y se cierra, y se recuerda al recargar. No escribe en `qa-e2e`.
// La muestra de `/ds` no se prueba aquí: esa ruta responde 404 en la vista previa (solo existe en desarrollo).
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview flujo de caja: ingresos por cliente", () => {
  test("Ingresos y Egresos contraíbles, y recordados, en la planilla del flujo", async ({ page }, info) => {
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
    await entrar(page);
    await page.goto("/finanzas/flujo");
    await expect(page.getByRole("heading", { name: "Flujo de caja" }).first()).toBeVisible({ timeout: 60_000 });
    const ingresos = page.getByRole("button", { name: /detalle de Ingresos$/ });
    const egresos = page.getByRole("button", { name: /detalle de Egresos$/ });
    await expect(ingresos.first()).toBeVisible();
    await expect(egresos.first()).toBeVisible();
    await capturar(page, info, "flujo-secciones-abiertas");
    await plegarHasta(egresos.first(), false);
    await capturar(page, info, "flujo-egresos-contraidos");
    await page.reload();
    await expect(egresos.first()).toBeVisible({ timeout: 60_000 });
    await expect(egresos.first()).toHaveAttribute("aria-expanded", "false");
    await plegarHasta(egresos.first(), true);
    await capturar(page, info, "flujo-secciones-recordadas");
  });
});
