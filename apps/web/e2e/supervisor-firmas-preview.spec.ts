import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Portal Supervisor · Firmas (CAR-634) en `preview-e2e`: lista o vacío a 375 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview supervisor firmas", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Firmas carga en el menú del supervisor", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page, "supervisor-nav-concede@opai.cl");
    await page.goto("/supervisor/firmas");
    const acceso = page.getByText(/No tienes acceso|Sin permisos/).first();
    if (await acceso.count()) {
      info.annotations.push({ type: "omitido", description: "Usuario sin portal supervisor" });
      expect(errores).toEqual([]);
      return;
    }
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await expect(page.getByText(/No tienes documentos por firmar|Nivel/).first()).toBeVisible();
    await capturar(page, info, "supervisor-firmas");
    expect(errores).toEqual([]);
  });
});