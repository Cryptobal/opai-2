import { expect, test } from "@playwright/test";

import { abrirAccesos } from "./accesos-instalacion";
import { hidratado } from "./hidratacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-480: desde Listas de la instalación se llega a Importar datos con el importador de listas elegido, y la
// simulación explica los errores por fila. Solo simula (filas que fallan antes de calcular la huella): no escribe.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview acceso: importar listas desde Excel", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("enlace desde Listas y simulación con errores por fila", async ({ page }, info) => {
    await entrar(page);
    await abrirAccesos(page, "listas");
    const enlace = page
      .getByRole("link", { name: "Importar desde Excel" })
      .filter({ visible: true })
      .first();
    await expect(enlace).toBeVisible({ timeout: 60_000 });
    await enlace.click();
    await expect(page).toHaveURL(/importador=acceso_listas/, { timeout: 60_000 });
    const que = page.getByLabel("Qué quieres importar");
    await hidratado(que);
    await expect(que).toContainText("Listas de acceso");
    const csv =
      "Instalación;Lista;RUT;Nombre\nSede que no existe;autorizada;11.111.111-1;Visita QA\nOtra sede inexistente;autorizada;11.111.111-2;Dígito malo\n";
    await page.locator('input[type="file"]').setInputFiles({
      name: "listas.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });
    await expect(page.getByText("Simulación: todavía no se guardó nada")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/No existe la instalación/).first()).toBeVisible();
    await capturar(page, info, "importar-listas-acceso-simulacion");
  });
});
