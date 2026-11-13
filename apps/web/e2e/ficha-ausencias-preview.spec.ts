import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de persona · Ausencias (ADR-094, adenda CAR-311 d) en `preview-e2e`: la pestaña con su lista (o el estado
// vacío) y la hoja para registrar un permiso o licencia, sin confirmar (solo la vista previa no escribe), a 375,
// 1024 y 1280 px con el usuario de la empresa ficticia `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const ENLACE_PERSONA = 'a[href^="/personas/"]:not([href*="vencimientos"])';

test.describe("@preview ficha · ausencias", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("pestaña Ausencias y hoja para registrar un permiso o licencia", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/personas");
    const primera = page.locator(ENLACE_PERSONA).filter({ visible: true }).first();
    await expect(primera, "qa-e2e tiene al menos una persona ficticia").toBeVisible();
    await primera.click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
    const ficha = new URL(page.url()).pathname.match(/^\/personas\/[0-9a-f-]{36}/)?.[0] ?? "";

    await page.goto(`${ficha}/ausencias`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ausencias" }).first()).toBeVisible();
    await capturar(page, info, "ficha-ausencias");

    const registrar = page.getByRole("link", { name: "Registrar permiso o licencia" }).first();
    if (await registrar.count()) {
      await registrar.click();
      const hoja = page.getByRole("dialog").first();
      await expect(hoja.getByText("Registrar permiso o licencia").first()).toBeVisible();
      // Con Pauta revisa los turnos afectados; sin Pauta, solo el registro (CAR-393).
      const revisar = hoja.getByRole("button", { name: /Ver turnos afectados|Revisar/ });
      await expect(revisar).toBeDisabled();
      await hoja.getByLabel("Motivo").fill("Licencia folio 12345");
      await expect(revisar).toBeEnabled();
      await capturar(page, info, "ficha-ausencias-registrar");
    }
    expect(errores).toEqual([]);
  });
});
