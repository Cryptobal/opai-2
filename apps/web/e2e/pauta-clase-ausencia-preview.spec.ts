import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Pauta · clase de la excepción (CAR-393) en `preview-e2e`. En la pauta mensual de una instalación de `qa-e2e`, la
// hoja de un día de turno sin excepción muestra el campo «Clase» con las clases del tipo elegido. La prueba cierra
// sin registrar. Si la empresa ficticia no tiene instalaciones o días de turno, se anota como omitido.
// A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview pauta clase de ausencia", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la hoja de excepción ofrece la clase del tipo elegido", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/instalaciones");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const enlace = page
      .locator('a[href^="/instalaciones/"]:not([href^="/instalaciones/nueva"])')
      .filter({ visible: true })
      .first();
    await expect(enlace.or(page.getByText("Aún no hay instalaciones"))).toBeVisible();
    const href = (await enlace.count()) ? await enlace.getAttribute("href") : null;
    const inst = href?.split("/")[2]?.split("?")[0];
    if (!inst) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin instalaciones" });
      return;
    }
    await page.goto(`/pauta?inst=${inst}`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    // Un día de turno sin excepción: cubierto (sin cubrir puede venir de una excepción ya registrada).
    const dia = page
      .getByRole("link", { name: /: Cubierto$/ })
      .filter({ visible: true })
      .first();
    await expect(dia.or(page.getByRole("button", { name: "Publicar", exact: true }))).toBeVisible();
    if ((await dia.count()) === 0) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin días de turno en el mes" });
      return;
    }
    await dia.click();
    const hoja = page.getByRole("dialog");
    await expect(hoja).toBeVisible();
    // Sin permiso para editar la pauta, la hoja es de solo lectura y no hay qué registrar.
    if ((await hoja.getByText("Solo lectura").count()) > 0) {
      info.annotations.push({ type: "omitido", description: "usuario de qa-e2e sin permiso de pauta" });
      return;
    }
    // El tipo por defecto es «Ausencia», con la clase base «Injustificada».
    await expect(hoja.getByText("Clase", { exact: true })).toBeVisible();
    await capturar(page, info, "pauta-clase-ausencia-hoja");
    await hoja.getByRole("button", { name: "Cerrar" }).first().click();
    await expect(hoja).toHaveCount(0);
    expect(errores).toEqual([]);
  });
});
