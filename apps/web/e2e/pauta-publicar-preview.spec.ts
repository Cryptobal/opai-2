import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Pauta · Publicar (CAR-356) en `preview-e2e`: desde la pauta mensual de una instalación de `qa-e2e`, el botón
// «Publicar» abre la vista previa con el alcance del aviso; se cancela sin publicar. Si la empresa ficticia
// no tiene instalaciones con pauta, se anota como omitido. A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview pauta publicar", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("vista previa de la publicación y cancelar", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/pauta/instalaciones");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const fila = page.locator('a[href^="/pauta?inst="]').filter({ visible: true }).first();
    if (!(await fila.count())) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin instalaciones con pauta" });
      return;
    }
    await fila.click();
    await page.waitForURL(/\/pauta\?inst=/);
    const publicar = page.getByRole("button", { name: "Publicar", exact: true });
    await expect(publicar).toBeVisible();
    await capturar(page, info, "pauta-publicar-barra");

    await publicar.click();
    const dialogo = page.getByRole("dialog", { name: "Publicar la pauta" });
    await expect(dialogo).toBeVisible();
    await capturar(page, info, "pauta-publicar-dialogo");
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toHaveCount(0);
    expect(errores).toEqual([]);
  });
});
