import { expect, test } from "@playwright/test";

import { capturar, capturarHoja, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-478: prerregistro de visitas (`/accesos/prerregistros`), su ficha y la invitación con QR.
// En la vista previa solo se abre la hoja: prerregistrar exige ACCESO_HUELLA_SECRET (CAR-483), que allí no existe.
test.describe("@preview acceso: prerregistro de visitas", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("lista, hoja, ficha e invitación", async ({ page }, info) => {
    await entrar(page);
    await page
      .context()
      .addCookies([{ name: "opai_marco", value: "nuevo", url: new URL(page.url()).origin }]);
    await page.goto("/accesos/prerregistros");
    const abrir = page
      .getByRole("button", { name: "Prerregistrar" })
      .filter({ visible: true })
      .first();
    await expect(abrir).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "accesos-prerregistros");

    await expect(async () => {
      await abrir.click();
      await expect(page.getByRole("dialog").getByText("Prerregistrar visita")).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 60_000 });
    const hoja = page.getByRole("dialog");
    const nombre = `Visita QR ${Date.now() % 100_000}`;
    await hoja.getByLabel("Nombre").fill(nombre);
    await hoja.getByLabel("RUN o pasaporte").fill("12.345.678-5");
    await hoja.getByLabel("Anfitrión").fill("Marcela Rojas");
    await expect(hoja.getByText("Se registrarán 1 visitante · 1 día")).toBeVisible();
    await capturarHoja(page, info, "accesos-prerregistrar-hoja");
    if (EN_PREVIEW) return;

    await hoja.getByRole("button", { name: "Prerregistrar", exact: true }).click();
    await expect(hoja.getByText("Visita prerregistrada")).toBeVisible({ timeout: 30_000 });
    await capturarHoja(page, info, "accesos-prerregistrar-listo");
    await hoja.getByRole("link", { name: "Ver invitación" }).first().click();
    await expect(
      page.getByText("Invitación de acceso").filter({ visible: true }).first(),
    ).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("img", { name: `Código QR de acceso de ${nombre}` })).toBeVisible();
    await capturar(page, info, "accesos-invitacion-qr");

    await page
      .getByRole("link", { name: "Prerregistro" })
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      page.getByText("Cancelar prerregistro").filter({ visible: true }).first(),
    ).toBeVisible({
      timeout: 60_000,
    });
    await capturar(page, info, "accesos-prerregistro-ficha");
  });
});
