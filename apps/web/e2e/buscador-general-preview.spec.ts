import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-301: el buscador general (⌘K) responde con los grupos que aportan los módulos. Corre en
// `preview-e2e` con el usuario de la empresa ficticia `qa-e2e` (nunca Gard) y no escribe nada.
// Los grupos que aparecen dependen de los datos de qa-e2e: la prueba exige que la paleta busque sin
// error y deja la captura; los títulos de grupo se comprueban solo si hay resultados.
test.describe("@preview buscador general", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la paleta ⌘K busca sin errores y muestra los grupos de Comercial cuando hay resultados", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.keyboard.press("Control+k");
    const paleta = page.getByRole("dialog");
    await expect(paleta).toBeVisible();
    await paleta.getByRole("combobox").or(paleta.getByRole("searchbox")).or(paleta.locator("input")).first().fill("co");
    // Espera a que termine de buscar: aparece algún grupo o el aviso de sin resultados.
    await expect(paleta.getByText(/Acciones|Ir a|Cuentas|Negocios|Cotizaciones|Solicitudes|Sin resultados/).first()).toBeVisible({ timeout: 30_000 });
    for (const grupo of ["Negocios", "Cotizaciones", "Solicitudes"]) {
      if (await paleta.getByText(grupo, { exact: true }).count()) await expect(paleta.getByText(grupo, { exact: true })).toBeVisible();
    }
    await capturar(page, info, "buscador-general");
    await page.keyboard.press("Escape");
    expect(errores).toEqual([]);
  });
});
