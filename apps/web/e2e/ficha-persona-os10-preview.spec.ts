import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de persona › Laboral › «OS-10»: el vencimiento sale del documento vigente en Documentos o, sin él, del dato
// manual marcado «Sin respaldo» (CAR-429), en `preview-e2e` a 375, 1024 y 1280 px. Empresa ficticia `qa-e2e`; nunca
// Gard. Solo mira, no guarda nada.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview ficha de persona · OS-10 desde Documentos", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la sección OS-10 muestra su fuente sin errores", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/personas");
    const primera = page
      .locator('a[href^="/personas/"]:not([href*="vencimientos"])')
      .filter({ visible: true })
      .first();
    await expect(primera, "qa-e2e tiene al menos una persona ficticia").toBeVisible();
    await primera.click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
    const ficha = new URL(page.url()).pathname.match(/^\/personas\/[0-9a-f-]{36}/)?.[0] ?? "";
    await page.goto(`${ficha}/laboral`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const seccion = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "OS-10", exact: true }) });
    await expect(seccion.first()).toBeVisible();
    await seccion.first().scrollIntoViewIfNeeded();
    // Con datos: «Respaldo» dice de dónde sale la fecha. Sin datos: el estado vacío de la sección.
    await expect(
      seccion
        .first()
        .getByText(/Respaldo|Sin credencial OS-10 registrada/)
        .first(),
    ).toBeVisible();
    await capturar(page, info, "ficha-persona-os10");
    expect(errores).toEqual([]);
  });
});
