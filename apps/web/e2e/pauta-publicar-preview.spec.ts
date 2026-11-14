import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Pauta · Publicar (CAR-356) en `preview-e2e`: desde la pauta mensual de una instalación de `qa-e2e`, el botón
// «Publicar» abre la vista previa con el alcance del aviso; se cancela sin publicar. Si la empresa ficticia
// no tiene instalaciones, se anota como omitido. A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview pauta publicar", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("vista previa de la publicación y cancelar", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    // Cualquier instalación sirve: el botón aparece al elegirla en la vista mensual, tenga o no pauta.
    await page.goto("/instalaciones");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const enlace = page
      .locator('a[href^="/instalaciones/"]:not([href^="/instalaciones/nueva"])')
      .filter({ visible: true })
      .first();
    const href = (await enlace.count()) ? await enlace.getAttribute("href") : null;
    const inst = href?.split("/")[2]?.split("?")[0];
    if (!inst) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin instalaciones" });
      return;
    }
    await page.goto(`/pauta?inst=${inst}`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const publicar = page.getByRole("button", { name: "Publicar", exact: true });
    await expect(publicar).toBeVisible();
    await capturar(page, info, "pauta-publicar-barra");

    await publicar.click();
    const dialogo = page.getByRole("dialog", { name: "Publicar la pauta" });
    await expect(dialogo).toBeVisible();
    await capturar(page, info, "pauta-publicar-dialogo");
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toHaveCount(0);
    expect(errores).toEqual([]);
  });
});
