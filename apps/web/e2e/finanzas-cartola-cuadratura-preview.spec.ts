import { expect, test, type Page } from "@playwright/test";

import { filasCartolaHistorica, xlsxOfficeBanking } from "../../../packages/domain/src/finanzas/bancos/cartola-office-banking.fixture";
import { hidratado } from "./hidratacion";
import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-341: la vista previa de «Subir cartola» dice si la cartola cuadra (saldo inicial + detalle = saldo final)
// y no deja importar si no cuadra. Genera cartolas ficticias en el momento; solo vista previa, no importa nada.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la cuenta ficticia de la empresa qa-e2e");

const MOVS = [
  [15000, "Transf a proveedor ficticio", "30/10/2026", "123", "Santiago", "C"],
  [250000, "Abono cliente ficticio", "31/10/2026", "456", "Providencia", "A"],
];

async function previsualizar(page: Page, saldoFinal: number) {
  const filas = filasCartolaHistorica(MOVS);
  const saldos = filas[9];
  if (saldos) saldos[6] = saldoFinal;
  const buffer = await xlsxOfficeBanking(filas);
  await entrar(page);
  await page.goto("/finanzas/bancos");
  const subir = page.getByRole("button", { name: "Subir cartola" });
  await expect(subir).toBeVisible({ timeout: 60_000 });
  await hidratado(subir);
  await subir.click();
  const hoja = page.getByRole("dialog");
  await hoja.locator("#cartola-archivo").setInputFiles({
    name: "cartola-ficticia.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await hoja.getByRole("button", { name: "Vista previa" }).click();
  return hoja;
}

test.describe("@preview finanzas: cuadratura de la cartola", () => {
  test("una cartola que cuadra se puede importar", async ({ page }, info) => {
    const hoja = await previsualizar(page, 1235000);
    await expect(hoja.getByText("La cartola cuadra")).toBeVisible({ timeout: 30_000 });
    // La empresa qa-e2e ya tiene una cartola de octubre (qa-e2e/bancos-importaciones.sql): se avisa (CAR-341).
    await expect(hoja.getByText("Esta cartola ya se importó")).toBeVisible();
    await capturar(page, info, "cartola-cuadra");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
  });

  test("una cartola que no cuadra avisa y bloquea Importar", async ({ page }, info) => {
    const hoja = await previsualizar(page, 1234000);
    await expect(hoja.getByText("La cartola no cuadra: no se puede importar")).toBeVisible({ timeout: 30_000 });
    await expect(hoja.getByRole("button", { name: "Importar" })).toBeDisabled();
    await capturar(page, info, "cartola-no-cuadra");
  });
});
