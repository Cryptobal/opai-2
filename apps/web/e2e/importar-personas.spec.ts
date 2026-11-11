import { expect, test } from "@playwright/test";

import { digitoVerificador } from "@opai/domain";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Importar personas (CAR-282): simulación con errores por fila, importación real y reversión del lote.
// Corre en `preview-e2e` con el usuario de `qa-e2e`; las personas son sintéticas y el lote se revierte.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

/** RUT sintético válido y distinto por corrida y por tamaño de pantalla (los tres corren a la vez). */
function rut(semilla: number): string {
  const cuerpo = String(30_000_000 + ((Date.now() + semilla * 7919) % 9_000_000));
  return `${cuerpo}-${digitoVerificador(cuerpo)}`;
}

test.describe("@preview configuración: importar personas", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("simula, importa y revierte una planilla de personas", async ({ page }, info) => {
    const base = info.project.name.length * 10 + info.retry * 100;
    const [uno, dos] = [rut(base), rut(base + 1)];
    const csv =
      "Nombres;Apellidos;RUT;AFP;Salud;Isapre;Banco;Tipo de cuenta;Cuenta bancaria\n" +
      `Ana;Ficticia ${info.project.name};${uno};Habitat;fonasa;;Banco Estado;Cuenta RUT;11111111\n` +
      `Luis;Ficticio ${info.project.name};${dos};;;;;;\n` +
      "Eva;Sin Isapre;12.345.678-5;;isapre;;;;\n" +
      "Iván;Banco Raro;14.569.484-1;;;;Banco Inventado;vista;123456\n";
    await entrar(page);
    await page.goto("/configuracion/importar");
    await expect(page.getByRole("heading", { name: "Importar datos", exact: true }).first()).toBeVisible();
    await page.getByLabel("Qué quieres importar").click();
    await page.getByRole("option", { name: "Personas", exact: true }).click();
    await capturar(page, info, "importar-personas-inicio");

    await page.locator('input[type="file"]').setInputFiles({ name: "personas.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
    await expect(page.getByText("Simulación: todavía no se guardó nada")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Previsión incompleta/)).toBeVisible();
    await expect(page.getByText(/No se reconoce el banco/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Importar 2 registros" })).toBeEnabled();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "importar-personas-simulacion");

    await page.getByRole("button", { name: "Importar 2 registros" }).click();
    await expect(page.getByText(/Importación lista: 2 creados/)).toBeVisible({ timeout: 30_000 });
    const fila = page.getByRole("row").filter({ hasText: "personas.csv" }).filter({ hasText: "Importado" }).first();
    await expect(fila).toContainText("2 creados");
    await capturar(page, info, "importar-personas-cargas");

    await fila.getByRole("button", { name: "Revertir" }).click();
    await expect(page.getByText("Se borrarían 2 registros y se restaurarían 0.")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Revertir lote" }).click();
    await expect(page.getByText("Lote revertido")).toBeVisible({ timeout: 30_000 });
  });
});
