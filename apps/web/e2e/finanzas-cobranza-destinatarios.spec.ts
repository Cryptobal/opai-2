import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-320 · ADR-103: el diálogo del recordatorio de cobro muestra a quién saldría de verdad (vista previa del servidor:
// todos los contactos de facturación como PARA y la casilla DTE en copia). Abre el diálogo y cancela; no envía nada.
// Usa la factura vencida ficticia de `packages/db/scripts/qa-e2e/factura-aceptada.sql`, solo en `preview-e2e`.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la factura vencida ficticia de la empresa qa-e2e");

const CUENTA = "00000000-0000-7000-8000-000000267001";

test.describe("@preview finanzas: destinatarios del recordatorio de cobro", () => {
  test("el diálogo muestra los destinatarios reales antes de enviar", async ({ page }, info) => {
    await entrar(page);
    await page.goto(`/finanzas/cobranza/${CUENTA}`);
    const fila = page.locator("li", { hasText: "Folio 990002" });
    const boton = fila.getByRole("button", { name: "Enviar recordatorio" });
    await expect(boton).toBeVisible({ timeout: 60_000 });
    await hidratado(boton);
    await boton.click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toContainText("pagos@qa-e2e.test", { timeout: 30_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await expect(dialogo.getByRole("button", { name: "Enviar correo" })).toBeEnabled();
    await page.screenshot({ path: `test-results/capturas/cobranza-destinatarios-${info.project.name}.png` });
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
  });
});
