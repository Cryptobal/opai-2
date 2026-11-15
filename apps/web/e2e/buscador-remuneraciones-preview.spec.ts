import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-406: la búsqueda global (⌘K) trae los períodos de Remuneraciones. Corre en `preview-e2e` con
// el usuario de la empresa ficticia `qa-e2e` (nunca Gard) y no escribe nada. Si qa-e2e no tiene
// períodos, la prueba exige que la paleta busque sin error y deja la captura; el grupo se comprueba
// solo cuando hay resultados.
test.describe("@preview buscador de remuneraciones", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la paleta ⌘K busca «remuneraciones» sin errores y abre el período si hay", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    const campo = page.getByPlaceholder(/^Buscar /);
    await expect(campo).toBeVisible({ timeout: 15_000 });
    await campo.fill("remuneraciones", { timeout: 10_000 });
    const paleta = page.getByRole("dialog");
    await expect(paleta.getByText(/^(Acciones|Ir a|Remuneraciones|Ajustes)$/).first()).toBeVisible({ timeout: 20_000 });
    const periodo = paleta.getByRole("option", { name: /^Remuneraciones \S+ \d{4}/ }).first();
    await capturar(page, info, "buscador-remuneraciones");
    if (await periodo.count()) {
      await periodo.click();
      await expect(page).toHaveURL(/\/remuneraciones\/[0-9a-f-]{36}$/, { timeout: 15_000 });
    } else {
      await page.keyboard.press("Escape");
    }
    expect(errores).toEqual([]);
  });
});
