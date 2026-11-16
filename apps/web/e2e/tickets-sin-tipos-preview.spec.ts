import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-565: sin tipos visibles para el rol, «Nuevo ticket» queda deshabilitado y explica dónde configurarlos.
const AVISO =
  /tipo disponible para tu rol|Configuración › Módulos › Tickets › Tipos|Configurar tipos de ticket/i;

test.describe("@preview tickets: sin tipos para el rol", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Nuevo ticket deshabilitado con explicación o tipos disponibles en qa-e2e", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" }).first()).toBeVisible({ timeout: 30_000 });
    const nuevo = page.getByRole("button", { name: "Nuevo ticket" });
    await expect(nuevo).toBeVisible();
    if (await nuevo.isEnabled()) {
      info.annotations.push({
        type: "omitido",
        description: "qa-e2e tiene tipos de ticket; la bandeja permite crear",
      });
      await capturar(page, info, "tickets-con-tipos");
      expect(errores).toEqual([]);
      return;
    }
    await expect(nuevo).toBeDisabled();
    await nuevo.hover();
    await expect(page.getByRole("tooltip").filter({ hasText: AVISO })).toBeVisible({
      timeout: 10_000,
    });
    if (await page.getByText("Aún no puedes crear tickets").isVisible()) {
      await expect(page.getByRole("link", { name: "Configurar tipos de ticket" })).toBeVisible();
    }
    await capturar(page, info, "tickets-sin-tipos");
    expect(errores).toEqual([]);
  });
});