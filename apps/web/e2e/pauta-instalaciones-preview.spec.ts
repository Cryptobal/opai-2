import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Pauta · Por instalación (CAR-330) en `preview-e2e`: se llega desde la barra de la Pauta, muestra la lista
// (o su estado vacío si qa-e2e no tiene instalaciones con pauta), cambia el orden y vuelve a la pauta
// mensual de una instalación; a 375, 1024 y 1280 px con el usuario de la empresa ficticia `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview pauta por instalación", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("lista por instalación, orden y paso a la pauta mensual", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/pauta");
    await page.getByRole("link", { name: "Por instalación" }).first().click();
    await page.waitForURL(/\/pauta\/instalaciones/);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ordenar por" })).toBeVisible();
    await capturar(page, info, "pauta-instalaciones");

    const fila = page.locator('a[href^="/pauta?inst="]').filter({ visible: true }).first();
    if (await fila.count()) {
      await page.goto("/pauta/instalaciones?orden=ppc");
      await expect(page.getByRole("button", { name: "Ordenar por" })).toContainText("Más turnos por cubrir");
      await capturar(page, info, "pauta-instalaciones-orden");
      await page.locator('a[href^="/pauta?inst="]').filter({ visible: true }).first().click();
      await page.waitForURL(/\/pauta\?inst=/);
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    } else {
      await expect(page.getByText("Aún no hay instalaciones con pauta")).toBeVisible();
    }
    expect(errores).toEqual([]);
  });
});
