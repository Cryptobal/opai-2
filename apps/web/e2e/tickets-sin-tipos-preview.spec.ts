import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-565: sin tipos visibles para el rol, «Nuevo ticket» queda deshabilitado y explica dónde configurarlos.
test.describe("@preview tickets: sin tipos para el rol", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Nuevo ticket deshabilitado con explicación o tipos disponibles en qa-e2e", async ({ page }, info) => {
    test.setTimeout(60_000);
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/tickets");
    await expect(
      info.project.name === "telefono"
        ? page.getByRole("heading", { name: "Tickets", level: 2 })
        : page.locator('[data-shell="titulo"] h1'),
    ).toBeVisible();
    const nuevo = page.getByRole("button", { name: "Nuevo ticket" });
    await expect(nuevo).toBeVisible();
    const deshabilitado = await nuevo.isDisabled();
    if (!deshabilitado) {
      info.annotations.push({
        type: "omitido",
        description: "qa-e2e tiene tipos de ticket; la bandeja permite crear",
      });
      await capturar(page, info, "tickets-con-tipos");
      expect(errores).toEqual([]);
      return;
    }
    await expect(nuevo).toBeDisabled();
    if (info.project.name === "desktop") {
      await nuevo.hover();
      await expect(page.getByRole("tooltip")).toContainText("Configuración");
    }
    await expect(page.getByText("Aún no puedes crear tickets", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Configurar tipos de ticket" })).toBeVisible();
    await capturar(page, info, "tickets-sin-tipos");
    expect(errores).toEqual([]);
  });
});