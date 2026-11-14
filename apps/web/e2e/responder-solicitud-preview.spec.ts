import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de persona · responder solicitudes del portal (CAR-508) en `preview-e2e`: la pestaña «Permisos y licencias»
// carga con los estados nuevos y, si alguna persona de las primeras de `qa-e2e` tiene una solicitud por responder, se
// abre «Aprobar» sin confirmar (no escribe). Si no hay ninguna, se anota como omitido. A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(240_000);

const ENLACE_PERSONA = 'a[href^="/personas/"]:not([href*="vencimientos"])';
const UUID = /^\/personas\/[0-9a-f-]{36}$/;

test.describe("@preview ficha · responder solicitudes", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la pestaña muestra la solicitud por responder y abre Aprobar", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/personas");
    await expect(page.locator(ENLACE_PERSONA).filter({ visible: true }).first()).toBeVisible();
    const fichas = [
      ...new Set(
        (
          await page
            .locator(ENLACE_PERSONA)
            .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""))
        )
          .map((h) => h.split("?")[0] ?? "")
          .filter((h) => UUID.test(h)),
      ),
    ].slice(0, 6);
    for (const ficha of fichas) {
      await page.goto(`${ficha}/ausencias`);
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      if (!(await page.getByText("Por responder").count())) continue;
      await capturar(page, info, "ficha-solicitud-por-responder");
      const aprobar = page.getByRole("button", { name: "Aprobar" }).first();
      await hidratado(aprobar);
      await aprobar.click();
      const dialogo = page.getByRole("dialog");
      await expect(dialogo.getByText(/^Aprobar /).first()).toBeVisible();
      await capturar(page, info, "ficha-solicitud-aprobar");
      await dialogo.getByRole("button", { name: "Cancelar" }).click();
      expect(errores).toEqual([]);
      return;
    }
    await page.goto(`${fichas[0]}/ausencias`);
    await capturar(page, info, "ficha-ausencias-sin-solicitudes");
    info.annotations.push({ type: "omitido", description: "qa-e2e sin solicitudes por responder" });
    expect(errores).toEqual([]);
  });
});
