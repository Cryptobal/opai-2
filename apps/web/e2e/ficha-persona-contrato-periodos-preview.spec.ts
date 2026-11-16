import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Ficha de persona › Laboral › «Jornada DT y contrato»: períodos del contrato como historia (CAR-409) en
// `preview-e2e`, a 375, 1024 y 1280 px. Entra con la empresa ficticia `qa-e2e`; nunca Gard. Solo mira: abre la
// hoja «Registrar período» sin guardar. Si la persona no tiene contrato vigente, la sección lo dice y no hay hoja.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview ficha de persona · períodos del contrato", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la sección muestra la historia del contrato y la hoja para registrar un período", async ({
    page,
  }, info) => {
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
    await expect(page.getByText("Jornada DT y contrato").first()).toBeVisible();
    // La hoja antigua de jornada ya no edita los términos de plazo fijo.
    const bloque = page.getByTestId("contrato-periodos");
    const sinContrato = page.getByText(/Sin contrato vigente/);
    await expect(bloque.or(sinContrato).first()).toBeVisible();
    await bloque.or(sinContrato).first().scrollIntoViewIfNeeded();
    await capturar(page, info, "ficha-persona-contrato-periodos");
    if (await bloque.count()) {
      await expect(bloque.getByText("Períodos del contrato")).toBeVisible();
      const registrar = bloque.getByRole("link", { name: "Registrar período" });
      if (await registrar.count()) {
        await page.goto(`${ficha}/laboral?registrar-periodo=1`);
        const hoja = page.getByRole("dialog").filter({ hasText: "Registrar período del contrato" });
        await expect(hoja).toBeVisible();
        await expect(hoja.getByText("Tipo de período")).toBeVisible();
        await capturar(page, info, "ficha-persona-contrato-periodos-hoja");
      }
    } else {
      info.annotations.push({
        type: "omitido",
        description: "la persona de qa-e2e no tiene contrato vigente",
      });
    }
    await page.goto(`${ficha}/laboral?editar-jornada-dt=1`);
    const jornada = page.getByRole("dialog").filter({ hasText: "Editar jornada DT" });
    await expect(jornada).toBeVisible();
    await expect(jornada.getByText(/Término del 1/)).toHaveCount(0);
    expect(errores).toEqual([]);
  });
});
