import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Gestor de bloques de la propuesta (CAR-530) en `preview-e2e`, a 375, 1024 y 1280 px, con `qa-e2e`.
// Solo lee: ordena en pantalla sin guardar, para no cambiar la plantilla de la empresa de prueba.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview cpq: bloques de la propuesta en Marca y plantillas", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("lista los bloques y deja subirlos sin guardar", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/cpq?seccion=marca-plantillas");
    const lista = page.getByRole("list", { name: "Bloques de la propuesta" });
    await expect(lista).toBeVisible();
    const segundo = lista.getByRole("listitem").nth(1);
    const nombre = (await segundo.getAttribute("aria-label")) ?? "";
    const primero = lista.getByRole("listitem").first();
    // El HTML llega del servidor antes de hidratar: se reintenta el clic hasta que la lista responda.
    await expect(async () => {
      if ((await primero.getAttribute("aria-label")) !== nombre)
        await lista.getByRole("button", { name: `Subir ${nombre}` }).click();
      await expect(primero).toHaveAttribute("aria-label", nombre, { timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await lista.scrollIntoViewIfNeeded();
    await capturar(page, info, "cpq-bloques-propuesta");
  });

  test("«Copiar prompt» copia el prompt con el estilo de la empresa (CAR-531)", async ({
    page,
    context,
  }, info) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await entrar(page);
    await page.goto("/configuracion/modulo/cpq?seccion=marca-plantillas");
    const boton = page.getByRole("button", { name: "Copiar prompt" });
    await boton.scrollIntoViewIfNeeded();
    await expect(async () => {
      await boton.click();
      await expect(page.getByRole("button", { name: "Copiado" })).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    const copiado = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiado).toContain("## Estilo de la empresa");
    expect(copiado).toContain("un único fragmento HTML");
    await capturar(page, info, "cpq-copiar-prompt");
  });
});
