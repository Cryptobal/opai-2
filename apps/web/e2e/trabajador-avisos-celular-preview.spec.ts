import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Portal del trabajador · Notificaciones (CAR-356 PR 4b) en `preview-e2e`: la pantalla de avisos carga y guarda
// sin errores; con algún «Aviso en el celular» encendido, el permiso del navegador se pide al guardar (aquí la
// vista previa no tiene claves VAPID, así que no se pide). Si el usuario de `qa-e2e` no tiene ficha de
// trabajador, se anota como omitido. A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview trabajador avisos al celular", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la pantalla de notificaciones carga y guarda", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/trabajador/notificaciones");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const guardar = page.getByRole("button", { name: "Guardar cambios" });
    if (!(await guardar.count())) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin ficha de trabajador" });
      await capturar(page, info, "trabajador-avisos-sin-ficha");
      return;
    }
    await capturar(page, info, "trabajador-avisos");
    await guardar.click();
    await expect(page.getByText("Tus avisos quedaron guardados")).toBeVisible();
    expect(errores).toEqual([]);
  });
});
